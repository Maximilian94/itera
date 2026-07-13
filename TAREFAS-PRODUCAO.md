# Tarefas para produção — épico Concursos (`feature/concurso-lazy-link`)

Auditoria da branch vs `main` (2026-07-12), **revisada em 2026-07-13** para
incluir a decisão de produto: **remodelagem Cargo↔Prova (M:N)** — um cargo pode
ter N provas ("Prova Amarela"/"Prova Azul") **e a mesma prova pode ser
compartilhada por N cargos** (ex.: Recife — "Enfermeiro Pediatra" e "Enfermeiro
Geral" com a mesma prova). O modelo atual (`cargoGroupId`/`isPrimaryProva`
sobre `ExamBase`) só cobre a primeira direção.

**Princípio da remodelagem:** `ExamBase` continua sendo a **Prova** (questões,
data, banca, attempts, treino — tudo `examBaseId`-keyed fica **intacto**).
Extrai-se a entidade **`Cargo`** (ficha: role, salário, vagas, requisitos,
corte, conteúdo programático) com join M:N `CargoProva`. A migração é da camada
de metadados, não do player/treino.

Sequência: higiene → integridade de dados que sobrevive à remodelagem →
bloqueadores de frontend (independentes da remodelagem) → **remodelagem** →
UX → limpeza → deploy.

Legenda: 🔴 bloqueador · 🟠 fortemente recomendado antes do launch · 🟡 pós-launch aceitável

> **Tarefas da v1 supersedidas pela remodelagem** (não implementar como estavam):
> - ~~T1.3 invariante "1 prova primária por grupo"~~ → `isPrimaryProva`/`cargoGroupId` deixam de existir; o invariante renasce corretamente na join (R4.1/R4.2).
> - ~~T1.4 `take` no `relatedProvas`~~ e ~~T1.5 fan-out do `getCargoDetail`~~ → absorvidas na reescrita do service (R4.2).
> - ~~T4.3 primária despublicada troca a ficha~~ → a ficha passa a viver no `Cargo`; o problema desaparece por construção.

---

## Fase 0 — Higiene

### T0.1 🔴 Commitar o trabalho pendente do working tree

**Contexto:** 2 arquivos modificados e não commitados; revisão confirmou
trabalho completo e coeso (tsc limpo, 74 testes verdes com o working tree).

**Arquivos:**
- `web-react/src/components/QuestionWithFeedbackDisplay.tsx` — props `compact`
  (esconde abas "em breve") e `toolbar` (slot à direita da linha de abas).
- `web-react/src/features/concurso/components/treino/StudyItemFocus.tsx` —
  navegador de "Questões que errei" movido para a linha de abas (`toolbar`).

**Requisitos:** commit isolado, mensagem no padrão do repo.
**Critério de aceite:** `git status` limpo; `npm test` no `web-react/` verde.

---

## Fase 1 — Integridade de dados (sobrevive à remodelagem)

> Ambas as tarefas atuam no nível **Concurso** (edital), que a remodelagem não
> toca. Corrigem corrupção silenciosa de banco — vêm antes de tudo.

### T1.1 🔴 Lazy-link: eliminar duplicação de `Concurso` quando `examBoardId` é NULL

**Problema:** o `@@unique([institution, year, examBoardId])`
(`api/prisma/schema.prisma:224`) não protege quando `examBoardId` é NULL
(NULLs são distintos no Postgres). Dois requests simultâneos para uma prova
sem banca passam ambos pelo `findFirst`
(`api/src/concurso/concurso.service.ts:127`), ambos os `create` (`:136`) têm
sucesso → **dois Concursos duplicados**; o `catch` de corrida (`:147-152`)
nunca dispara e o `findFirst` sem `orderBy` alterna entre eles — cargos do
mesmo edital repartidos entre duas linhas.

**Requisitos:**
1. Migration com unique NULL-safe: `NULLS NOT DISTINCT` (PG 15+) **ou** índice
   único parcial `(institution, year) WHERE "examBoardId" IS NULL` mantendo o
   unique atual para o caso não-NULL.
