# PostHog Analytics — abril de 2026

Instrumentação completa de product analytics nos 3 apps do monorepo (landing Next.js, app React, API NestJS) para investigar por que usuários abandonam a plataforma antes de terminar uma prova.

> Documentos relacionados:
> - `docs/POSTHOG_PLAN.md` — plano original, detalhes de configuração e rollout.
> - `docs/POSTHOG_DASHBOARD_SETUP.md` — receita para montar funis e dashboards no PostHog.

---

## 1. Problema

Usuários entravam no site, muitos não iniciavam prova; entre os que iniciavam, uma parte abandonava após poucas questões. A plataforma não tinha nenhuma telemetria — nem Google Analytics — então a única coisa visível era a linha no banco. Não dava pra distinguir:

- "Abandonou de verdade" vs "fechou aba e evento se perdeu".
- "Questão confusa" vs "prova toda difícil".
- "UX ruim do onboarding" vs "conteúdo ruim".

## 2. Solução escolhida

PostHog Cloud EU (LGPD-friendly) com dois projetos separados:

- **`maximize-landing`** — rastreia aquisição na landing pública (`nextjs-maximize-enfermagem`).
- **`maximize-app`** — rastreia comportamento no produto (`web-react` + eventos autoritativos da API NestJS).

Plano **Pay-as-you-go com billing cap de US$5–10/mês**. Inclui as mesmas cotas do Free (1M eventos, 5k replays) mas libera 6 projetos em vez de 1. Custo realista esperado: R$ 0/mês enquanto o uso estiver abaixo das cotas.

Hospedagem na UE por LGPD. Session replay com mascaramento de PII habilitado desde o primeiro evento.

## 3. Arquitetura de captura

### Regra de ouro

**Cada evento tem uma única fonte autoritativa.** Se o backend e o frontend emitirem o mesmo evento, o funil conta duas vezes — então:

| Tipo de evento | Fonte |
|---|---|
| Ciclo de vida (estado no DB) | Backend |
| Interação de UI | Frontend |

### Por que o backend é fonte de verdade pro ciclo de vida

O frontend perde eventos quando:
- Usuário fecha a aba no meio da prova → `exam_finished` nunca é emitido mas `question_answered` das primeiras pode ter chegado. Vira ambiguidade no funil.
- Perda de rede, crash do browser.
- **`exam_abandoned` não existe no frontend por natureza**: ninguém clica em "abandonar". Abandono é ausência de ação ao longo do tempo — só o backend vê isso via job agendado.

O backend tem a linha no DB com `status`, `startedAt`, `finishedAt`; então emitir lá garante o evento mesmo quando o cliente falha.

## 4. Taxonomia de eventos

### Backend (`api/`)

| Evento | Trigger | Props-chave |
|---|---|---|
| `exam_started` | `ExamBaseAttemptService.create()` ou `TrainingService.create()` | `attemptId`, `examBaseId`, `source` (`treino`/`exams_direct`), `subjectFilter`, `trainingId?` |
| `training_created` | `TrainingService.create()` | `trainingId`, `attemptId`, `examBaseId`, `subjectFilter` |
| `question_answered` | `ExamBaseAttemptService.upsertAnswer()` — **só na primeira resposta por questão** | `attemptId`, `questionId`, `questionPosition`, `correct`, `selectedAlternativeId` |
| `exam_finished` | `ExamBaseAttemptService.finish()` | `attemptId`, `scorePercentage`, `totalCorrect`, `totalQuestions`, `durationSeconds` |
| `exam_abandoned` | Cron horário `ExamAbandonmentJob.sweep()` | `attemptId`, `source`, `answeredCount`, `lastQuestionPosition`, `hoursSinceStart` |

Por que `question_answered` só fira na primeira vez: se o usuário muda de ideia antes de finalizar, não queremos contar dupla no funil "quantos responderam questão N".

### Frontend app (`web-react/`)

