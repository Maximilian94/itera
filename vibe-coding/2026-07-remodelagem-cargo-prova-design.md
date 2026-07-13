# R3.1 — Design da remodelagem Cargo↔Prova (M:N)

**Status: rascunho para revisão** — aprovar antes de tocar schema (R3.2).
Origem: `TAREFAS-PRODUCAO.md` Fase 3; decisão de produto de 2026-07-13.

## Problema

Um cargo pode ter N provas ("Prova Amarela"/"Prova Azul") **e a mesma prova
pode ser compartilhada por N cargos** (caso Recife: "Enfermeiro Pediatra" e
"Enfermeiro Geral" com a mesma prova). O modelo atual
(`cargoGroupId`/`isPrimaryProva`/`provaLabel` sobre `ExamBase`) só cobre a
primeira direção — a ficha do cargo mora na prova primária, então uma prova
não pode representar dois cargos com fichas diferentes.

## Modelo alvo

```
Concurso (edital)                   ← ganha editalUrl canônico + janela de inscrição
 └── Cargo (ficha da vaga)          ← NOVO model
       └── CargoProva (join M:N)    ← NOVO model
             └── ExamBase (prova)   ← continua dona de questões/attempts/treino
```

**Princípio:** `ExamBase` continua sendo a **Prova**. Tudo `examBaseId`-keyed
(questões, attempts, treino, player, scoring, import) fica **intacto**. A
migração é da camada de metadados — cada dado sobe para o nível a que
pertence: ficha da vaga → `Cargo`; edital e janela de inscrição → `Concurso`.

**Consequência estrutural (decisão 2026-07-13):** como `Cargo.concursoId` é
obrigatório, a criação de prova no wizard admin passa a **garantir o Concurso
eagerly** (mesmo find-or-create do lazy-link) quando a prova tem
`institution`. Prova sem `institution` → sem Concurso e sem Cargo default até
o campo ser preenchido (ela já é invisível nas páginas de concurso hoje —
comportamento preservado).

## 1. Model `Cargo` — campos que MIGRAM de `ExamBase`

| Campo | Tipo | Nota |
|---|---|---|
| `id` | uuid | |
| `slug` | String `@unique` | copiado do slug da prova primária no backfill → **nenhuma URL `/concursos/:slug/cargos/:cargoSlug` quebra** |
| `concursoId` | uuid **obrigatório** | decisão: cargo sem edital não existe; o lazy-link garante o Concurso antes do backfill (dependência T1.1/T1.2, já em produção nesta branch) |
| `role` | String | `relatedProvas` e `previousExams` passam a resolver role via Cargo |
| `description` | String? | |
| `requirements` | String? | |
| `salaryBase` | Decimal? | |
| `workload` | String? | |
| `vacancyCount` | Int? | |
| `hasReserveList` | Boolean | |
| `applicantCount` | Int? | |
| `registrationFee` | Decimal? | |
| `minPassingGradeNonQuota` | Decimal? | corte do edital |
| `actualCutScore` | Decimal? | corte real (MAX-18) |
| `isNursingRelevant` | Boolean | filtro de relevância passa a ser por cargo |
| `createdAt`/`updatedAt` | DateTime | |

Relação que migra: `ExamSyllabusGroup.examBaseId` → ganha `cargoId`
(conteúdo programático é do cargo, não da prova). `examBaseId` fica até R6.1.

**Índices:** `cargos(concursoId)`, `cargos(role)` (p/ relatedProvas).

## 2. `ExamBase` (Prova) — campos que FICAM

- Identidade da prova: `name`, `examDate` (cada prova tem a sua),
  `examBoardId` (a **banca** que aplica a prova — usada pelo player, pelos
  tiers de `relatedProvas` e pela chave do lazy-link), `slug` (da prova).
- Operação: `published`, `processingPhase` (fase do wizard/pipeline admin:
  EDITAL→…→CONCLUIDO), `adminNotes`.
- Conteúdo: questões, attempts, treino (tudo intacto).
- **Ficam por ora** (chave do lazy-link do Concurso depende deles):
  `institution`, `state`, `city`, `governmentScope`. Remoção é limpeza
  futura, fora deste épico.
- Colunas antigas (`cargoGroupId`, `provaLabel`, `isPrimaryProva`, as de
  ficha e as que sobem ao Concurso — `editalUrl`, `registrationStart/End`,
  `resultDate`) **continuam existindo e recebendo dual-write** até R6.1 →
  rollback trivial.

## 2b. `Concurso` — campos que SOBEM da Prova (decisão 2026-07-13)

O edital e a janela de inscrição são do **concurso**, não da prova — estavam
na `ExamBase` por razão operacional (o Concurso nascia lazy na leitura; no
momento da criação/extração por IA não havia onde escrever). Com o Concurso
garantido eagerly (ver Modelo alvo), sobem de vez:

| Campo | Nota |
|---|---|
| `editalUrl` | já existe no Concurso (self-heal); vira o **dono da escrita** |
| `registrationStart` | NOVO — backfill: mais cedo entre as provas vinculadas |
| `registrationEnd` | NOVO — backfill: mais tarde entre as provas |
| `resultDate` | NOVO — backfill: mais tarde entre as provas |

- **Leitura:** `aggregateConcursoTimeline` passa a preferir as colunas do
  Concurso, com fallback ao agregado das provas (dados antigos ainda não
  backfillados / provas órfãs). `examDate` da timeline continua derivado das
  provas (cada uma tem a sua; a última define o "past"). Payload `timeline`
  idêntico.