2. A migration **deduplica antes** de criar o índice: elege o sobrevivente
   (mais antigo), reponta `exam_bases.concursoId` e deleta duplicatas.
3. `catch` do find-or-create trata **apenas** `P2002` (retry do `findFirst`);
   outros erros propagam com a causa original.
4. `orderBy: { createdAt: 'asc' }` no `findFirst` da tupla.

**Critérios de aceite:** teste unitário P2002 → retorna existente; migration
idempotente sobre banco com duplicatas artificiais; 2 requests concorrentes
sem banca → 1 linha.

### T1.2 🔴 Padronizar ano em UTC na chave de agrupamento do lazy-link

**Problema:** o lazy-link deriva o ano com `getFullYear()` (timezone do
servidor — `concurso.service.ts:245`, `:545`) enquanto listagem e ranges usam
UTC (`:396`, `:256-257`, `:574-575`, `:858-859`). Prova com
`examDate = 2026-01-01T00:00:00Z` em servidor `America/Sao_Paulo` → Concurso
criado com `year: 2025` e slug errado, invisível para o range do detalhe.

**Requisitos:**
1. Trocar todas as derivações de ano do lazy-link para `getUTCFullYear()`.
2. Verificar dados já criados com ano divergente (dev/prod) e corrigir via
   script/migration se houver.

**Critérios de aceite:** teste com `TZ=America/Sao_Paulo` e examDate à
meia-noite UTC de 1º/jan → ano UTC correto e prova encontrada pelo range;
`grep getFullYear api/src/concurso` só retorna usos UTC.

---

## Fase 2 — Bloqueadores de frontend

> Independentes da remodelagem: o fluxo de treino é `examBaseId`-keyed e o
> contrato da API será preservado (ver R4.2). Nada aqui vira retrabalho.

### T2.1 🔴 Impedir criação de sessão de treino duplicada (consome cota do usuário)

**Problema:** `CargoContent` monta `latestTrainingByExamBase` de
`trainingsQuery.data ?? []` sem tratar `isPending`/`isError`
(`web-react/src/routes/_authenticated/concursos/$concursoSlug/$cargoSlug.tsx:241-257`).
Com a lista vazia (carregando/erro silencioso), prova **em andamento** aparece
como "Treinar"; o clique cria **outra** sessão e **cobra a cota** (a API não
reutiliza sessão ativa — `api/src/training/training.service.ts:361-411`).

**Requisitos:**
1. `isPending` → CTAs de treino desabilitados (ou skeleton na mesa); nunca
   renderizar "Treinar" sem saber se há sessão.
2. `isError` → estado de erro com retry na aba Treino; sem `start` às cegas.
3. **Defesa no backend (recomendado):** `training.service#create` idempotente —
   sessão em andamento para o mesmo `examBaseId`+usuário → retorna a existente
   sem cobrar. Elimina a classe inteira do bug (abas duplicadas, refresh).

**Critérios de aceite:** teste de página (pendente → CTA desabilitado; erro →
retry); teste de API (2º create com sessão ativa → mesma sessão, cota intacta).

### T2.2 🔴 Invalidar `studyItems` ao terminar a prova embutida

**Problema:** o backend cria os itens de estudo ao avançar para STUDY
(`training.service.ts:668-676`) ou no GET lazy (`:822-830`), mas nem
`handleExamFinished` (`EmbeddedPlayer.tsx:51-55`) nem
`useUpdateTrainingStageMutation` (`training.queries.ts:116-128`) invalidam
`trainingKeys.studyItems`. No fluxo embutido o `TrainingFlow` não remonta →
o usuário termina a prova e vê "Nenhuma recomendação de estudo ainda"
(`embeds.tsx:133-138`).

**Requisitos:**
1. Invalidar `trainingKeys.studyItems(trainingId)` no
   `useUpdateTrainingStageMutation` e no `handleExamFinished`.
