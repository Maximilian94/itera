# 2026-06 — Limpeza e lançamento da página de concurso (MAX-27)

Último ticket do épico MAX-11 (página de concurso, 2 níveis). Tira os artefatos de
mockup do caminho, fecha a dívida técnica do campo `registrationDate` e atualiza a
documentação do repo.

## O que foi feito

### Remoção do mockup de preview

O mockup estático que serviu de norte visual no início do épico já cumpriu o papel —
o design agora vive nos componentes reais (`src/features/concurso/`). Removido:

- `web-react/public/concurso-preview.html`

A rota `concursos/preview.tsx` mencionada no escopo do ticket **já não existia** (foi
removida em algum subticket anterior); só sobrara o HTML estático em `public/`. Não há
mais nenhuma referência a `concurso-preview`/`concursos/preview` no código.

### Remoção do campo deprecado `ExamBase.registrationDate`

`registrationDate` (data única de inscrição) foi substituído pela janela
`registrationStart`/`registrationEnd` na migration `20260612145648_concurso_timeline_fields`,
que já fez o backfill `registrationDate → registrationStart`. Faltava só remover a coluna
e migrar os últimos consumidores que ainda liam/escreviam o campo antigo.

Verificado antes de remover: o app Angular legado (`web/`) **não** referencia o campo
(não há consumidor fora do `api/` e do `web-react/`).

Consumidores migrados para `registrationStart`/`registrationEnd`:

- **API** — DTOs `create/update/extract-metadata`, os três `select` + o input/data do
  `update()` em `exam-base.service.ts`, e o prompt de extração da IA
  (`exam-base-ai.service.ts`, que agora pede os dois extremos da janela).
- **web-react** — `examBase.types.ts` (ExamBase + Extracted + UpdateInput), o formulário
  admin `exams/editar/$examBaseId.tsx` (dois campos de data: início/fim) e a página de
  prova `exams/$examBoard/$examId/index.tsx` (edição inline + o fato "Inscrição até",
  que agora deriva de `registrationEnd`).

Migration final: `20260613055322_drop_exam_base_registration_date` — repete o backfill por
segurança (linhas escritas entre as duas migrations) e então faz `DROP COLUMN`.

### Documentação

- `CLAUDE.md`: nova linha na seção Concurso×ExamBase documentando a janela de inscrição
  (`registrationStart`/`registrationEnd` + `resultDate`, agregação no `concurso-status.ts`)
  e a remoção do `registrationDate`.
- `API.md`/`SPEC.md`: não tocados — são o contrato MVP legado (endpoints `/exams` antigos)
  e não cobrem a superfície de exam-base/concurso; retrofitar o épico inteiro neles seria
  fora de escopo. A documentação viva da superfície de concurso vive no `CLAUDE.md`.

## Arquivos tocados

- `web-react/public/concurso-preview.html` (removido)
- `api/prisma/schema.prisma`, `api/prisma/migrations/20260613055322_drop_exam_base_registration_date/`
- `api/src/examBase/dto/{create,update,extract-metadata}-exam-base*.dto.ts`
- `api/src/examBase/exam-base.service.ts`, `api/src/examBase/exam-base-ai.service.ts`
- `web-react/src/features/examBase/domain/examBase.types.ts`
- `web-react/src/routes/_authenticated/exams/editar/$examBaseId.tsx`
- `web-react/src/routes/_authenticated/exams/$examBoard/$examId/index.tsx`
- `CLAUDE.md`

## Verificação final

Roteiro manual (registrado no PR): /exams → concurso → cargo → treinar matéria → voltar
(stats atualizadas) → trocar para concurso futuro → conferir programático + estimativa →
mobile (CTA fixo, bottom nav) → reduced motion. Screenshots desktop + mobile no PR.
