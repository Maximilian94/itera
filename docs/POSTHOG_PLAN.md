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

### Por que rastrear pelo backend também

O frontend **perde eventos** em situações críticas pro nosso problema de abandono:

- Usuário fecha a aba no meio da prova → `exam_finished` nunca é emitido, mas o `question_answered` das últimas questões pode ter chegado. No PostHog isso vira um funil ambíguo: ele abandonou de verdade ou o evento só se perdeu?
- Perda de rede, crash do navegador, logout em outra aba → mesmo efeito.
- **`exam_abandoned` não existe no frontend por natureza** — ninguém clica em "abandonar". Abandono é *ausência* de ação ao longo do tempo, e só o backend consegue detectar isso via job agendado.

O backend tem a verdade (linha no DB com `status`, timestamps), então emitir lá garante o evento. Frontend continua útil pra comportamento de **interação** (viewed, paused, time-on-question); backend cobre **ciclo de vida** (started, answered, finished, abandoned).

### Implementação

- Instalar `posthog-node`.
- Criar um `AnalyticsModule` no Nest com `AnalyticsService` singleton expondo:
  - `capture({ userId, event, properties })`
  - `shutdown()` — chamar no `OnModuleDestroy` pra não perder eventos em flight.
- Injetar o service nos handlers de exam/training e emitir eventos autoritativos.
- Criar um job com `@nestjs/schedule` (`@Cron('0 * * * *')`) que varre `exam_attempts` com `status='in_progress'` sem atividade há >24h e emite `exam_abandoned` (props: `attemptId`, `lastQuestionIndex`, `totalQuestions`, `timeSinceLastActivityMinutes`). Marcar no DB pra não duplicar.

## 6. Eventos a rastrear

**Regra de ouro**: cada evento tem UMA fonte autoritativa. Evita dupla contagem no funil.
- **Ciclo de vida da prova** (estado no DB) → emitido **só no backend**.
- **Comportamento de interação** (UI, navegação, tempo) → emitido **só no frontend**.

### Frontend (app — `web-react`)

Funil de entrada (ações de UI):
- `signed_up` (emitido após sucesso no Clerk)
- `onboarding_started`
- `onboarding_completed`
- `dashboard_viewed`

Monetização (ações de UI):
- `plan_page_viewed`
- `checkout_started` (clique no botão que abre Stripe Checkout)

Comportamento dentro da prova (só front vê):
- `question_viewed` (props: `questionIndex`, `totalQuestions`, `timeOnPrevQuestionMs`)
- `exam_paused` (fecha aba ou navega para fora sem finalizar)
- `feedback_viewed`

### Backend (API — `api`)

Ciclo de vida (verdade no DB):
- `exam_started` (no handler de criar attempt; props: `attemptId`, `examBaseId`, `source`)
- `training_created` (no handler de criar training; props: `examBaseId`, `subjectFilter`, `questionCount`)
- `question_answered` (no handler de upsert answer; props: `attemptId`, `questionIndex`, `correct`, `alternativeId`)
- `exam_finished` (no handler de finish; props: `attemptId`, `score`, `durationMinutes`)
- `exam_abandoned` (emitido pelo job agendado; props: `attemptId`, `lastQuestionIndex`, `totalQuestions`, `timeSinceLastActivityMinutes`)
- `checkout_completed` (no webhook Stripe; props: `plan`, `priceId`) — webhook é a fonte de verdade, UI pode perder o retorno.

## 7. Session Replay + Heatmaps

### Configuração no código (feito)

- `posthog-js` no `web-react` já inicializa com:
  ```ts
  session_recording: {
    maskAllInputs: true,
    maskTextSelector: '[data-sensitive]',
  }
  ```
- Elementos com PII textual (não-input) marcados com `data-sensitive`:
  - `account.tsx` — nome e email do próprio usuário.
  - `admin/users.tsx` — email e telefone de cada usuário na lista e no drawer de detalhes.
- Adicionar `data-sensitive` em novos lugares sempre que renderizar email, telefone, CPF ou dados de pagamento diretamente no DOM.

### Ações no dashboard do PostHog

1. **Projeto `maximize-app`** → Settings → Session Replay → ativar.
2. **Sampling** — definir taxa global em ~15% inicialmente (ajuste conforme o volume de replays mensais). Dá pra subir pra 100% depois via feature flag em cohorts específicos (ex.: "iniciou prova mas não finalizou nas últimas 48h") se quiser foco cirúrgico no abandono.
3. **Console logs & network** — não ativar captura de network (pode vazar tokens/PII em headers).
4. **Heatmaps** — ativos por padrão no autocapture. Pra análise, **filtrar por URL** no dashboard excluindo `/planos` e `/checkout-*` (não bloqueamos a captura na SDK porque os dados ainda são úteis pra debug; só queremos evitar olhar heatmap sobre pricing/pagamento).

### Tier gratuito

5.000 recordings/mês grátis. Com sampling de 15% e ~300 usuários ativos × 8 sessões/mês = ~360 recordings, caberia folgado. Ajustar pra baixo se escalar.

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