| Evento | Trigger |
|---|---|
| `$pageview` | Mudança de rota (TanStack Router `onResolved`) |
| `signed_up` | Primeiro identify de um usuário com conta Clerk com <10 min |
| `onboarding_started` | Rota `/onboarding` montada, usuário elegível |
| `onboarding_completed` | Click em "Iniciar treino grátis" dentro do onboarding |
| `plan_page_viewed` | Rota `/planos` montada |
| `checkout_started` | Antes do redirect para Stripe Checkout |
| `question_viewed` | Mudança de `currentQuestionIndex` no player — **com `timeOnPrevQuestionMs`** |
| `exam_paused` | `visibilitychange` → hidden durante prova em andamento |
| `feedback_viewed` | Rota de feedback da prova montada |

### Frontend landing (`nextjs-maximize-enfermagem/`)

| Evento | Trigger |
|---|---|
| `$pageview` | Mudança de `pathname` (App Router) |
| `cta_clicked` | Click em "Acessar Plataforma" (desktop e mobile), prop `location` identifica qual |

## 5. Fluxo de dados ponta-a-ponta

Exemplo de uma sessão de usuário que abandona:

```
1. Abre a landing
   → PostHogProvider inicia SDK (opt-out-by-default)
   → Banner de cookies aparece
   → Clica "Aceitar" → optIn() chamada → $pageview disparado

2. Clica "Acessar Plataforma"
   → cta_clicked emitido (projeto: maximize-landing)
   → Redirect para app.maximizeenfermagem.com.br

3. Login com Clerk
   → main.tsx: analytics.identify(userId) chamado
   → $pageview no projeto maximize-app
   → Se conta tem <10 min: signed_up

4. Vai pra /onboarding
   → onboarding_started
   → Clica em "Iniciar" → onboarding_completed
   → API cria attempt → backend emite exam_started + training_created

5. Inicia a prova, responde 3 questões
   → Para cada questão: question_viewed (front) + question_answered (back)
   → question_viewed carrega timeOnPrevQuestionMs

6. Fecha a aba sem finalizar
   → exam_paused é emitido no visibilitychange
   → exam_finished NÃO chega

7. 24h depois
   → Cron ExamAbandonmentJob.sweep() acha o attempt órfão
   → Emite exam_abandoned com lastQuestionPosition=3
   → Marca abandonedAt no DB para não re-emitir
```

Com esses eventos, o dashboard responde "o usuário trancou na questão 3 e nunca voltou" em vez de "sumiu".

## 6. Arquivos criados/modificados

### `api/` (NestJS)

| Arquivo | O que faz |
|---|---|
| `src/analytics/analytics.service.ts` | Wrapper fino em `posthog-node`. No-op quando `POSTHOG_KEY` ausente. `OnApplicationShutdown` para flush antes de desligar. |
| `src/analytics/analytics.module.ts` | Provider/export do service. |
| `src/examBaseAttempt/exam-abandonment.job.ts` | `@Cron(EVERY_HOUR)` que varre attempts idle >24h, emite `exam_abandoned`, marca `abandonedAt`. |
| `src/main.ts` | `enableShutdownHooks()` para flush de eventos em desligamento. |
| `src/app.module.ts` | Registra `ScheduleModule.forRoot()` + `AnalyticsModule`. |
| `src/examBaseAttempt/exam-base-attempt.service.ts` | Injeta `AnalyticsService`, emite `exam_started`, `question_answered`, `exam_finished`. |
| `src/training/training.service.ts` | Injeta `AnalyticsService`, emite `training_created` e `exam_started` (source=treino). |
| `prisma/schema.prisma` | Coluna `abandonedAt DateTime?` em `ExamBaseAttempt`. |
| `prisma/migrations/20260418081000_add_exam_attempt_abandoned_at/` | Migration aditiva. |

### `web-react/` (app React)