2. Conferir o resto do ciclo (fim da re-tentativa → FINAL) para o mesmo padrão.

**Critério de aceite:** teste de página do fluxo embutido — terminar prova →
Estudo mostra lista populada sem remount/refocus.

### T2.3 🟠 Invalidar `concursoKeys` após ações de treino (prontidão stale)

**Problema:** detalhe do cargo tem `staleTime` 5 min
(`concurso.queries.ts:6,44-50`) e nenhum ponto do fluxo embutido invalida
`concursoKeys` (compare com `useStartSimulado.ts:38-40`). `GoalCard`/
`TrainingHeader`/`ReadinessBar` mostram score antigo por até 5 min.

**Requisitos:** invalidar `concursoKeys` no avanço de estágio e fim de
prova/retry embutidas; `useProgramActions.start` idem (paridade com
`useStartSimuladoMutation`).

**Critério de aceite:** terminar a prova diagnóstica atualiza a prontidão sem
reload.

### T2.4 🟠 Esconder o bottom nav mobile durante a prova embutida

**Problema (follow-up conhecido):** `hideBottomNav` só cobre `/exams/...` e
`/treino/...` (`_authenticated.tsx:28-32`); o player embutido vive em
`/concursos/...` → nav visível roubando altura no mobile.

**Requisitos:**
1. Layout detecta player embutido ativo (sugestão: reutilizar o
   `[data-exam-player]` já usado pela cadeia de altura, via CSS `has`/contexto).
2. Nav **volta** fora da fase de prova (Diagnóstico/Estudo/Final).
3. Validação manual mobile nas 5 fases (sem teste automatizado do embed — ok,
   documentado no log da sessão).

---

## Fase 3 — Design da remodelagem Cargo↔Prova (M:N)

### R3.1 🔴 Documento de design + decisões de campo

**Objetivo:** fechar o desenho antes de tocar schema. Produzir um doc curto
(`vibe-coding/` ou Linear) com o mapa de campos e as regras.

**Modelo alvo:**

```
Concurso (edital)
 └── Cargo (ficha da vaga)          ← NOVO model
       └── CargoProva (join M:N)    ← NOVO model
             └── ExamBase (prova)   ← continua dona de questões/attempts/treino
```

**Requisitos:**
1. **Campos que migram de `ExamBase` para `Cargo`:** `role`, `salaryBase`,
   `vacancyCount`, `applicantCount`, `registrationFee`, `hasReserveList`,
   `requirements`, `description`, `workload`, `minPassingGradeNonQuota`,
   `actualCutScore`, `isNursingRelevant`, e a relação `syllabusGroups`
   (`ExamSyllabusGroup.examBaseId` → `cargoId`). `Cargo` ganha `slug` (unique)
   e `concursoId` (FK obrigatória? decidir — recomendação: obrigatória, cargo
   sem edital não existe; o lazy-link garante o Concurso antes).
2. **Campos que ficam na `ExamBase` (Prova):** `name`, `examDate`,
   `examBoardId`, `published`, `processingPhase`, `adminNotes`,
   questões/attempts/treino. `institution/state/city/governmentScope` ficam
   **por ora** (a chave do lazy-link do Concurso depende deles — remoção é
   limpeza futura, fora deste épico).
3. **Join `CargoProva`:** `cargoId` + `examBaseId` (`@@unique` no par),
   `provaLabel` (migra da ExamBase — o rótulo "Amarela" é do vínculo, não da
   prova), `isOficial` (substituto do `isPrimaryProva`: a prova que define a
   meta/corte no `GoalCard`; **invariante: no máximo 1 por cargo, garantido em
   transação** — a lição do antigo T1.3), `order` para exibição.
