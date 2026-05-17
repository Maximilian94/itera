# Scraping e Catalogacao de Provas — PCI Concursos

**Status:** Planejamento (nao implementado)
**Data:** 2026-05-17

## Problema

Precisamos catalogar provas de enfermagem do PCI Concursos (~266 mil provas no acervo) e prioriza-las para processamento no pipeline existente (Edital -> Prova -> Gabarito -> Revisao -> Explicacoes). Hoje, cada ExamBase e adicionado manualmente. O scraper automatiza a descoberta e priorizacao.

### Desafio de paginacao do PCI

A pagina `/provas/{cargo-slug}` mostra max 99 paginas (cap artificial). Solucao: scraping por multiplas variacoes de cargo + deduplicacao por URL de download.

Variacoes conhecidas: `enfermeiro`, `enfermeiro-padrao`, `enfermeiro-esf`, `enfermeiro-do-trabalho`, `enfermeiro-caps`, `enfermeiro-obstetra`, `enfermeiro-saude-mental`, `enfermeiro-uti`, `enfermeiro-socorrista`, `enfermeiro-auditor`, `enfermeiro-20h`, `enfermeiro-30h`, `enfermeiro-40h`, `tecnico-de-enfermagem`, `auxiliar-de-enfermagem`.

---

## Analise do que ja existe

### Entidades relevantes no banco

| Entidade | O que representa | Campos-chave |
|---|---|---|
| **ExamBase** | Uma prova especifica (ex: "Enfermeiro — Prefeitura de Terra Roxa/PR 2025") | `name`, `institution`, `role`, `governmentScope`, `state`, `city`, `examDate`, `examBoardId`, `slug`, `published`, `processingPhase` |
| **ExamBoard** | Banca organizadora (ex: "CESPE/Cebraspe") | `name`, `alias`, `websiteUrl`, `logoUrl` |
| **ExamBaseQuestion** | Questao dentro de uma prova | `statement`, `alternatives`, `correctAlternative`, etc. |
| **GovernmentScope** (enum) | `MUNICIPAL`, `STATE`, `FEDERAL` | — |
| **ProcessingPhase** (enum) | `EDITAL -> PROVA -> GABARITO -> REVISAO -> EXPLICACOES -> CONCLUIDO` | — |

### O que encaixa e o que falta

- **ExamBase ja e a "prova"** — tem cargo, orgao, banca, data, esfera, UF. E a entidade onde uma prova scraped do PCI deve acabar.
- **ExamBoard ja e a "banca"** — CRUD completo, com alias para variacoes de nome.
- **Nao existe "Concurso Publico"** como agrupador. Cada ExamBase e independente.
- **Nao existe catalogo de provas externas** — nenhuma tabela para armazenar dados scraped antes de serem promovidos a ExamBase.

---

## Proposta de mudancas no banco

### Nova entidade: Concurso

Agrupa multiplas provas (ExamBases) sob o mesmo evento publico.

```prisma
model Concurso {
  id              String          @id @default(uuid()) @db.Uuid
  institution     String          // "Prefeitura de Terra Roxa/PR"
  year            Int             // 2025
  governmentScope GovernmentScope
  state           String?
  city            String?
  createdAt       DateTime        @default(now())

  examBoardId     String?         @db.Uuid
  examBoard       ExamBoard?      @relation(fields: [examBoardId], references: [id])

  examBases       ExamBase[]
  pciEntries      PciExamEntry[]

  @@unique([institution, year, examBoardId])
  @@map("concursos")
}
```

Impacto em ExamBase: adicionar FK opcional `concursoId`.
Impacto em ExamBoard: adicionar relacao reversa `concursos Concurso[]`.

### Nova entidade: PciExamEntry

Catalogo bruto do que foi scraped do PCI. Tabela operacional interna — nunca exposta ao usuario final.