| Arquivo | O que faz |
|---|---|
| `src/lib/analytics.ts` | Wrapper em `posthog-js`. Singleton, no-op se key ausente. Config com `maskAllInputs` + `maskTextSelector: '[data-sensitive]'`. |
| `src/main.tsx` | `analytics.init()` no module scope. `router.subscribe('onResolved')` emite `$pageview`. `InnerApp` identifica via Clerk e emite `signed_up` na primeira identify fresca. |
| `src/auth/clerk.tsx` | Expõe `user.createdAt` no `useClerkAuth` (necessário pra detectar signup fresco). |
| `src/components/ExamAttemptPlayer.tsx` | `question_viewed` e `exam_paused` com guards para pular modo admin/retry/finished. |
| `src/routes/_authenticated/onboarding.tsx` | `onboarding_started`/`onboarding_completed`. |
| `src/routes/_authenticated/planos.tsx` | `plan_page_viewed`/`checkout_started`. |
| `src/routes/_authenticated/exams/$examBoard/$examId/$attemptId/feedback.tsx` | `feedback_viewed`. |
| `src/routes/_authenticated/account.tsx` | `ProfileField` ganhou prop `sensitive` para renderizar `data-sensitive`; email/nome marcados. |
| `src/routes/_authenticated/admin/users.tsx` | `InfoItem` ganhou prop `sensitive`; email/telefone marcados na lista e no drawer. |

### `nextjs-maximize-enfermagem/` (landing)

| Arquivo | O que faz |
|---|---|
| `src/lib/analytics.ts` | Wrapper em `posthog-js` com suporte a consent: inicia `opt_out_capturing_by_default: true`, expõe `optIn()`/`optOut()`/`getConsent()`. |
| `src/components/PostHogProvider.tsx` | Client component: inicializa o SDK e emite `$pageview` em cada mudança de `pathname`. |
| `src/components/CookieBanner.tsx` | Banner fixo no bottom. Mostra se não houver decisão em `localStorage`. "Aceitar" chama `optIn()` + re-emite `$pageview` (pro primeiro não se perder). "Rejeitar" chama `optOut()`. |
| `src/components/Header.tsx` | `cta_clicked` nos dois botões "Acessar Plataforma" com prop `location`. |
| `src/app/layout.tsx` | Monta `PostHogProvider` e `CookieBanner`. |
| `src/app/politica-de-privacidade/page.tsx` | Seção 5: PostHog listado como subprocessador. Seção 8 reescrita: essenciais vs analíticos, fluxo de consent, instruções de revogação. |

## 7. Session replay + proteção de PII

PostHog tem gravação de sessão desde o load da página. Pra evitar vazar PII:

### Config do SDK
```ts
session_recording: {
  maskAllInputs: true,        // todos os <input> ficam mascarados
  maskTextSelector: '[data-sensitive]',  // qualquer elemento com este atributo
}
```

### Regra
Sempre que um componente renderizar email, telefone, CPF ou dado de pagamento **como texto** (não input), adicionar `data-sensitive=""` no wrapper:

```tsx
<span data-sensitive="">{user.email}</span>
```

Lugares já marcados hoje:
- `account.tsx` — nome e email do próprio usuário.
- `admin/users.tsx` — email e telefone na lista e no drawer de detalhes.

### O que **não** mascaramos
- IDs (attemptId, questionId, examBaseId) — não são PII.
- Score, timestamps — métricas.
- Conteúdo das questões — conteúdo público da plataforma.

## 8. LGPD / consent

### Na landing
- Banner inicial antes de qualquer captura.
- `opt_out_capturing_by_default: true` no init — zero requests pro PostHog até aceitar.
- Decisão em `localStorage[maximize:posthog_consent]`. Para resetar: DevTools → Application → Local Storage → deletar a chave.
- Política de privacidade atualizada mencionando PostHog como subprocessador com residência de dados na UE.

### No app autenticado
Sem banner — aceite é implícito nos Termos de Uso do sign-up do Clerk. Se precisar endurecer (cookie granular), adicionar checkbox no sign-up ou banner equivalente.

## 9. Cron de abandono

Cada hora cheia (`@Cron(EVERY_HOUR)`), o `ExamAbandonmentJob` executa:

```sql
SELECT * FROM exam_base_attempts
WHERE finishedAt IS NULL
  AND abandonedAt IS NULL
  AND startedAt < now() - interval '24 hours'
```

Pra cada candidato:
1. Calcula `answeredCount` e `lastQuestionPosition` das answers existentes.
2. Emite `exam_abandoned` no PostHog com os detalhes.
3. `UPDATE ... SET abandonedAt = now()` pra garantir idempotência — o próximo run não re-emite.

