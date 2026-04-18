# Plano de Instrumentação PostHog

Objetivo: entender **por que** usuários abandonam o site antes de iniciar uma prova, ou abandonam após poucas questões. Combinar eventos quantitativos (funis, drop-off por questão) com session replay qualitativo.

## Stack atual relevante

- **Landing (marketing)**: `nextjs-maximize-enfermagem/` — Next.js 16 App Router + Sanity CMS.
- **App (logado)**: `web-react/` — Vite + React 19 + Clerk (auth) + TanStack Router + TanStack Query.
- **API**: `api/` — NestJS + Prisma.
- Auth: Clerk (já integrado — usar `user.id` como `distinct_id` do PostHog).

---

## 1. Conta e projetos

- Criar conta no **PostHog Cloud EU** (`https://eu.posthog.com`) pela LGPD.
- Criar **dois projetos separados**:
  - `maximize-landing` — rastreia aquisição na landing page pública.
  - `maximize-app` — rastreia comportamento dentro do produto.
- Motivo da separação: mantém os funis de aquisição isolados dos funis de produto; evita poluir retenção com visitantes anônimos.

## 2. Variáveis de ambiente

- `web-react/env.sample`:
  - `VITE_POSTHOG_KEY=""`
  - `VITE_POSTHOG_HOST="https://eu.i.posthog.com"`
- `nextjs-maximize-enfermagem/env.example`:
  - `NEXT_PUBLIC_POSTHOG_KEY=""`
  - `NEXT_PUBLIC_POSTHOG_HOST="https://eu.i.posthog.com"`
- `api/env.sample`:
  - `POSTHOG_KEY=""`
  - `POSTHOG_HOST="https://eu.i.posthog.com"`

## 3. SDK — app (`web-react`)

- Instalar `posthog-js`.
- Inicializar em `main.tsx` **antes** do `RouterProvider`, com `capture_pageview: false` (TanStack Router dispara rotas manualmente).
- Em `__root.tsx`, usar `router.subscribe('onResolved', ...)` para emitir `$pageview` a cada mudança de rota.
- Em `InnerApp` (após Clerk carregar): `posthog.identify(user.id, { email, plan, createdAt })` + `posthog.group('plan', plan)`.
- No sign-out: `posthog.reset()`.

## 4. SDK — landing (`nextjs-maximize-enfermagem`)

- Instalar `posthog-js`.
- Criar um `PostHogProvider` client component e montar no `layout.tsx`.
- Rastrear clicks nos CTAs que levam ao app (`Cadastre-se`, `Ver planos`, etc.) para medir a conversão marketing → app.

## 5. SDK — API (`api`)

- Instalar `posthog-node`.
- Criar um `AnalyticsModule` no Nest com `AnalyticsService` singleton expondo `capture({ userId, event, properties })` e `shutdown()` (chamar no `OnModuleDestroy` pra não perder eventos em flight).
- Usar nos handlers de exam/training para emitir eventos **autoritativos** pelo backend — clientes mentem (fecham aba, perdem rede), backend não.

## 6. Eventos a rastrear

### Frontend (app — `web-react`)

Funil de entrada:
- `signed_up`
- `onboarding_started`
- `onboarding_completed`
- `dashboard_viewed`

Monetização:
- `plan_page_viewed`
- `checkout_started`
- `checkout_completed`

Ciclo da prova (alta prioridade pro problema de abandono):
- `training_created` (props: `examBaseId`, `subjectFilter`, `questionCount`)
- `exam_started` (props: `attemptId`, `source`: `"treino" | "exams_direct"`)
- `question_viewed` (props: `questionIndex`, `totalQuestions`, `timeOnPrevQuestionMs`)
- `question_answered` (props: `questionIndex`, `correct`, `alternativeId`)
- `exam_paused` (fecha aba ou navega para fora sem finalizar)
- `exam_finished`
- `feedback_viewed`

### Backend (API — verdade)

Mesmos eventos de ciclo de vida, emitidos no handler Nest:
- `exam_started` (no handler de criar attempt)
- `question_answered` (no handler de upsert answer)
- `exam_finished` (no handler de finish)
- `exam_abandoned` — emitido por job/cron que marca attempts sem atividade há >24h

Motivo: o `exam_finished` do front se perde quando usuário fecha aba; o backend é a fonte de verdade pro funil.

## 7. Session Replay + Heatmaps

- Ativar session replay com:
  ```ts
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-sensitive]',
  }
  ```
- Proteger PII: Clerk email, dados de pagamento, perfil.
- Heatmaps ativos globalmente **exceto** em `/checkout-*` e `/planos`.
- **Sampling inteligente**: 100% das sessões de usuários que iniciam prova mas abandonam (via feature flag PostHog); % menor pro resto, para caber no tier gratuito.

## 8. Dashboards a construir

1. **Funil principal de ativação**:
   `signed_up` → `onboarding_completed` → `training_created` → `exam_started` → `question_answered` (1ª) → `question_answered` (50% das questões) → `exam_finished`.
   É esse funil que revela onde está o gargalo.

2. **Drop-off por posição da questão**: breakdown de `question_answered` por `questionIndex`. Se existe uma questão específica que detona o abandono, aparece aqui.

3. **Time-on-question**: média de `timeOnPrevQuestionMs` por `questionIndex`. Questões com tempo muito alto = confusas ou difíceis.

4. **Replay playlist**: filtro "usuários que fizeram `exam_started` mas não `exam_finished` nas últimas 48h". Assistir ~10 gravações para o *porquê* qualitativo.

5. **Conversão por plano**: breakdown do funil principal por `plan` group — entender se o problema é específico de um plano.

## 9. Privacidade / LGPD

- Banner de consent na landing (cookie banner) antes de inicializar o PostHog.
- `posthog-js` suporta opt-in: `opt_out_capturing_by_default: true` + `opt_in_capturing()` após o consent.
- Atualizar a política de privacidade para incluir PostHog como subprocessador.
- Para o app autenticado, consent pode ser parte dos Termos de Uso (aceite implícito no sign-up).

## 10. Rollout

1. Setup do SDK no `web-react` com identify via Clerk e pageview do TanStack Router (etapas 1–3).
2. Validar eventos no PostHog "Live Events" fazendo login com a própria conta.
3. Feature flag `analytics_enabled` para poder desligar rápido se algo der errado.
4. Ativar session replay.
5. Adicionar eventos de ciclo de vida da prova (front + back, etapas 5–6).
6. Montar dashboards (etapa 8).
7. Rodar por 1 semana antes de tirar conclusões — amostras pequenas mentem.
8. Revisar achados, escolher 1–2 hipóteses para melhorar UX/onboarding.

---

## Decisões pendentes

- [ ] PostHog Cloud US ou EU? (recomendação: EU pela LGPD)
- [ ] Cookie banner: construir do zero ou usar uma lib (ex.: `cookieconsent`)?
- [ ] Começar implementação pela etapa 1–3 (front-end) ou etapa 5 (back-end)?

## Referências

- PostHog docs: https://posthog.com/docs
- Integração com Clerk: https://posthog.com/docs/libraries/clerk
- Session replay config: https://posthog.com/docs/session-replay
