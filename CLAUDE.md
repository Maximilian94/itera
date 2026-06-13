# Maximize Enfermagem

Plataforma que prepara enfermeiros brasileiros para aprovação em concursos públicos de enfermagem no Brasil. Monorepo com múltiplas aplicações.

## Arquitetura do Monorepo

| Diretório | O que é | Stack |
|---|---|---|
| `web-react/` | **Aplicação interna** — painel do usuário logado (questões, provas, métricas) | React 19 + Vite + MUI + TailwindCSS + TanStack Router + TanStack Query + Clerk (auth) |
| `nextjs-maximize-enfermagem/` | **Site público** — landing page, blog, conteúdo aberto | Next.js 16 + Sanity CMS (next-sanity) + TailwindCSS + PostHog |
| `studio-maximize-enfermagem/` | **Sanity Studio** — CMS para gerenciar conteúdo do site público | Sanity v3 |
| `api/` | **Backend** — source of truth para regras de negócio | NestJS + Prisma + PostgreSQL |
| `domain/` | **Domínio puro** — tipos e regras de negócio em TS (sem imports de framework) | TypeScript puro |
| `web/` | **App Angular (legado)** — cliente original, sendo substituído por `web-react/` | Angular + PrimeNG |

## Dev local

```bash
# Backend + banco
docker compose up -d          # Postgres
cd api && npm run start:dev    # NestJS em :3000

# App interna (React)
cd web-react && npm run dev    # Vite em :3001

# Site público (Next.js)
cd nextjs-maximize-enfermagem && npm run dev  # Next.js em :3002

# Sanity Studio
cd studio-maximize-enfermagem && npm run dev
```

## Manutenção deste arquivo

Ao finalizar uma tarefa, avalie se este CLAUDE.md precisa ser atualizado. Se a tarefa introduziu algo que um futuro assistente precisaria saber (nova lib, novo padrão, novo diretório, mudança de arquitetura), adicione um resumo curto na seção relevante. O objetivo é reduzir tokens gastos com exploração em conversas futuras.

## Convenções

- Backend é source of truth para regras de negócio; frontends são clientes finos.
- `domain/` não importa nada de framework — apenas TS puro.
- Leia `SPEC.md`, `RULES.md`, `API.md` e `CONVENTIONS.md` antes de implementar features no core (api/domain).
- Endpoints REST usam recursos no plural: `/questions`, `/attempts`, `/skills`.
- **Concurso (edital) × ExamBase (prova):** um `Concurso` agrupa várias `ExamBase` (uma por cargo) via `ExamBase.concursoId`. O vínculo é populado *preguiçosamente na leitura* por `api/src/concurso` (`GET /exam-bases/:id/concurso` → `{ concurso, provas[] }`); chave de agrupamento = `institution + ano(examDate) + examBoardId` (o `@@unique` do model). Sem `institution` não há agrupamento. No front, a página `/exams/$examBoard/$examId` consome via `useExamConcursoProvasQuery`.
- **Página do concurso (nível 1):** `GET /concursos/:slug` (aceita UUID) é o payload canônico — status temporal (`open/future/past`) derivado no backend (`api/src/concurso/concurso-status.ts`), timeline agregada das provas, agregados/cargos só de provas `isNursingRelevant`, ordenados por salário desc. Um UUID que não bate em `Concurso` é tentado como `ExamBase.id` (fallback lazy que cria o vínculo na hora) — por isso a listagem `/exams` pode linkar `/concursos/$id` antes do vínculo popular.
- **Listagem/descoberta (nível 0, MAX-28):** `GET /concursos` (`@OptionalAuth`, `concurso.service.ts#listConcursos`) é a **porta de entrada** — um card por concurso, agregado direto de `ExamBase` pela tupla `institution + banca + ano(examDate)` (cobre tudo, mesmo sem o lazy-link ter rodado; **read-only**, não cria linhas `Concurso`). Só provas `isNursingRelevant`; sem `institution` ficam de fora. Cada card linka por `concurso.slug` (quando já existe) ou por um `ExamBase.id` representante (fallback lazy resolvido por `resolveConcurso` na 1ª visita). Filtros server-side `q/scope/state/city/examBoardId/status` (espelham os antigos filtros de `/exams`; a página os aplica client-side). Ordem: `open → future → past`, depois por examDate. Front: rota `/concursos/` (`web-react/src/routes/_authenticated/concursos/index.tsx`) via `useConcursosQuery`. **`/exams` deixou de ser a entrada** → vira camada de provas/admin; o item de nav primário ("Concursos") aponta p/ `/concursos` e `alsoMatch: ['/exams']` mantém ativo. Admin chega em `/exams` pelo botão "Gerenciar provas".
- **Janela de inscrição (timeline):** a inscrição é uma janela `ExamBase.registrationStart`/`registrationEnd` (+ `resultDate`); o `concurso-status.ts` agrega `registrationStart` (mais cedo) e `registrationEnd` (mais tarde) das provas e deriva `open` quando hoje ∈ janela. A coluna antiga `registrationDate` (data única) foi removida na limpeza final do épico (MAX-27, migration `drop_exam_base_registration_date`); o backfill mandou-a p/ `registrationStart`. A extração por IA (`exam-base-ai.service.ts`) preenche os dois extremos.
- **Navegação concurso ↔ prova (MAX-25):** página de prova (`/exams/$examBoard/$examId`) = player/ficha técnica; página de cargo = camada de preparação — sem redirect, só links cruzados (breadcrumb e seção "Outras provas" → concurso/cargos; páginas de cargo → provas anteriores). `GET /exam-bases` traz `concurso { id, slug }` (null até o lazy-link popular). _(MAX-28 inverteu a navegação: o item primário virou "Concursos" → `/concursos`, e `/exams` passou a ser a camada de provas/admin marcada como ativa via `alsoMatch`.)_ Scroll restoration: o scroll é do div do layout `_authenticated` (`data-scroll-restoration-id`), não da window.
- **Página do cargo (nível 2):** `GET /concursos/:slug/cargos/:cargoSlug` (`cargoSlug` = `ExamBase.slug`, aceita UUID) — ficha do cargo, `syllabusGroups` (`[]` p/ prova passada), `previousExams` (mesmo role+banca+instituição, edições anteriores) e `studyPlan` do usuário (`diagnostico/treino_dirigido/reta_final`, corte = `minPassingGradeNonQuota` ?? 60; prova futura sem questões computa sobre as previousExams). Cargo fora do concurso ou `isNursingRelevant=false` → 404.
- **Distribuição por matéria (bloco do nível 2):** `GET /exam-bases/:id/subject-distribution` (`@OptionalAuth`, `api/src/concurso/subject-distribution.service.ts`) — `mode: "actual"` p/ prova passada (questões da própria prova) ou `"historical"` p/ futura (união das `previousExams`, mesmo role+banca+instituição; `sourceExams` lista quais). `subject` null vira "Outros" se >5% do total, senão sai do cálculo (total reduzido junto — soma de counts = totalQuestions sempre). `userAccuracy` fração 0..1, mínimo 5 respostas senão `null`; `insight.topSubjects` = menor prefixo ≥50% (máx 3, sem "Outros"), `weakestRelevant` = maior `share × (1 - accuracy)`.
- **Conteúdo programático por cargo:** model `ExamSyllabusGroup` (grupos do edital com tópicos em texto corrido, input manual do admin). CRUD ADMIN em `/exam-bases/:id/syllabus-groups` (+ `/order` para reordenar) via `api/src/examBase/exam-syllabus-group.service.ts`; `GET /exam-bases/:id` retorna `syllabusGroups` ordenados (sem grupos → `[]`, front esconde a seção). Editor no wizard admin (fase EDITAL).
- Autenticação via Clerk no `web-react/`; a API valida tokens Clerk. Rotas com payload público enriquecido para logados usam `@OptionalAuth()` (`api/src/common/decorators/optional-auth.decorator.ts`): sem token válido a rota responde anônima em vez de 401.
- Logs de sessões de vibe-coding ficam em `vibe-coding/YYYY-MM-<slug>.md`.

