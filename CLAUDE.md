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
- Autenticação via Clerk no `web-react/`; a API valida tokens Clerk.
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

## Banco de dados

```bash
cd api
npm run db:migrate              # Prisma migrate dev
npm run db:seed                 # Seed inicial
npm run db:studio               # Prisma Studio (GUI)
```