```prisma
enum PciEntryStatus {
  PENDING      // scraped, aguardando processamento
  PROMOTED     // ja criou ExamBase a partir deste entry
  SKIPPED      // ignorado manualmente ou por filtro
  UNAVAILABLE  // PDF nao disponivel / link quebrado
}

model PciExamEntry {
  id              String          @id @default(uuid()) @db.Uuid
  downloadUrl     String          @unique  // deduplicacao principal
  examName        String          // nome da prova como aparece no PCI
  year            Int
  institution     String          // orgao como aparece no PCI
  examBoardRaw    String          // banca como aparece no PCI (texto cru)
  cargoSlug       String          // slug do cargo que originou o scraping
  cargoRaw        String?         // cargo como aparece no nome da prova

  // Dados inferidos/normalizados
  governmentScope GovernmentScope?
  state           String?
  city            String?

  // Scoring
  priorityScore   Float           @default(0)

  // Status e linkagem
  status          PciEntryStatus  @default(PENDING)
  promotedToId    String?         @db.Uuid  // FK -> ExamBase quando promovido
  concursoId      String?         @db.Uuid
  concurso        Concurso?       @relation(fields: [concursoId], references: [id])
  examBoardId     String?         @db.Uuid  // FK -> ExamBoard apos matching

  // Metadados do scraping
  scrapedAt       DateTime        @default(now())
  pageUrl         String          // URL da pagina do PCI onde foi encontrado
  rawHtml         String?         // HTML da linha da tabela (debugging)

  @@index([status, priorityScore(sort: Desc)])
  @@index([year])
  @@index([examBoardRaw])
  @@index([cargoSlug])
  @@map("pci_exam_entries")
}
```

**Por que tabela separada em vez de ExamBase direto?**
- ExamBase e para provas em processamento/publicadas; catalogo bruto e staging.
- Criar milhares de ExamBases vazias poluiria o admin e quebraria queries.
- Deduplicacao fica simples: `downloadUrl` unique.

### Nova entidade: ScraperRun

Para resumibilidade e auditoria.

```prisma
model ScraperRun {
  id             String   @id @default(uuid()) @db.Uuid
  startedAt      DateTime @default(now())
  finishedAt     DateTime?
  cargoSlugs     String[] // slugs processados nesta run
  totalPages     Int      @default(0)
  totalEntries   Int      @default(0)
  newEntries     Int      @default(0)
  lastCargoSlug  String?  // para resumir de onde parou
  lastPage       Int?
  errorLog       String?

  @@map("scraper_runs")
}
```

---

## Arquitetura do scraper

### Execucao: manual via admin frontend

O scraping NAO roda em cron/schedule. O admin dispara manualmente a partir de uma pagina no frontend (`/admin/pci-scraper`). Isso da controle total sobre quando rodar e permite ver os resultados imediatamente.

### Onde fica no projeto

```
api/
  src/
    scraper/                    <- novo modulo NestJS
      scraper.module.ts
      scraper.service.ts        <- orquestra o scraping
      scraper.controller.ts     <- endpoints admin-only (trigger, status, list)
      pci-parser.service.ts     <- parse do HTML das paginas PCI
      scoring.service.ts        <- calculo de prioridade
      normalizer.service.ts     <- inferencia de UF, esfera, matching de banca
    concurso/                   <- CRUD module para Concurso
      concurso.module.ts
      concurso.service.ts

web-react/
  src/
    routes/_authenticated/admin/
      pci-scraper.tsx           <- pagina admin do scraper
    features/scraper/
      scraper.service.ts        <- API client
      scraper.queries.ts        <- React Query hooks
      scraper.types.ts          <- tipos
      components/
        PciEntryTable.tsx        <- tabela com virtual scrolling
        ScraperRunPanel.tsx      <- painel de controle do scraping
        ScraperDiffView.tsx      <- diff de novos entries apos um run
```

### Dependencias a adicionar

**Backend (`api/package.json`):**
- **cheerio** — parse de HTML (leve, sem headless browser)

**Frontend (`web-react/package.json`):**
- **@tanstack/react-virtual** — virtual scrolling para tabela grande (milhares de rows)

### Fluxo do scraper (backend)

```
1. Admin clica "Iniciar Scraping" no frontend
2. Frontend chama POST /admin/scraper/run
3. Backend cria ScraperRun e processa em background (BullMQ job):
   a. Para cada cargoSlug:
      - Fetch pagina 1 de /provas/{cargoSlug}
      - Detectar total de paginas (max 99 no PCI)
      - Para cada pagina (1..N):
        - Fetch HTML
        - Parse tabela -> array de {examName, downloadUrl, year, institution, examBoardRaw}
        - Para cada entrada:
          - Skip se downloadUrl ja existe no banco
          - Normalizar: inferir state, city, governmentScope
          - Matching de banca -> encontrar ou criar ExamBoard
          - Agrupar em Concurso (upsert por institution+year+examBoard)
          - Calcular priorityScore
          - Insert PciExamEntry
        - Rate limit: sleep 2-3s entre paginas
        - Atualizar progresso no ScraperRun (lastCargoSlug, lastPage)
4. Frontend faz polling de GET /admin/scraper/runs/:id para progresso
5. Ao finalizar, mostra diff: novos entries adicionados nesta run
```