## Design Context (impeccable)

Trabalho de design do `web-react/` é guiado por dois arquivos na raiz (criados pelo skill `/impeccable`):

- **`PRODUCT.md`** — register (`product`), usuários, propósito, personalidade de marca, anti-referências e princípios estratégicos. Responde "quem/o quê/por quê".
- **`DESIGN.md`** — sistema visual no formato Google Stitch (tokens em frontmatter + 6 seções). Cores, tipografia, elevação, componentes. Responde "como parece". Sidecar em `.impeccable/design.json`.

Resumo: register **product**; North Star **"The Training Ground"** (motivador e profissional, nunca infantil); acento único **Momentum Cyan** (`#0891b2`) sobre neutros slate; tipografia única **Manrope**; verde/vermelho reservados para feedback de resposta (acerto/erro). Leia `DESIGN.md` antes de mexer em UI; `PRODUCT.md` vence em voz/estratégia, `DESIGN.md` vence em decisões visuais.

Live mode (`/impeccable live`) já configurado em `.impeccable/live/config.json`.

## Testes

```bash
cd api && npm test              # Jest (unit)
cd api && npm run test:e2e      # Jest (e2e)
cd web-react && npm test        # Vitest
```

No `web-react/`, testes de **página/rota** usam o harness `src/features/concurso/__tests__/page-test-utils.tsx`: as rotas de arquivo são re-parentadas num root de teste via `Route.update({ getParentRoute })` (mesma técnica do `routeTree.gen.ts`, pulando o layout `_authenticated`/Clerk) + `createMemoryHistory`; a rede é mockada no `fetch` global por pathname (todos os services passam por `apiFetch`). Acessibilidade: `expectNoSeriousAxeViolations()` (axe-core em jsdom, sem `color-contrast`) + teste de contraste dos tokens em `contrast.test.ts` (culori). Testes de página NUNCA dentro de `src/routes/` (o gerador do router escaneia o diretório).

E2E da API roda contra um Postgres **dedicado** `itera_test` (mesma instância do docker compose; override via `TEST_DATABASE_URL` — o nome do banco precisa conter "test", pois a suíte trunca tabelas). Infra em `api/test/`: `e2e-env.ts` (aponta o `DATABASE_URL`), `global-setup.ts` (`prisma migrate deploy`), `create-app.ts` (app Nest enxuto + `TestAuthGuard` que simula o Clerk via header `x-test-user-id`, preservando a semântica de `@Public`/`@OptionalAuth`/401) e `factories.ts` (seed por helpers, sem SQL solto). Exemplo completo: `api/test/concurso.e2e-spec.ts`.

## Banco de dados

```bash
cd api
npm run db:migrate              # Prisma migrate dev
npm run db:seed                 # Seed inicial
npm run db:studio               # Prisma Studio (GUI)
```