4. **Janela de inscrição + editalUrl** (`registrationStart/End`, `resultDate`):
   ~~decidir se fica na Prova ou migra~~ → **DECIDIDO (2026-07-13): sobem para
   o `Concurso`** (o edital e a janela são do concurso, não da prova). Como
   `Cargo.concursoId` é obrigatório, o wizard passa a garantir o Concurso
   eagerly na criação da prova; admin/IA escrevem no Concurso, dual-write nas
   colunas da prova até R6.1. Detalhes no design doc §2b.
5. **Regras de vínculo:** prova compartilhada só entre cargos do **mesmo
   concurso** (validação de serviço); `relatedProvas` (recomendação de treino)
   passa a resolver o `role` via `CargoProva → Cargo.role` — uma prova ligada
   a N cargos conta para o role de cada um.
6. **Preservação de URLs:** o slug do Cargo é **copiado do slug da ExamBase
   primária atual** no backfill — nenhum link `/concursos/:slug/cargos/:cargoSlug`
   existente quebra.
7. **Estratégia de contrato:** os payloads de `GET /concursos`,
   `GET /concursos/:slug` e `GET /concursos/:slug/cargos/:cargoSlug`
   permanecem **estruturalmente idênticos** (incluindo `provas[].isPrimary`,
   derivado de `isOficial`). O frontend e seus 74 testes viram o harness de
   regressão da remodelagem.

**Critério de aceite:** doc revisado e aprovado antes do R3.2.

### R3.2 🔴 Schema + migration de backfill (aditiva, sem drops)

**Requisitos:**
1. Migration cria `cargos` e `cargo_provas` e **backfilla** a partir do estado
   atual:
   - cada grupo `cargoGroupId` → **1 Cargo** com os campos da prova primária
     (fallback determinístico `examDate asc, id asc` se não houver primária);
   - cada `ExamBase` standalone (`cargoGroupId` NULL) → 1 Cargo próprio;
   - linhas `cargo_provas` para cada vínculo, com `provaLabel` copiado e
     `isOficial = isPrimaryProva`;
   - `exam_syllabus_groups` ganha `cargoId` (backfill via prova primária) —
     manter `examBaseId` até o R6.1;
   - `Cargo.slug` = slug da prova primária; `Cargo.concursoId` = `concursoId`
     da prova (rodar o lazy-link/garantir Concurso antes do backfill para
     provas órfãs — ver dependência de T1.1/T1.2).
2. **Nenhuma coluna é dropada nesta migration** — as colunas antigas de
   `ExamBase` continuam existindo (e sendo escritas em dual-write pelo service
   durante a transição) até a limpeza (R6.1). Isso mantém rollback trivial.
3. Índices: `cargo_provas(examBaseId)`, `cargos(concursoId)`,
   `cargos(role)` (para `relatedProvas`).
4. Unique parcial garantindo ≤1 `isOficial` por cargo:
   `CREATE UNIQUE INDEX ... ON cargo_provas (cargoId) WHERE "isOficial"`.

**Critérios de aceite:** migration roda sobre o seed multi-prova
(`seed-multi-prova.ts`) e sobre um dump de prod sem erro; contagens batem
(nº de Cargos = nº de grupos + standalones); `prisma validate` limpo.

---

## Fase 4 — Remodelagem: backend

### R4.1 🔴 Serviço de Cargo (admin) + invariantes

**Requisitos:**
1. CRUD ADMIN de Cargo (`POST/PATCH/DELETE /cargos` ou aninhado em
   `/concursos/:id/cargos`) com DTOs class-validator.
2. Vincular/desvincular prova: `POST/DELETE /cargos/:id/provas/:examBaseId`
   com validações: mesmo `concursoId`; ao desvincular a prova `isOficial`,
   exigir eleição de outra (400) ou promover automaticamente — decidir no R3.1.
3. Marcar `isOficial`: **em `$transaction`** (rebaixa a atual, promove a nova)
   — cobre create e update, a correção que o modelo antigo não tinha.
4. Criação de `ExamBase` nova (wizard admin) cria **Cargo default 1:1**
   automaticamente (o caso comum "1 prova = 1 cargo" continua sem passo
   extra), já vinculado.