### Resumibilidade

O ScraperRun salva `lastCargoSlug` + `lastPage`. Se o job falhar, o admin pode clicar "Retomar" e o backend continua de onde parou. Como a deduplicacao e por `downloadUrl`, re-processar paginas ja vistas e seguro (idempotente, no-op).

### Endpoints do backend (admin-only)

```
POST   /admin/scraper/run              <- dispara novo scraping (retorna runId)
POST   /admin/scraper/run/:id/resume   <- retoma run que falhou
GET    /admin/scraper/runs             <- lista de runs (historico)
GET    /admin/scraper/runs/:id         <- status/progresso de uma run
GET    /admin/scraper/runs/:id/diff    <- entries adicionados nesta run
GET    /admin/scraper/entries          <- todos os PciExamEntries (single request)
PATCH  /admin/scraper/entries/:id      <- mudar status (SKIPPED, etc.)
POST   /admin/scraper/entries/:id/promote  <- promover para ExamBase
```

---

## Pagina admin: PCI Scraper (`/admin/pci-scraper`)

### Layout

```
+-------------------------------------------------------------+
| PCI Scraper — Catalogo de Provas                            |
+-------------------------------------------------------------+
| [Iniciar Novo Scraping]     Ultimo scraping: 17/05/2026     |
|                             Resultado: +142 novas provas     |
|                             Status: Concluido                |
+-------------------------------------------------------------+
| Filtros: [Ano v] [Banca v] [Esfera v] [Status v] [Buscar..]|
+-------------------------------------------------------------+
| Score | Prova                | Ano  | Orgao       | Banca   |
|-------|----------------------|------|-------------|---------|
|  95   | Enfermeiro EBSERH    | 2025 | EBSERH      | CESPE   |
|  88   | Enfermeiro SES/SP    | 2025 | SES/SP      | VUNESP  |
|  ...  | (virtual scrolling — milhares de linhas)             |
+-------------------------------------------------------------+
```

### Funcionalidades

1. **Tabela com virtual scrolling** (`@tanstack/react-virtual`)
   - Uma unica request `GET /admin/scraper/entries` traz todos os entries
   - Frontend faz sort/filter client-side (dados ja estao em memoria)
   - Virtual scrolling renderiza apenas as rows visiveis (~30 por vez)
   - Colunas: Score, Nome da Prova, Ano, Orgao, Banca, Esfera, UF, Status, Cargo Slug

2. **Painel de scraping**
   - Botao "Iniciar Novo Scraping" dispara o job
   - Enquanto roda: barra de progresso (ex: "enfermeiro-esf pagina 12/45")
   - Desabilita o botao enquanto um scraping esta em andamento
   - Ao concluir: mostra resumo (novos entries, duplicados ignorados, erros)

3. **Diff apos scraping**
   - Apos um run concluir, mostra apenas as novas provas adicionadas
   - Toggle "Mostrar apenas novos" / "Mostrar todos"
   - Novos entries destacados com background verde claro

4. **Ultimo scraping**
   - Exibir data/hora do ultimo run + resultado resumido
   - Se nunca rodou: "Nenhum scraping realizado ainda"

5. **Filtros client-side** (rapido, sem request)
   - Ano (dropdown multi-select)
   - Banca (dropdown multi-select)
   - Esfera (FEDERAL/STATE/MUNICIPAL)
   - Status (PENDING/PROMOTED/SKIPPED/UNAVAILABLE)
   - Busca textual (nome, orgao)

6. **Acoes por entry**
   - "Promover" -> cria ExamBase + abre o wizard de processamento
   - "Ignorar" -> muda status para SKIPPED
   - "Abrir PDF" -> abre downloadUrl em nova aba

7. **Stats no topo**
   - Total de entries no catalogo
   - Distribuicao por status (pending/promoted/skipped)
   - Distribuicao por ano (mini chart opcional)

---

## Logica de scoring detalhada

Score total: 0-100 pontos, calculado por PciExamEntry.

### Recencia (0-40 pontos)

```typescript
function scoreRecency(year: number): number {
  const currentYear = new Date().getFullYear(); // 2026
  const age = currentYear - year;
  if (age <= 0) return 40;  // 2026+
  if (age === 1) return 35; // 2025
  if (age === 2) return 30; // 2024
  if (age === 3) return 25; // 2023
  if (age === 4) return 20; // 2022
  if (age === 5) return 15; // 2021
  if (age === 6) return 10; // 2020
  if (age <= 8) return 5;   // 2018-2019
  if (age <= 10) return 2;  // 2016-2017
  return 1;                 // <2016
}
```

