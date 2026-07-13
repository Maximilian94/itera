# 2026-07 — Remodelagem Cargo↔Prova (M:N) + caminho para produção

Sessão(ões) de 2026-07-13 sobre a branch `feature/concurso-lazy-link`,
guiadas por `TAREFAS-PRODUCAO.md` (auditoria da branch vs main). Design
aprovado em `2026-07-remodelagem-cargo-prova-design.md`.

## O que foi feito (em ordem)

**Fase 0–2 — integridade e bloqueadores (T0.1, T1.1–T1.2, T2.1–T2.4):**
- unique NULL-safe do lazy-link (dedup + índice parcial `WHERE examBoardId IS NULL`),
  catch só de P2002, `orderBy createdAt asc`;
- ano da chave de agrupamento em UTC (+ Jest com `TZ=America/Sao_Paulo`);
- sessão de treino duplicada: gating da mesa (pending/erro) + `training#create`
  idempotente por prova (não cobra cota de novo);
- invalidations de `studyItems` e `concursoKeys` no fluxo embutido;
- bottom nav mobile some via `group-has-[[data-exam-player]]`.

**Remodelagem (R3.1–R4.3):**
- R3.1: design doc; decisões de revisão: `editalUrl` + janela de inscrição
  sobem ao **Concurso** (§2b), `Cargo.concursoId` obrigatório → Concurso
  **eager** na criação da prova;
- R3.2: models `Cargo`/`CargoProva` + colunas de janela no Concurso +
  `exam_syllabus_groups.cargoId`; migration aditiva com backfill
  determinístico (cargo de grupo = `cargoGroupId`, standalone = id da prova)
  e unique parcial "≤1 `isOficial` por cargo";
- R4.1: `CargoModule` (CRUD ficha, vincular/desvincular/oficial em
  `$transaction`, cross-concurso 400, desvincular oficial 400), Cargo
  default 1:1 no wizard e no scraper, dual-write bidirecional das colunas
  legadas, `ConcursoLinkService` extraído;
- R4.2: reads (`listConcursos`/`getConcursoDetail`/`getCargoDetail`) sobre o
  modelo novo com **payloads idênticos** (testes de página como harness,
  nenhum mock alterado); `relatedProvas` com take no banco; planos de estudo
  em 2 queries (batch); **self-heal de Cargo na leitura** (cobre seeds e
  dados legados, respeita grupos);
- R4.3: `features/cargo` no web-react — `CargoLinksSection` no form da prova
  (vínculos, oficial, rótulo, compartilhar com outro cargo/criar cargo novo)
  + `CargoFichaDialog`; campos legados removidos de DTOs e types.

**Produto/limpeza:**
- navegação enxuta: só Home + Concursos (+ Perfil); `/treino`, `/history`,
  `/exam-boards` removidos — `/treino/*` virou redirect de compatibilidade
  (deep link resolve a sessão e cai na página do cargo);
- Fase 5: cota/plano bloqueiam CTAs com o motivo (`canStartTraining`),
  erros de CTA com feedback inline, aba default do cargo sem flicker;
- T6.1: `CollapsibleCard`, `InstitutionMark`, `/database`, `SideBar` antigo,
  `/exams/$examBoard` órfã. tsc pré-existente caiu de 19 → 7 erros.

## Decisões que valem lembrar

- **Contrato estável como estratégia de migração:** o front (e seus testes)
  não mudou nada entre o modelo antigo e o novo — `isPrimary` deriva de
  `isOficial` e `cargo.id` continua sendo um id de PROVA (a oficial), porque
  o front consome `/exam-bases/:id/...` com ele.
- **IDs determinísticos no backfill/heal** (grupo = `cargoGroupId`,
  standalone = id da prova) tornam tudo idempotente e mantêm o fallback por
  UUID funcionando por construção.
- **Dual-write até R6.1** nas colunas legadas → rollback trivial. As três
  pré-condições do drop estão anotadas no R6.1 do TAREFAS
  (`previousEditionsWhere`, match legado de `relatedProvas`, `cargoLabel`
  do training).
- Runbook de deploy consolidado no T7.1 do TAREFAS (único drop:
  `registrationDate`; resto aditivo/idempotente).

## Pendências (fora do código)

- Validação manual: fluxo Recife (admin compartilha prova → 2 cargos
  treináveis com a mesma prontidão), bottom nav mobile nas 5 fases, passada
  geral na navegação nova.
- R6.1 (limpeza) só após 1–2 semanas de prod estável.
- Flake conhecido: teardown do BullMQ no `app.e2e-spec` (T6.2).
