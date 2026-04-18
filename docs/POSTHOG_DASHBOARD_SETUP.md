# PostHog — Configuração do Dashboard (Etapa 8)

Receita pra montar os funis, trends e playlists no PostHog Cloud. Tudo aqui é clique no dashboard (`eu.posthog.com`), **zero código**.

> Contexto: este arquivo é continuação de `docs/POSTHOG_PLAN.md`. O código já emite todos os eventos listados abaixo. Esta etapa é só análise.

## Pré-requisitos

1. Projeto `maximize-app` criado no PostHog com a chave configurada em produção.
2. Replay + sampling ativados (ver seção 7 do `POSTHOG_PLAN.md`).
3. Ao menos algumas provas reais já rodaram em produção pra haver dados (idealmente 1 semana).

## Eventos disponíveis (referência rápida)

Emitidos pelo **backend** (`api/`):
- `exam_started` — `{ attemptId, examBaseId, source: "treino"|"exams_direct", subjectFilter, trainingId? }`
- `training_created` — `{ trainingId, attemptId, examBaseId, subjectFilter }`
- `question_answered` — `{ attemptId, examBaseId, questionId, questionPosition, correct, selectedAlternativeId }` (só na primeira resposta por questão)
- `exam_finished` — `{ attemptId, examBaseId, scorePercentage, totalCorrect, totalQuestions, durationSeconds }`
- `exam_abandoned` — `{ attemptId, examBaseId, source, answeredCount, lastQuestionPosition, hoursSinceStart }` (job horário)

Emitidos pelo **frontend** (`web-react/`):
- `$pageview`
- `signed_up` (uma vez por usuário por browser, conta com <10min)
- `onboarding_started`, `onboarding_completed`
- `plan_page_viewed`, `checkout_started` — `{ plan, billingInterval, priceId }`
- `question_viewed` — `{ attemptId, examBaseId, questionId, questionIndex, totalQuestions, timeOnPrevQuestionMs }`
- `exam_paused` — `{ attemptId, examBaseId, questionIndex, reason: "tab_hidden" }`
- `feedback_viewed`

Emitidos pela **landing** (`nextjs-maximize-enfermagem/`):
- `$pageview`
- `cta_clicked` — `{ location: "header_desktop"|"header_mobile", target: "app" }`

## 1. Funil principal de ativação

**Objetivo**: ver onde o usuário cai entre cadastro e primeira prova finalizada. É este funil que responde diretamente o problema de abandono.

Passos:
1. Left sidebar → **Product Analytics** → **Funnels** → **+ New funnel**.
2. Adicionar os passos na ordem:
   1. `signed_up`
   2. `onboarding_completed`
   3. `exam_started`
   4. `question_answered` (filtro extra: `questionPosition = 1` — pra medir "respondeu a primeira")
   5. `question_answered` (filtro extra: `questionPosition >= 10` — "respondeu pelo menos 10")
   6. `exam_finished`
3. **Conversion window**: 7 days (ajuste se o ciclo do seu usuário for mais longo).
4. **Breakdown** (opcional): por `source` do `exam_started` — pra comparar `treino` vs `exams_direct`.
5. Salvar como `Activation funnel`.

**Como ler**: a primeira queda gigante (ex.: `signed_up → onboarding_completed` caindo 70%) é onde está teu gargalo. Depois, o último passo (`question_answered >= 10 → exam_finished`) comparado com `exam_abandoned` diz se é abandono ou só o evento se perdeu.

## 2. Drop-off por posição da questão

**Objetivo**: descobrir se existe uma questão específica que detona o abandono.

Passos:
1. **Product Analytics** → **Trends** → **+ New insight**.
2. Série: `question_viewed`.
3. **Breakdown by**: `questionIndex` (event property).
4. **Chart type**: Bar chart.
5. **Time range**: Last 30 days.
6. Salvar como `Drop-off por posição da questão`.

**Como ler**: a barra de `questionIndex = 0` é o 100%. Se cair drasticamente na, digamos, `questionIndex = 7`, alguma coisa na questão 8 (1-indexed) tá assustando. Vai assistir replays dessa questão.

## 3. Time-on-question (tempo médio por questão)

**Objetivo**: questões com tempo muito alto = confusas, enunciado ruim, ou muito difíceis.

Passos:
1. **Product Analytics** → **Trends** → **+ New insight**.
2. Série: `question_viewed`.
3. **Math**: **Property value (average)** → selecionar `timeOnPrevQuestionMs`.
4. **Breakdown by**: `questionIndex`.
5. **Chart type**: Bar chart.
6. Salvar como `Tempo médio por questão`.

**Como ler**: outliers no topo (>3x a mediana) são candidatos óbvios a revisão editorial. Cruzar com a drop-off da seção 2 — se uma questão tem tempo alto E drop-off alto, é ouro.

## 4. Playlist de replays pra investigar abandono

**Objetivo**: assistir usuários reais desistindo pra entender **por que**.

Passos:
1. Left sidebar → **Session replay** → **Playlists** → **+ New playlist**.
2. **Filters**:
   - Event: `exam_started` — no último 7 days
   - AND NOT event: `exam_finished` — no último 7 days (mesmo usuário)
3. (Alternativa mais direta): filtrar pelos replays de usuários que dispararam `exam_abandoned` nas últimas 48h.
4. Salvar como `Sessões de abandono — últimos 7 dias`.
5. Regra prática: assistir 10 replays → anotar padrões → 80% das hipóteses aparecem (tempo carregando, enunciado confuso, botão não óbvio, etc.).

## 5. Conversão marketing → app

**Objetivo** (projeto `maximize-landing`): medir quantos visitantes da landing chegam a se cadastrar no app.

Como os 2 projetos são separados, não dá pra fazer um funil nativo entre eles. Duas opções:

**Opção simples** — medir só o top-of-funnel na landing:
- Trends → `cta_clicked` com breakdown por `location`, pra saber se o CTA do header funciona mais no mobile ou desktop.

**Opção completa** — cross-project usando um `distinct_id` comum:
- Colocar um cookie na landing com um UUID, passar esse UUID no link "Acessar Plataforma", e chamar `posthog.identify(uuid)` no app antes do Clerk sign-up. Requer código extra — não fazer agora.

## 6. Dashboard consolidado

1. **Dashboards** → **+ New dashboard** → nome: `Abandono de provas`.
2. Adicionar os 4 insights criados acima (seções 1, 2, 3, e um link pra playlist).
3. Configurar como **"starred"** pra abrir primeiro ao entrar no PostHog.

## Alertas (opcional, mas útil)

1. No funil da seção 1, clicar em **Alerts** → **New alert**.
2. Condição: "conversão do passo final cair abaixo de X%" (X = atual - 10%).
3. Destino: email ou Slack.
4. Útil pra saber quando uma regressão de UX impactou abandono sem precisar checar manualmente.

## Depois disto

- Rodar por ~1 semana coletando dados.
- Revisar o dashboard e escolher 1 ou 2 hipóteses concretas pra melhorar UX/onboarding.
- Voltar pro repo pra implementar as mudanças.