- **Escrita:** wizard admin + extração por IA (`exam-base-ai.service`)
  escrevem no Concurso; dual-write nas colunas da prova até R6.1.
- **Edge:** prova sem `institution` → sem Concurso → os valores ficam só na
  prova até o campo ser preenchido; aí o find-or-create roda e promove.

## 3. Join `CargoProva`

| Campo | Tipo | Nota |
|---|---|---|
| `cargoId` | uuid FK | `onDelete: Cascade` (vínculo morre com o cargo) |
| `examBaseId` | uuid FK | `onDelete: Cascade` |
| `provaLabel` | String? | migra da ExamBase — o rótulo "Amarela"/"Tipo 1" é **do vínculo**, não da prova |
| `isOficial` | Boolean | substituto do `isPrimaryProva`: a prova que define meta/corte no `GoalCard` |
| `order` | Int | ordem de exibição das provas do cargo |

**Constraints:**
- `@@unique([cargoId, examBaseId])`;
- unique parcial `CREATE UNIQUE INDEX ... ON cargo_provas ("cargoId") WHERE "isOficial"`
  → **no máximo 1 oficial por cargo garantido pelo banco** (a lição do
  antigo T1.3, agora por construção);
- índice `cargo_provas(examBaseId)` (lookup reverso prova→cargos).

## 4. Regras de serviço

1. **Marcar `isOficial`:** sempre em `$transaction` (rebaixa a atual,
   promove a nova). O unique parcial pega qualquer corrida.
2. **Vínculo cross-concurso proibido:** `POST /cargos/:id/provas/:examBaseId`
   valida `examBase.concursoId === cargo.concursoId` (mesma prova só entre
   cargos do MESMO concurso).
3. **Desvincular a prova oficial:** decisão → **400 exigindo eleição de
   outra** (explícito > mágico; promover automaticamente esconderia do admin
   qual prova define a meta). Cargo com 1 prova só não pode desvincular sem
   deletar o cargo ou vincular outra antes.
4. **Criação de `ExamBase` no wizard admin cria Cargo default 1:1**
   automaticamente (ficha copiada dos campos do form), já vinculado com
   `isOficial: true`. O caso comum continua sem passo extra.
5. **`relatedProvas`:** resolve role via `CargoProva → Cargo.role`; uma prova
   ligada a N cargos conta para o role de cada um. Absorve as otimizações:
   `take` no banco (2 queries tier1/tier2, `orderBy examDate desc`, cap 8) e
   `getStudyPlan` em batch (respostas do usuário carregadas UMA vez para o
   conjunto de provas-alvo).

## 5. Backfill (R3.2 — migration aditiva, sem drops)

- Cada grupo `cargoGroupId` → **1 Cargo** com a ficha da prova primária
  (fallback determinístico `examDate asc, id asc` se não houver primária).
- Cada `ExamBase` standalone → 1 Cargo próprio (1:1).
- `cargo_provas` para cada vínculo: `provaLabel` copiado,
  `isOficial = isPrimaryProva`, `order` pela data/label.
- `Cargo.slug` = slug da prova primária; `Cargo.concursoId` = `concursoId`
  da prova — **pré-passo:** garantir Concurso para provas órfãs (rodar o
  find-or-create do lazy-link ou SQL equivalente na migration).
- `exam_syllabus_groups.cargoId` backfillado via prova primária.
- **Janela/edital do Concurso** (§2b): `registrationStart` = mais cedo,
  `registrationEnd`/`resultDate` = mais tarde entre as provas vinculadas;
  `editalUrl` mantém o self-heal existente (prova mais antiga com valor).
- Validação: nº de Cargos = nº de grupos + standalones; roda sobre
  `seed-multi-prova.ts` e dump de prod sem erro.

## 6. Contrato da API — estabilidade

Os payloads de `GET /concursos`, `GET /concursos/:slug` e
`GET /concursos/:slug/cargos/:cargoSlug` permanecem **estruturalmente
idênticos**:

- `provas[].isPrimary` ← derivado de `isOficial` (nome externo não muda);
- ficha/vagas/salário vêm do `Cargo` (o bug "primária despublicada troca a
  ficha" morre por construção);
- prova compartilhada aparece nas `provas[]` de cada cargo vinculado, com
  `questionCount`/`userStats` iguais (é a mesma prova — prontidão idêntica é
  o comportamento correto);
- `getCargoDetail` segue aceitando UUID de ExamBase (resolve prova →
  cargo vinculado; se N cargos, o primeiro por `order` — caso raro, só via
  link direto antigo);
- `subject-distribution` e `competition-history` mantêm semântica e payload
  (`previousEditionsWhere` resolve role via Cargo).

**Os 74+ testes de página do web-react passam sem alteração de
mock/payload** — eles são o harness de regressão da remodelagem.

## 7. Admin (R4.3)

- Form da prova: seção `cargoGroupId` ("Gerar" + toggle "principal") →
  gestão de vínculos (a quais cargos pertence + "oficial" por cargo).
- Ficha do cargo editada em tela própria (no fluxo do concurso do admin).
- Ação "compartilhar prova com outro cargo": picker de cargos do mesmo
  concurso (caso Recife em 2 cliques).
- Editor de `syllabusGroups` aponta para o Cargo.

## 8. Fora de escopo (registrado)

- Mover `institution/state/city/governmentScope` da Prova (chave do
  lazy-link) — limpeza futura.
- Drop das colunas antigas → R6.1, após 1–2 semanas de observação em prod.
  A lista de drops em `exam_bases` agora inclui também `editalUrl`,
  `registrationStart`, `registrationEnd` e `resultDate` (§2b).