### Banca (0-30 pontos)

```typescript
const TIER_1 = ['cespe', 'cebraspe', 'fgv', 'vunesp', 'fcc'];
const TIER_2 = ['ibfc', 'aocp', 'consulplan', 'fundep', 'idecan', 'instituto aocp', 'fadesp', 'funcab'];
const TIER_3 = ['quadrix', 'iades', 'comperve', 'contemax', 'fafipa', 'fau', 'cops', 'furb', 'ufmt'];

function scoreExamBoard(boardNameNormalized: string): number {
  if (TIER_1.some(b => boardNameNormalized.includes(b))) return 30;
  if (TIER_2.some(b => boardNameNormalized.includes(b))) return 20;
  if (TIER_3.some(b => boardNameNormalized.includes(b))) return 12;
  return 5; // desconhecida
}
```

### Relevancia do orgao (0-20 pontos)

```typescript
function scoreInstitution(institution: string, scope: GovernmentScope): number {
  const inst = institution.toLowerCase();
  const isHealth = /ebserh|ses\b|sesab|sesa|sesau|saude|hospital|hc\b|hu\b|hge\b|fhemig|into\b|inca\b|fiocruz|funasa/.test(inst);

  if (scope === 'FEDERAL') return isHealth ? 20 : 15;
  if (scope === 'STATE')   return isHealth ? 18 : 12;
  // MUNICIPAL
  const isCapital = /capital|metropole/i.test(inst);
  return isCapital ? 10 : 5;
}
```

### Esfera (0-10 pontos)

```typescript
function scoreScope(scope: GovernmentScope): number {
  if (scope === 'FEDERAL') return 10;
  if (scope === 'STATE')   return 7;
  return 4; // MUNICIPAL
}
```

### Score final

```typescript
function calculatePriorityScore(entry: PciExamEntry): number {
  return scoreRecency(entry.year)
       + scoreExamBoard(entry.examBoardRaw)
       + scoreInstitution(entry.institution, entry.governmentScope)
       + scoreScope(entry.governmentScope);
}
// Maximo teorico: 40 + 30 + 20 + 10 = 100
```

**Exemplo**: "EBSERH 2025 — CESPE/Cebraspe — Enfermeiro" = 35 + 30 + 20 + 10 = **95 pontos**.
**Exemplo**: "Prefeitura de Cidade Pequena/GO 2019 — Banca Desconhecida — Enfermeiro" = 7 + 5 + 5 + 4 = **21 pontos**.

---

## Normalizacao (inferencia de UF, esfera, agrupamento)

### Inferir UF do nome do orgao

O PCI geralmente inclui a UF no nome do orgao (ex: "Prefeitura de Terra Roxa/PR"). Regex:

```typescript
const ufMatch = institution.match(/[\/\-\(]\s*([A-Z]{2})\s*[\)\s]*$/);
```

Se nao houver UF explicita, inferir a partir de keywords (ex: "Governo do Estado de Sao Paulo" -> SP).

### Inferir esfera do nome do orgao

```typescript
function inferScope(institution: string): GovernmentScope {
  const inst = institution.toLowerCase();
  if (/prefeitura|camara municipal|municipio/.test(inst)) return 'MUNICIPAL';
  if (/governo do estado|secretaria de estado|sesa\b|ses\b|tribunal de justica|policia militar|defensoria|detran/.test(inst)) return 'STATE';
  if (/ebserh|ministerio|inss|ibge|funasa|fiocruz|marinha|exercito|aeronautica|trf|trt|stf|stj|tcu|cgu|pgr|agu/.test(inst)) return 'FEDERAL';
  return 'MUNICIPAL'; // fallback conservador
}
```

### Matching de banca -> ExamBoard

1. Normalizar o texto (lowercase, remover pontuacao)
2. Buscar ExamBoard existente por `name` ou `alias` (match fuzzy)
3. Se nao encontrar, criar novo ExamBoard com o nome raw

---

## Plano de implementacao em etapas

### Etapa 1 — Schema + Migration (1 dia)
- Adicionar models `Concurso`, `PciExamEntry`, `ScraperRun` no `schema.prisma`
- Adicionar `concursoId` FK em `ExamBase` e relacao reversa em `ExamBoard`
- Adicionar enums `PciEntryStatus`
- Gerar e rodar migration
- **Sem risco**: FK nullable, sem breaking change