5. `exam-base.service`: remover a lógica de `cargoGroupId`/`isPrimaryProva`
   do update (`exam-base.service.ts:659-672`) — o campo passa a ser gerenciado
   pelo serviço de Cargo; manter **dual-write** das colunas antigas até R6.1.

**Critérios de aceite:** testes unitários dos invariantes (1 oficial por
cargo, transacional; vínculo cross-concurso rejeitado; cargo default no
create); e2e admin.

### R4.2 🔴 Reescrita dos reads de concurso sobre o novo modelo (contrato estável)

**Requisitos:**
1. `groupByCargo()` desaparece: `listConcursos`, `getConcursoDetail` e
   `getCargoDetail` leem `Cargo`/`CargoProva` diretamente.
2. **Payloads idênticos aos atuais** (R3.1 item 7). `provas[].isPrimary` ←
   `isOficial`. Ficha/vagas/salário vêm do `Cargo` (não mais da prova
   primária — o bug da "primária despublicada" morre aqui).
3. Prova compartilhada: aparece nas `provas[]` de **cada** cargo vinculado;
   `questionCount` e `userStats` são os da prova (iguais nos dois cargos — é a
   mesma prova; prontidão idêntica é o comportamento correto).
4. Absorver as melhorias de performance supersedidas:
   - `relatedProvas` com `take` no banco (2 queries tier1/tier2 com
     `orderBy examDate desc`, cap 8) — agora via `Cargo.role` + join;
   - `getStudyPlan` em batch: carregar as respostas do usuário **uma vez**
     para o conjunto de provas-alvo e derivar os planos em memória
     (hoje: ~20+ queries/page view, `concurso.service.ts:1033-1043`).
5. `subject-distribution` e `competition-history`: `previousEditionsWhere`
   (mesmo role+banca+instituição) passa a resolver role via Cargo; manter
   semântica e payload.
6. Fallback UUID: `getCargoDetail` aceita UUID de ExamBase como hoje o nível 1
   aceita (absorve o antigo T4.2) — resolve prova → cargo(s) vinculado(s).

**Critérios de aceite:** **todos os 74 testes de página do web-react passam
sem alteração de mock/payload**; e2e `concurso.e2e-spec.ts` adaptado (factories
criam Cargo) e verde; teste e2e novo: 2 cargos compartilhando 1 prova →
ambos os cargos exibem a prova com o mesmo `questionCount`, treino iniciado por
um reflete prontidão no outro.

### R4.3 🔴 Admin UI: gestão de cargos e compartilhamento de prova

**Requisitos:**
1. No form de edição da prova (`exams/editar/$examBaseId`): substituir a seção
   `cargoGroupId` ("Gerar" + toggle "prova principal") por gestão de vínculos:
   a quais cargos esta prova pertence + marcar "prova oficial" por cargo.
2. Tela/seção de Cargo (pode viver no fluxo do concurso no admin): editar a
   ficha (role, salário, vagas, requisitos, corte, conteúdo programático) —
   campos que hoje são editados na prova primária.
3. Ação "compartilhar prova com outro cargo": picker de cargos do mesmo
   concurso (o caso Recife em 2 cliques).
4. Editor de `syllabusGroups` aponta para o Cargo (era fase EDITAL do wizard,
   por prova).

**Critério de aceite:** fluxo manual completo — criar concurso com 2 cargos,
importar questões numa prova, compartilhá-la com o 2º cargo, ver os dois
cargos treináveis no app com a mesma prova.

### R4.4 🟠 Frontend: ajustes residuais + tipos

**Requisitos:**
1. Se o contrato foi preservado (R4.2), aqui só entram: tipos novos de admin,
   telas do R4.3, e qualquer ponto do app que dependa de `cargoGroupId`
   diretamente (varrer `web-react/src` — hoje o front não recebe esse campo,
   conferir).
