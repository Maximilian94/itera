# 2026-08 — Home "Mesa do dia" + metas (UserGoal)

## Problema

A home (`/dashboard`) respondia as perguntas erradas: o topo era ocupado pela
cota de assinatura (métrica do negócio) e dois LineCharts que exigiam
interpretação, enquanto as duas coisas que o aluno vem buscar — "onde eu parei"
e "estou perto de passar" — ficavam no fundo da página ("Treinos em andamento"
era o 4º bloco; "Exame em andamento" era o último). Além disso, não existia o
conceito de **meta**: o vínculo usuário↔concurso era implícito na sessão de
treino, que é efêmera (5 fases e acaba), enquanto a meta ("passar em Niterói")
dura meses.

## Decisões de produto (fechadas na conversa)

1. **Herói = "o que eu faço agora?"** — retomar/começar treino em 1 clique,
   com prontidão vs corte e countdown ao redor. Uma meta em destaque
   (o caso comum é 1 concurso por vez); as demais viram linhas compactas.
2. **Regra do dono da informação:** nenhum aviso flutua solto — aviso do SEU
   concurso mora no bloco da meta; prazo de recomendado mora no card dele em
   Recomendados. (A seção "Fique de olho" do 1º protótipo foi morta por isso.)
3. **Meta explícita e gratuita:** "Definir como meta" não gasta cota; a cota é
   gasta só no "Começar treino". "Parar de treinar" arquiva (reversível).
   Sem limite de metas simultâneas — a cota de treinos já é o freio.
4. **Descoberta sempre presente, secundária:** "Recomendados para você" no fim
   da home (exclui o que já é meta); vira herói para quem está sem meta.

Protótipo com os 4 estados (treinando / 2 metas / meta sem treino / sem meta):
`web-react/design-mockups/home-mesa-do-dia.html`.

## Como funciona

### Backend

- **Model `UserGoal`** (`userId`+`cargoId` únicos, `archivedAt`): criado
  explicitamente (`POST /goals`), implicitamente ao começar treino
  (`TrainingService.create` → `GoalService.ensureForExamBase`, nunca falha o
  treino) e por **backfill lazy** no `GET /goals` (treino ativo sem meta →
  cria; cargo com linha arquivada NÃO ressuscita — arquivar é decisão do
  usuário). `DELETE /goals/:id` arquiva; `POST` de novo desarquiva a mesma
  linha.
- **Payload** (`api/src/goal/goal.service.ts#GoalPayload`): concurso, cargo
  (com `minPassingGrade` numérico), `examDate` (oficial → 1ª prova →
  concurso), `provaExamBaseIds` (chave de join com `GET /training` no front) e
  `stats` (tentativas finalizadas + melhor nota nas provas do cargo).
- `POST /goals { cargoSlug }` resolve identidade com os mesmos fallbacks da
  página do cargo: `Cargo.slug` | `Cargo.id` | `ExamBase.slug` | `ExamBase.id`.

### Frontend

- `features/goal/`: types/service/queries + `GoalToggle` (chip no header da
  página do cargo: "Definir como meta" ↔ "Sua meta ▾ → Parar de treinar").
- `features/home/`: `home-logic.ts` (puro e testado: join metas×treinos e
  eleição do herói, countdown, "Sua semana", resumo de evolução) +
  componentes (`GoalHero`, `SecondaryGoalRow`, `NoGoalHero`, `WeekCard`,
  `EvolutionCard`, `RecommendedList`).
- `dashboard.tsx` reescrito (uma árvore responsiva, sem split mobile):
  saudação → exame avulso em andamento (se houver) → herói da meta
  (countdown, `ReadinessBar` valor=melhor nota × corte, faixa de retomada com
  a fase do treino OU "Primeiro passo · Diagnóstico", cota como linha
  discreta, menu ⋯ com "Parar de treinar") → outras metas → Sua semana +
  Evolução → Recomendados. Cota esgotada sem treino ativo → CTA vira "Fazer
  upgrade" (portal Stripe).
- **`/evolucao` (rota nova):** os dois LineCharts completos da home antiga
  moraram para cá; a home ficou com sparkline + frase interpretada.

### Testes

- `api/test/goal.e2e-spec.ts` (10 casos: auth, resolução, idempotência,
  arquivar/desarquivar, stats, backfill) + mock de `GoalService` no
  `training.service.spec.ts`.
- `features/home/__tests__/`: unit da lógica + teste de página (harness do
  concurso reaproveitado; Clerk mockado via `vi.mock('@/auth/clerk')`).
- **Infra:** `src/test-setup.ts` global (`asyncUtilTimeout: 5000`) — o default
  de 1s do `findBy*` estourava de forma intermitente quando a suíte cheia
  roda em paralelo (flake pré-existente, reproduzido na árvore limpa).

## Fora do escopo (follow-ups)

- Aviso "Novo no edital" (retificação) dentro do bloco da meta — precisa de
  rastreio de leitura por usuário; o protótipo mostra a direção.
- Aviso "inscrições fecham em N dias" como chip âmbar no card recomendado
  (o dado existe na timeline; falta emitir no card da home).
- Copy de primeira vez no estado sem meta (hoje reusa o convite genérico).