### Etapa 2 — Scraper backend (2-3 dias)
- `scraper.module.ts` — modulo NestJS com controller admin-only
- `scraper.controller.ts` — endpoints: trigger run, status, list entries, promote, patch
- `scraper.service.ts` — orquestracao: loop de paginas, rate limiting, dedup, upsert
- `pci-parser.service.ts` — fetch de pagina + parse HTML com cheerio
- `normalizer.service.ts` — inferencia de UF, esfera, matching de banca
- `scoring.service.ts` — calculo de priorityScore
- BullMQ job para processamento em background (o scraping pode levar minutos)
- `concurso/` — modulo basico de Concurso (service)
- Registrar no `AppModule`
- Instalar cheerio no api

### Etapa 3 — Admin frontend (2 dias)
- Instalar `@tanstack/react-virtual` no web-react
- `features/scraper/` — service, queries, types
- `PciEntryTable.tsx` — tabela com virtual scrolling (single request, sort/filter client-side)
- `ScraperRunPanel.tsx` — botao de trigger, progresso, ultimo run
- `ScraperDiffView.tsx` — highlight de novos entries apos um run
- `routes/_authenticated/admin/pci-scraper.tsx` — pagina admin

### Etapa 4 — Teste e refinamento (1 dia)
- Rodar scraping com 2-3 slugs pelo frontend, validar dados
- Verificar: distribuicao de scores, qualidade da normalizacao, duplicatas
- Ajustar regexes e pesos conforme necessario
- Rodar scraping completo (todos os 15+ slugs)

### Etapa 5 — Promocao para ExamBase (1 dia)
- Botao "Promover" na tabela -> cria ExamBase + Concurso
- Apos promover, redireciona para o wizard de processamento existente (`/exams/editar/:id`)
- Testar fluxo completo: scraping -> promover -> processar prova

---

## Decisoes arquiteturais

| Decisao | Justificativa |
|---|---|
| Tabela separada `PciExamEntry` em vez de ExamBase | ExamBase e para provas em processamento/publicadas; catalogo bruto e staging |
| `Concurso` como agrupador | Permite ver todas as provas de um mesmo concurso, evita duplicacao de metadados |
| Scraping manual via admin (nao cron) | Admin tem controle total; ve resultados imediatamente; sem custo de infra de scheduling |
| BullMQ para o job de scraping | Scraping leva minutos; nao pode bloquear o request HTTP |
| Single request + client-side filtering | Dataset cabe em memoria (~5-10k entries); evita complexidade de paginacao server-side |
| `@tanstack/react-virtual` para virtual scrolling | Renderiza apenas rows visiveis; compativel com o stack existente (TanStack) |
| cheerio para parse HTML | Leve, sem headless browser; PCI e server-rendered, sem JS dinamico |
| Score numerico 0-100 | Simples de ordenar, facil de ajustar pesos depois |
| `downloadUrl` unique para dedup | E o identificador mais estavel do PCI |
| Diff incremental (apenas novos) | Ao re-rodar, nao altera entries existentes — mostra apenas o delta |

---

## Arquivos tocados

### Novos (backend)
- `api/prisma/migrations/XXXXXX_add_concurso_pci_scraper/migration.sql`
- `api/src/scraper/scraper.module.ts`
- `api/src/scraper/scraper.controller.ts`
- `api/src/scraper/scraper.service.ts`
- `api/src/scraper/pci-parser.service.ts`
- `api/src/scraper/scoring.service.ts`
- `api/src/scraper/normalizer.service.ts`
- `api/src/concurso/concurso.module.ts`
- `api/src/concurso/concurso.service.ts`

### Novos (frontend)
- `web-react/src/routes/_authenticated/admin/pci-scraper.tsx`
- `web-react/src/features/scraper/scraper.service.ts`
- `web-react/src/features/scraper/scraper.queries.ts`
- `web-react/src/features/scraper/scraper.types.ts`
- `web-react/src/features/scraper/components/PciEntryTable.tsx`
- `web-react/src/features/scraper/components/ScraperRunPanel.tsx`
- `web-react/src/features/scraper/components/ScraperDiffView.tsx`

### Modificados
- `api/prisma/schema.prisma` — novos models + FK em ExamBase + relacao em ExamBoard
- `api/src/app.module.ts` — registrar ScraperModule + ConcursoModule
- `api/package.json` — adicionar cheerio
- `web-react/package.json` — adicionar @tanstack/react-virtual