A coluna `abandonedAt` serve duplo propósito: marker de idempotência **e** status do domínio (agora existe uma resposta clara pra "a prova foi abandonada?").

## 10. Como adicionar um novo evento

### No frontend app
```ts
import { analytics } from '@/lib/analytics'
// ...
analytics.capture('meu_evento', { prop1: 'valor' })
```

### No backend
```ts
// 1. Injetar AnalyticsService no constructor do service
constructor(private readonly analytics: AnalyticsService) {}

// 2. Emitir no handler
this.analytics.capture({
  userId,
  event: 'meu_evento',
  properties: { prop1: 'valor' },
})

// 3. Garantir que o módulo importou AnalyticsModule
@Module({ imports: [AnalyticsModule], ... })
```

### Padrão de naming
- Verbos no passado: `question_answered`, `exam_finished` (não `answering_question`).
- Snake case.
- Eventos de domínio > eventos de UI. Se algo pode ser inferido do estado do DB, emita pelo backend.

## 11. Kill switch

Se algum evento vazar PII por acidente, bug no banner, ou só pra desligar rápido:

- Setar `NEXT_PUBLIC_POSTHOG_KEY=""` em produção da landing.
- Setar `VITE_POSTHOG_KEY=""` no app.
- Setar `POSTHOG_KEY=""` na API.

Todos os wrappers fazem no-op silencioso quando a chave está vazia. Deploy disso leva minutos, não precisa reverter código.

## 12. O que ainda falta (externos)

1. Criar os 2 projetos no PostHog e configurar billing cap de US$5–10/mês.
2. Colar chaves nas envs de produção (Render pra API, Vercel pra landing, host do app pro web-react).
3. Aplicar a migration `20260418081000_add_exam_attempt_abandoned_at` em prod (roda automaticamente via `prisma migrate deploy` no `start:prod`).
4. Ativar Session Replay no dashboard do PostHog `maximize-app`, ajustar sampling pra ~15%.
5. Montar funis e dashboards seguindo `docs/POSTHOG_DASHBOARD_SETUP.md`.
6. Rodar 1 semana, depois revisar achados e escolher 1–2 hipóteses pra atacar.

## 13. Commits da branch `feature/posthog-analytics`

Em ordem cronológica:

1. `Add PostHog plan doc and integrate SDK in web-react`
2. `Remove stray root package-lock.json` (bug unrelated, fixed along the way — ver troubleshooting abaixo)
3. `Integrate PostHog SDK in Next.js landing`
4. `Document rationale for backend analytics in PostHog plan`
5. `Add AnalyticsModule with PostHog-backed AnalyticsService`
6. `Emit exam lifecycle events from the backend`
7. `Emit exam_abandoned from hourly cron sweep`
8. `Track question_viewed and exam_paused in the exam player`
9. `Track activation, monetization and feedback funnel events`
10. `Mask PII in session replay and document dashboard steps`
11. `Add standalone PostHog dashboard setup recipe`
12. `Add LGPD consent banner and document PostHog in privacy policy`
13. `Rewrite rollout section with concrete production checklist`

## 14. Troubleshooting do caminho

### "Can't resolve 'tailwindcss' in /Users/.../itera" no Next.js

Causa: um `package-lock.json` fantasma vazio ficou no root do repo em um commit antigo. Next.js 16 detecta o workspace root pelo lockfile mais alto e achava o root errado. Fix no commit 2: `git rm package-lock.json` + `/package-lock.json` no `.gitignore` do root.

### Double-counting no funil

Inicialmente o plano listava os mesmos eventos de ciclo de vida em front E back. Mudamos pra a **regra de ouro** (seção 3): cada evento tem uma única fonte. Backend dono do ciclo de vida, frontend dono de UI. Ver seção 6 do `POSTHOG_PLAN.md`.

### `question_answered` disparando múltiplas vezes por questão

Resolvido fazendo pre-check de `findUnique` antes do `upsert` no `ExamBaseAttemptService.upsertAnswer`. Só emite o evento quando `existingAnswer == null`, ou seja, na primeira vez que o usuário responde aquela questão naquele attempt.