2. Mesa do treinador com prova compartilhada: chip/copy do motivo ("este
   concurso") já cobre; validar que `pickRecommendation` se comporta bem com a
   mesma prova aparecendo em 2 cargos (estados de sessão em andamento são por
   prova — ok por construção).

**Critério de aceite:** testes de página verdes; validação manual do fluxo
Recife (2 cargos, 1 prova) nos 3 níveis.

---

## Fase 5 — UX / feedback (inalterada pela remodelagem)

### T5.1 🟠 Mensagem correta de cota/plano ao iniciar treino

`useProgramActions` usa `requireAccess()` (só assinatura) em vez de
`canStartTraining()`/`trainingBlockedMessage` já prontos
(`useRequireAccess.ts:49-94`). Trocar e exibir a mensagem no CTA (mesa e hero);
idealmente desabilitar o CTA com nota quando a cota esgotou.

### T5.2 🟡 Tratar erro nos CTAs silenciosos

"Começar" do nível 1 (`useStartSimuladoMutation` sem `onError`,
`$concursoSlug/index.tsx:155-163`) e `advanceStage`
(`TrainingFlow.tsx:320-366`) falham sem feedback. Adicionar
snackbar/inline+retry; avaliar handler global de mutation no `QueryClient`.

### T5.3 🟡 Eliminar o flicker da aba default do cargo

`tab` resolve 'detalhes' e salta para 'treino' quando os trainings chegam
(`$cargoSlug.tsx:255-263`). Resolver a aba só depois de `trainingsQuery`
assentar (integra com o gating do T2.1).

---

## Fase 6 — Limpeza

### R6.1 🟠 Migration de limpeza do modelo antigo + docs

**Pré-condição:** R4.x estável em produção (recomendação: 1-2 semanas de
observação antes do drop).

**Requisitos:**
1. Migration dropando de `exam_bases`: `cargoGroupId`, `isPrimaryProva`,
   `provaLabel`, os campos de ficha migrados para `Cargo` (lista do R3.1) e
   os que subiram ao `Concurso` (`editalUrl`, `registrationStart/End`,
   `resultDate` — design doc §2b); dropar `exam_syllabus_groups.examBaseId`.
2. Remover o dual-write dos services.
   ⚠️ Antes de dropar `exam_bases.role`: reescrever `previousEditionsWhere`
   (e o match legado de `relatedProvas`) para resolver role via join
   `cargoProvas → cargo.role` — hoje casam pela coluna legada, válida
   apenas enquanto o dual-write existir.
   ⚠️ Antes de dropar `exam_bases.provaLabel/role`: `training.service#list`
   monta `cargoLabel` com as colunas legadas (`role + provaLabel`) —
   migrar para o vínculo CargoProva/Cargo.
3. **Mesma disciplina de deploy do drop de `registrationDate`** (T7.1): código
   que não referencia as colunas primeiro, migration depois; SQL de rollback
   documentado.
4. Atualizar `CLAUDE.md` (a convenção "Cargo com múltiplas provas
   (cargoGroupId)" inteira é reescrita), reescrever `seed-multi-prova.ts` para
   o novo modelo (+ cenário de prova compartilhada) e registrar a sessão em
   `vibe-coding/`.

### T6.1 🟡 Remover código morto do frontend

- `web-react/src/features/concurso/components/CollapsibleCard.tsx` — sem
  importadores.
- `web-react/src/features/concurso/components/InstitutionMark.tsx` — órfão;
  só `components.test.tsx:7` importa `institutionInitials` (mover o helper).

### T6.2 🟡 Dívidas registradas (não implementar agora)

- `listConcursos` sem paginação (full scan da entrada, anônimo,
  `concurso.service.ts:361-391`) — paginação/cache quando o catálogo crescer.
- Write-on-read anônimo sem rate limit no lazy-link — rate limit de infra na
  família `/concursos`.
- Sem analytics nas páginas novas (PostHog é só do site público) — decidir se
  o funil concursos→cargo→treino ganha tracking no launch.
- `npm run build` (`vite build && tsc`) retorna exit≠0 **desde a main** (~19
  erros pré-existentes de imports não usados + 2 de tipos de rota; o
  `vite build` passa). Consertar num PR separado para o build voltar a ser
  gate confiável.
- `api/test/app.e2e-spec.ts` (boilerplate com AppModule inteiro) tem teardown
  flaky: o worker do BullMQ emite "Connection is closed" após o fim dos
  testes e às vezes derruba o processo do Jest, marcando a suíte vizinha
  como falha. Trocar por um app enxuto ou fechar as queues no afterAll.

---

## Fase 7 — Deploy

### T7.1 🔴 Plano de deploy coordenado migration + código — RUNBOOK (2026-07-13)

**Migrations pendentes em prod nesta branch (em ordem):** as 6 do épico
anterior (aditivas/idempotentes), `20260613055322_drop_exam_base_registration_date`
(**única destrutiva**), `20260713000000_concurso_unique_null_safe` (dedup +
índice parcial) e `20260713143742_cargo_prova_m2m_backfill` (aditiva +
backfill).

**Ordem de deploy (o start:prod roda `prisma migrate deploy` antes do node —
código e migrations sobem juntos no mesmo release):**

1. **Pré-deploy (uma vez, com o banco de prod):**
   - backup/snapshot do Postgres;
   - conferir duplicatas de `Concurso` sem banca (a migration dedup resolve,
     mas vale saber o antes):
     `SELECT institution, year, count(*) FROM concursos WHERE "examBoardId" IS NULL GROUP BY 1,2 HAVING count(*)>1;`
2. **Deploy do release da branch.** Sequência interna segura:
   - o drop de `registrationDate` roda ANTES de o node novo subir (deploy
     runner), e o código novo não referencia a coluna → ok. ⚠️ O código
     ANTIGO (main) referencia — se o processo antigo continuar servindo
     durante a janela da migration (rolling deploy), haverá erros 500 nas
     rotas de exam-base até o processo novo assumir. Janela aceitável (~s);
     para zero-downtime, escalar para 0 antes do deploy;
   - dedup + unique NULL-safe: idempotente, segura com tráfego;
   - backfill Cargo/CargoProva: aditivo, idempotente (IDs determinísticos,
     ON CONFLICT DO NOTHING), seguro com tráfego; o código antigo ignora as
     tabelas novas e o novo lê com self-heal para retardatários.
3. **Pós-deploy:** T7.2 (auditorias) + T7.3 (smoke).

**Rollback:**
- Código: voltar o release anterior. As tabelas/colunas novas não atrapalham
  a main (dual-write manteve as colunas legadas escritas). ÚNICO reparo
  necessário: recriar a coluna dropada —
  `ALTER TABLE exam_bases ADD COLUMN "registrationDate" TIMESTAMP(3);`
  (dado é re-derivável: `UPDATE exam_bases SET "registrationDate" = "registrationStart";`).
- Banco: nenhuma migration da remodelagem precisa ser revertida (aditivas);
  se necessário limpar: `DROP TABLE cargo_provas, cargos;` +
  `ALTER TABLE exam_syllabus_groups DROP COLUMN "cargoId";` +
  `ALTER TABLE concursos DROP COLUMN "registrationStart","registrationEnd","resultDate";`
  e remover as linhas de `_prisma_migrations` correspondentes.

A migration de **limpeza** (R6.1, futura) repete a disciplina do drop:
código que não referencia as colunas primeiro, migration depois.

### T7.2 🟠 Revisão manual pós-migration dos backfills

1. `isNursingRelevant` (migration `20260612154602`, heurística
   `role NOT ILIKE '%enferm%'`): listar os `false` e revisar no Prisma Studio
   (falso-negativo some da página do concurso). Após a remodelagem o campo
   vive no `Cargo` — revisar lá.
2. Backfill da remodelagem (R3.2): amostrar cargos migrados (1 por tipo:
   standalone, grupo multi-prova, grupo sem primária) e conferir ficha/slug.
3. **Ano divergente do lazy-link (T1.2):** rodar em prod a query de auditoria
   (dev já verificado em 2026-07-13, 0 linhas) e corrigir `year`/slug se
   houver resultado:
   ```sql
   SELECT c.id, c.slug, c.year, EXTRACT(YEAR FROM eb."examDate")::int AS utc_year
   FROM concursos c JOIN exam_bases eb ON eb."concursoId" = c.id
   WHERE EXTRACT(YEAR FROM eb."examDate")::int <> c.year;
   ```

### T7.3 🟡 Smoke test pós-deploy

1. `/concursos` anônimo e logado (cards, filtros, status open/future/past).
2. Nível 1 → nível 2 (abas, view transitions).
3. Treino embutido completo (cota debitada **uma** vez — valida T2.1; lista de
   estudo populada pós-prova — valida T2.2; prontidão atualiza — valida T2.3).
4. **Cenário Recife:** 2 cargos com a mesma prova — ambos treináveis, mesma
   prontidão, admin compartilha em 2 cliques.
5. Deep links: `/concursos/:uuid` e rotas antigas `/treino/$trainingId/*`.
6. Mobile: bottom nav durante a prova (valida T2.4).

---

## Resumo da ordem

| # | Tarefa | Sev. | Área |
|---|--------|------|------|
| T0.1 | Commitar working tree | 🔴 | git |
| T1.1 | Unique NULL-safe do lazy-link + catch P2002 | 🔴 | API/DB |
| T1.2 | Ano UTC na chave de agrupamento | 🔴 | API |
| T2.1 | Sessão duplicada / gating de `trainingsQuery` | 🔴 | Front (+API) |
| T2.2 | Invalidar `studyItems` pós-prova embutida | 🔴 | Front |
| T2.3 | Invalidar `concursoKeys` pós-treino | 🟠 | Front |
| T2.4 | Bottom nav mobile na prova embutida | 🟠 | Front |
| R3.1 | Design doc da remodelagem (campos, regras, contrato) | 🔴 | Design |
| R3.2 | Schema Cargo/CargoProva + backfill (aditivo) | 🔴 | DB |
| R4.1 | Serviço de Cargo + invariantes transacionais | 🔴 | API |
| R4.2 | Reads de concurso no novo modelo (contrato estável) | 🔴 | API |
| R4.3 | Admin UI: cargos + compartilhar prova | 🔴 | Front |
| R4.4 | Ajustes residuais do frontend | 🟠 | Front |
| T5.1 | Mensagem de cota (`canStartTraining`) | 🟠 | Front |
| T5.2 | Erros silenciosos nos CTAs | 🟡 | Front |
| T5.3 | Flicker da aba default | 🟡 | Front |
| R6.1 | Migration de limpeza + CLAUDE.md + seeds | 🟠 | DB/docs |
| T6.1 | Código morto | 🟡 | Front |
| T6.2 | Dívidas registradas | 🟡 | — |
| T7.1 | Plano de deploy coordenado | 🔴 | Deploy |
| T7.2 | Revisão manual dos backfills | 🟠 | Deploy |
| T7.3 | Smoke test pós-deploy | 🟡 | Deploy |

**Critério de merge para `main`:** T0.1, Fase 1, T2.1–T2.2, Fases 3–4
completas (remodelagem funcional com contrato estável) e T7.1 planejada.
T2.3/T2.4, Fase 5 e R6.1 podem ser fast-follow.

**Estimativa da remodelagem (Fases 3–4):** ~2 a 4 semanas de trabalho — é a
maior parte do caminho restante até produção. Se o prazo de launch apertar, o
plano B é publicar o épico atual (critério de merge da v1) e fazer a
remodelagem como épico seguinte — as Fases 0–2 são idênticas nos dois cenários.
