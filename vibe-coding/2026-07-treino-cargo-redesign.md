# 2026-07 — Redesign da aba Treino do cargo (mesa do treinador + shell por níveis)

Sessão de design/implementação guiada pelo skill `/impeccable` sobre a rota
`/concursos/$concursoSlug/$cargoSlug` (aba Treino) e o shell de navegação da
jornada de concursos inteira. Sem mudanças de API.

## Problema

A aba Treino listava opções sem decidir por ninguém (grid de cards idênticos,
prontidão só na oficial), o caminho até treinar era longo (quase metade da
página era header/breadcrumb empilhado), responder a prova jogava o usuário
para `/treino/...` (outro shell, contexto perdido) e vários componentes
violavam o próprio DESIGN.md (side-stripes, gradientes decorativos, dots de
carrossel).

## Solução

1. **Mesa do treinador** (`ProvasBoard`): 1 card de ação + lista. `GoalCard`
   compacto (meta + prontidão vs corte inline + delta), `pickRecommendation`
   eleva UMA prova à faixa "Treine agora" (sessão em andamento > oficial com
   questões > nunca treinada) com motivo em copy de coach; o resto vira lista
   ranqueada em linhas com chips de motivo (`badge`). Prova futura não ganha
   card: o aviso vira nota dentro do "Treine agora".
2. **Shell por níveis, sem breadcrumb**: cada nível tem header
   `[BackSquare] subtítulo do pai / título do nível` — concurso → cargo →
   treino → ponto de estudo. `BackSquare` ocupa o lugar da `InstitutionMark` e
   herda o `view-transition-name: institution-mark`. Aba default inteligente
   (Treino quando há sessão em andamento); abas somem durante o treino.
3. **Prova/re-tentativa embutidas** (`EmbeddedPlayer.tsx`): `ExamAttemptPlayer`
   lazy-loaded dentro da página, cadeia `flex-1/min-h-0` +
   `has-[[data-exam-player]]` para altura de app. `useProgramActions.start`
   não navega mais. Rotas `/treino/$trainingId/*` continuam para links diretos.
4. **Transições por estado** (`withViewTransition` em `motion.ts`:
   `startViewTransition` + `flushSync`): `prova-title` (título da prova sobe do
   card ao h1), `study-item-title` (ponto de estudo → header), `treino-stepper`
   (cheio↔compacto), subtítulo composto herdando `concurso-heading` +
   `cargo-heading`. Fallback sem animação + `prefers-reduced-motion`.
5. **Consertos de design system**: banner do diagnóstico sólido semântico,
   feedbacks de IA sem border-left stripe, `Navigator` sem dots de carrossel,
   pisos de contraste (slate-400→500/600), fases sem header duplicado
   (`PhaseHeader` dentro do card).
6. **Fix real de dados**: `useUpdateTrainingStageMutation` agora invalida
   `GET /training` (o stepper ficava com estágio defasado ao avançar de fase).

## Decisões de produto (confirmadas na sessão)

- Repensar a experiência (não só polir) — mesa do treinador com ação única.
- Aba default inteligente (Treino com sessão ativa; Detalhes preserva o morph
  da ficha na 1ª visita).
- Responder prova/re-tentativa na própria página do cargo.
- Sem pager entre pontos de estudo (confundia o contexto da matéria; a lista
  agrupada é quem navega).
- Chip "treinando" + subtítulo "Concurso X · Cargo" comunicam treinar com
  prova de outro concurso sem frase explicativa.

## Follow-ups conhecidos

- Mobile: bottom nav segue visível durante a prova embutida (o `hideBottomNav`
  do layout só cobre paths `/treino`).
- Validação visual do player embutido (altura/mobile) é manual — sem teste
  automatizado desse embed.

## Arquivos principais

- `web-react/src/features/concurso/components/treino/` — `ProvasBoard`,
  `TrainingFlow`, `StepperBar`, `StudyItemFocus` (+`StudyFocusHeader`),
  `embeds`, `EmbeddedPlayer` (novo), `useProgramActions`.
- `web-react/src/features/concurso/components/` — `BackSquare` (novo),
  `motion.ts` (`withViewTransition`).
- `web-react/src/routes/_authenticated/concursos/$concursoSlug/` —
  `$cargoSlug.tsx` (orquestra níveis/headers), `index.tsx` (header nível 1).
- `web-react/src/features/training/queries/training.queries.ts`,
  `web-react/src/styles.css`, testes em `cargo-page.test.tsx`.
