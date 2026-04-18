# Mobile UX/UI Redesign — abril de 2026

Plano detalhado para tornar o app React (`web-react/`) usável em celular. Hoje o app é desktop-first: sidebar fixa, diálogos MUI, filtros em autocompletes largos, player de questão que assume viewport ≥ 1024px. O PostHog mostrou volume considerável de tráfego mobile que não converte.

> Documentos relacionados:
> - `vibe-coding/2026-04-posthog-analytics.md` — instrumentação que originou essa investigação.
> - Protótipo estático navegável em `/mobile-preview` (rota pública, 10 telas em frames de celular).

---

## 1. Problema

### Evidências

- Tráfego mobile alto no PostHog mas **funil mobile desaba** no dashboard e no player de questão (validar números exatos com o dashboard PostHog antes de fechar a priorização).
- Layout atual assume mínimo 1024px: `SideBarV2` fixa de 52px à esquerda, `PageHero` com padding vertical de desktop, cards em grid 3–4 colunas.
- Dialogs MUI (`CreateExamDialog`, confirmações de delete) quebram em telas < 600px — form de 10 campos em modal sem scroll adequado.
- Filtros de `/exams` usam `Autocomplete` do MUI com `minWidth: 180px` cada, empilhando horizontalmente.
- Player (`ExamAttemptPlayer.tsx`) tem layout de 2 colunas (enunciado + alternativas) e tabs horizontais (Questão/Explicação/Estatísticas/Comentários/Histórico/Notas) que não cabem em 320px.

### Critério de sucesso

- Taxa de conclusão de prova no mobile atinge pelo menos 70% da taxa do desktop.
- Bounce rate em `/dashboard` no primeiro acesso mobile cai abaixo de 40%.
- Nenhuma rota principal com scroll horizontal em viewport de 360px.
- Lighthouse mobile ≥ 85 em `/dashboard`, `/exams`, player.

---

## 2. Approach escolhido

**Adaptive components com feature layer compartilhado** — URLs iguais em desktop e mobile, escolha de layout em tempo de render.

### Princípios

1. **`features/*` não muda.** Queries, services, stores, tipos, mutations — todo o negócio segue como está. Redesign é 100% na camada de apresentação.
2. **URLs são as mesmas.** Nada de `/m/*` ou subdomínio. Preserva SEO, deep-links, analytics unificado, share-de-prova entre dispositivos.
3. **Decisão por tela, não global.** Telas simples (sign-in, planos, account) viram responsivas com breakpoints Tailwind. Telas complexas (dashboard, player, treino) ganham **split físico**: `PageDesktop.tsx` + `PageMobile.tsx` + `Page.tsx` fino que escolhe via `useIsMobile()`.
4. **Mobile não herda complexidade do desktop.** Split permite bundle menor no mobile (ex.: não carregar `LineChart` do MUI X na dashboard mobile se usar mini-barras CSS).

### Opções descartadas e por quê

| Opção | Por que descartada |
|---|---|
| App mobile separado (`/m/*` ou subdomínio) | Duplica rotas, diverge com o tempo, funil de analytics dividido. |
| Só responsivo com breakpoints Tailwind | Força árvore dupla no mesmo componente (`hidden md:flex` / `block md:hidden`) — ilegível em telas com layout fundamentalmente diferente (player, dashboard). |
| Migração pra React Native / Expo | Fora de escopo — usuário em browser é suficiente e evita loja de apps. PWA na Fase 3 cobre "instalação". |

### Trade-off reconhecido

Split físico (`Dashboard.mobile.tsx`) **duplica JSX**. Aceita-se porque:

- Mantém cada variante legível isoladamente (um dev novo lê `DashboardMobile.tsx` e entende a tela mobile sem decifrar responsive breakpoints).
- Permite deletar ou reescrever uma variante sem tocar a outra (ex.: se um dia mobile virar um app nativo, a web mobile some sem impacto no desktop).
- Hooks de `features/*` compartilhados garantem que a fonte de verdade dos dados é uma só — a duplicação é só a árvore de JSX.

---

## 3. Arquitetura de suporte

### 3.1. Hook `useIsMobile`

```ts
// src/lib/useIsMobile.ts
import { useMediaQuery } from '@mui/material'
export function useIsMobile() {
  return useMediaQuery('(max-width: 767px)')
}
```

Breakpoint em **768px** (tailwind `md`). Abaixo disso é mobile, igual ou acima é desktop.

Por que MUI `useMediaQuery` e não `window.matchMedia` direto: o app já importa MUI em todo lugar, o hook já é SSR-safe (apesar de Vite SPA não precisar), e evita divergência com os breakpoints do tema MUI.

### 3.2. Primitivas mobile reutilizáveis

Novo diretório: `src/ui/mobile/`

| Componente | Responsabilidade |
|---|---|
| `MobileHeader.tsx` | Top bar com título, ícone de voltar opcional, ações à direita. Usado em telas internas (player, feedback, treino stages). |
| `BottomNav.tsx` | Bottom nav com 4–5 itens (Home, Exames, Treino, Histórico, Perfil). Aparece no `_authenticated` mobile. |
| `BottomSheet.tsx` | Wrapper em torno de `Drawer anchor="bottom"` do MUI. Substitui `Dialog` em formulários longos. |
| `MobileCard.tsx` | Variante compacta do `Card` existente — border-radius maior, padding menor, sem hover. |
| `PhoneSafeArea.tsx` | Aplica `env(safe-area-inset-*)` no topo e fundo pra evitar notch/home indicator iOS. |
| `ChipFilter.tsx` | Chips roláveis horizontais, substituem `Autocomplete` MUI em filtros mobile. |

### 3.3. Padrão de split

Para telas com split físico:

```
src/routes/_authenticated/dashboard.tsx      ← router entrypoint, usa useIsMobile
src/features/dashboard/DashboardDesktop.tsx  ← movida do antigo dashboard.tsx
src/features/dashboard/DashboardMobile.tsx   ← nova
```

O arquivo da rota vira um shim:

```tsx
export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})
function Dashboard() {
  const isMobile = useIsMobile()
  return isMobile ? <DashboardMobile /> : <DashboardDesktop />
}
```

A lógica de redirecionamento/onboarding, hooks de access, etc., fica em **ambas** as variantes — porque elas têm comportamentos diferentes (ex.: mobile mostra skeleton simplificado, desktop mostra 4 cards de stats). Se houver lógica de negócio pesada compartilhada, extrai pra `useDashboardState()` em `features/dashboard/hooks/`.

### 3.4. Layout raiz

`src/routes/_authenticated.tsx` hoje renderiza `SideBarV2` + conteúdo lado a lado. Novo:

```tsx
function RouteComponent() {
  const isMobile = useIsMobile()
  return (
    <div className="flex h-full bg-slate-100">
      {!isMobile && <SideBarV2 />}
      <div className="flex-1 min-h-0 overflow-auto flex flex-col bg-slate-50">
        <Outlet />
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}
```

`BottomNav` usa `position: fixed` + `PhoneSafeArea` pra respeitar o home indicator.

### 3.5. Analytics mobile

Adicionar super-property `is_mobile` ao PostHog no boot (checagem de `window.innerWidth` + user-agent). Permite segmentar TODOS os eventos existentes (`exam_started`, `question_answered`, etc.) por dispositivo sem criar eventos novos. Depois de cada fase, comparar funis mobile antes/depois.

---

## 4. Fase 1 — Fundação

**Objetivo:** criar a infraestrutura sem mudar nenhuma tela visualmente.

**Estimativa:** 1–2 dias.

### Entregáveis

1. **Hook `useIsMobile`** em `src/lib/useIsMobile.ts`. Testado com `vitest` + `@testing-library/react` simulando `matchMedia`.
2. **Primitivas** em `src/ui/mobile/` (6 arquivos listados em 3.2).
3. **`_authenticated.tsx` adaptado** — sidebar escondida no mobile, bottom nav aparece.
4. **`PageHero.tsx` responsivo** — padding e tamanho de fonte reduzem em `md:`.
5. **`index.html`**: meta viewport (`width=device-width, initial-scale=1, viewport-fit=cover`), `theme-color` cyan, `apple-mobile-web-app-capable`.
6. **`styles.css`**: CSS vars pra safe area insets.
7. **`is_mobile` super-property no PostHog** (instrumentação em `src/lib/analytics.ts`).

### Acceptance

- Em 360×640, a sidebar não aparece e o conteúdo ocupa 100% da largura.
- `BottomNav` aparece no mobile e some em ≥ 768px.
- Hook `useIsMobile` retorna `true` em viewport ≤ 767px, `false` ≥ 768px, e reage a resize.
- `PageHero` não quebra em 360px.

### Arquivos novos

- `src/lib/useIsMobile.ts`
- `src/lib/useIsMobile.test.ts`
- `src/ui/mobile/MobileHeader.tsx`
- `src/ui/mobile/BottomNav.tsx`
- `src/ui/mobile/BottomSheet.tsx`
- `src/ui/mobile/MobileCard.tsx`
- `src/ui/mobile/PhoneSafeArea.tsx`
- `src/ui/mobile/ChipFilter.tsx`
- `src/ui/mobile/index.ts` (barrel)

### Arquivos tocados

- `src/routes/_authenticated.tsx`
- `src/components/PageHero.tsx`
- `src/components/SideBarV2.tsx` (adicionar `hidden md:flex`)
- `index.html`
- `src/styles.css`
- `src/lib/analytics.ts`

---

## 5. Fase 2 — Tela por tela

Ordem definida por **impacto estimado no funil**. Cada item é um PR independente, mergeable em sequência.

| # | Tela | Approach | PR size | Justificativa de prioridade |
|---|---|---|---|---|
| 1 | Sign-in | Responsivo | S | Porta de entrada — melhorar aqui reduz bounce antes de qualquer outra tela. |
| 2 | Player de questão | Split | L | Maior tempo de engajamento; principal ponto de dor hoje. |
| 3 | Feedback da questão | Split | M | Acontece depois de cada resposta errada — alta frequência. |
| 4 | Dashboard | Split | M | Landing pós-login; primeira impressão do app. |
| 5 | Lista de Exams | Split | M | Descoberta — filtros precisam ser touch-friendly. |
| 6 | Treino (index) | Split | M | Hub de acesso às etapas. |
| 7 | Treino stages (diagnóstico, estudo, retentativa, final) | Split por stage | L | 4 telas relacionadas — pode ir em 4 PRs pequenos. |
| 8 | Planos | Responsivo | S | Simples; 3 cards empilham facilmente. |
| 9 | Account / Onboarding | Responsivo + BottomSheet pras tabs | S | Secundário; baixa frequência. |

### 5.1. Sign-in — responsivo

**Arquivos:** `src/routes/sign-in.tsx`, `src/routes/sign-up.tsx`, `src/components/AuthLayout.tsx`.

- `AuthLayout` já é razoavelmente responsivo; ajustar padding (`px-4` → `px-6 md:px-4`) e tipografia do footer.
- Clerk `<SignIn appearance={{ elements: { ... } }} />` aceita classes Tailwind pra ajustar altura de inputs e botões. Campo 48px mínimo em mobile.
- Decoração de fundo (blobs blur) pode ficar mais suave em mobile pra evitar distração.

**Acceptance:** em 360×640, campos de input ≥ 44px, botão CTA full-width, zero scroll horizontal.

### 5.2. Player de questão — split

**Maior PR da fase 2.** Componente central em `src/components/ExamAttemptPlayer.tsx` (~1000+ linhas, usado tanto no exame aberto quanto na retentativa de treino).

**Arquivos novos:**
- `src/components/ExamAttemptPlayerMobile.tsx`

**Arquivos tocados:**
- `src/components/ExamAttemptPlayer.tsx` → renomear conteúdo para `ExamAttemptPlayerDesktop` internamente OU deixar como está e criar wrapper.
- `src/components/ExamAttemptPlayerShell.tsx` (novo, decide via `useIsMobile`).

**Estrutura mobile (ver protótipo 4 em `/mobile-preview`):**
- Top bar fixo: botão X, título compacto, progresso "7 / 60" + barra, bookmark.
- Corpo rolável: pills de matéria/tópico, enunciado grande, alternativas como cards touch-friendly 48px+.
- Bottom bar fixa: `←` + "Próxima" full-width.
- Gesture: swipe-left/right pra navegar entre questões (nice-to-have, pode ficar pra Fase 3).

**Hooks compartilhados:** `useExamBaseAttemptQuery`, `useUpsertExamBaseAttemptAnswerMutation`, `useFinishExamBaseAttemptMutation` — consumidos nas duas variantes sem alteração.

**Admin features** (gerar explicação com IA, editar questão, deletar): **escondidos no mobile**. Admin em mobile é raro — se precisar, volta pro desktop.

**Acceptance:**
- Zero scroll horizontal em 360px.
- Bottom bar sempre visível com polegar alcançando "Próxima".
- Progresso de questão visível no topo sem rolar.
- Alternativa selecionada fica óbvia (ring cyan + bg).

### 5.3. Feedback da questão — split

**Arquivos novos:**
- `src/components/QuestionWithFeedbackDisplayMobile.tsx`

**Arquivos tocados:**
- `src/components/QuestionWithFeedbackDisplay.tsx` → wrapper que escolhe variante.

**Estrutura mobile (ver protótipo 7):**
- Top bar com "Você errou" ou "Você acertou" em cor semântica.
- Tabs roláveis horizontais (hoje são 6, mobile mostra só "Questão" e "Explicação" — resto "em breve" vira lista de items num bottom sheet).
- Banner verde no topo com alternativa correta em destaque.
- Cards de alternativas com cor semântica (verde/rosa/cinza) e seção "Explicação" separada.

### 5.4. Dashboard — split

**Arquivos novos:**
- `src/features/dashboard/DashboardMobile.tsx`
- `src/features/dashboard/hooks/useDashboardState.ts` (extrai lógica de access/onboarding/quota compartilhada)

**Arquivos tocados:**
- `src/routes/_authenticated/dashboard.tsx` → vira shim de 10 linhas.
- Mover o conteúdo atual pra `src/features/dashboard/DashboardDesktop.tsx`.

**Decisões pro mobile:**
- **Não carregar `@mui/x-charts/LineChart`** no mobile — substituir por mini-barras CSS (ver protótipo 2). Economia de ~50kb no bundle mobile.
- Stats strip horizontal no header cyan (não 3 cards separados).
- "Ações rápidas" em grid 2×2 em vez de 1×4.
- "Continuar exame" vira um banner horizontal com seta no canto direito.
- "Treinos em andamento" aparece como lista vertical (não grid).

### 5.5. Lista de Exams — split

**Arquivos novos:**
- `src/features/exams/ExamsListMobile.tsx`

**Arquivos tocados:**
- `src/routes/_authenticated/exams/index.tsx` → shim.
- Mover conteúdo atual pra `src/features/exams/ExamsListDesktop.tsx`.

**Decisões pro mobile:**
- Hero compacto (só KPIs inline, sem `PageHero` verbose).
- Busca no topo sempre visível (sticky).
- Filtros viram `<ChipFilter>` horizontais ou abrem um `<BottomSheet>` com estado/cidade/banca combinados — evita 3 autocompletes empilhados.
- `ExamRow` compacto: score badge à esquerda, título + banca/data, pill de escopo. Esconde stats de admin.

### 5.6. Treino index — split

**Arquivos novos:** `src/features/training/TreinoIndexMobile.tsx`.
Estrutura do protótipo 5: KPI strip, CTA criar novo, stepper horizontal de "como funciona", lista "Em andamento" compacta, lista "Concluídos" com antes→depois.

### 5.7. Treino stages (diagnóstico, estudo, retentativa, final)

Cada stage é um PR próprio. Padrão:
- `src/features/training/stages/DiagnosticoMobile.tsx`
- `src/features/training/stages/EstudoMobile.tsx`
- `src/features/training/stages/RetentativaMobile.tsx` (essencialmente reusa `ExamAttemptPlayerMobile`)
- `src/features/training/stages/FinalMobile.tsx`

Estrutura vem dos protótipos 8, 9, 10.

**Observação:** `TreinoStepper` (horizontal, usado nas rotas de stage pra mostrar "onde está") precisa de variante mobile — stepper horizontal rolável com só 3 stages visíveis (anterior/atual/próxima).

### 5.8. Planos — responsivo

Simples: toggle mensal/anual no topo, grid `grid-cols-1 md:grid-cols-3`. Tabela comparativa ("Por que o Itera?") ganha scroll horizontal em mobile com sticky na primeira coluna.

### 5.9. Account / Onboarding — responsivo

- Account tem tabs (`perfil`, `assinatura`, `notificações`?) — no mobile viram accordion ou lista de items que abrem em `BottomSheet`.
- Onboarding é linear, só precisa ajustar padding e tipografia.

---

## 6. Fase 3 — Polimento

Executa depois que Fase 2 estiver estável. Cada item é opcional e independente.

### 6.1. Safe-area insets

Já incluído na Fase 1 via `PhoneSafeArea`, mas revisar em cada tela — especialmente player e bottom nav — após Fase 2.

### 6.2. Gestos

- Swipe-left/right no player pra navegar entre questões.
- Pull-to-refresh nas listas (exams, treino, histórico).

**Não priorizar.** Swipes são esperados em apps nativos, web-app tolera bem os botões.

### 6.3. Analytics de validação

Criar um dashboard no PostHog:
- **Funil mobile antes vs depois** por tela.
- **Tempo por questão** segmentado por `is_mobile`.
- **Taxa de abandono** por questão mobile vs desktop.

Usar esse dashboard pra decidir se alguma tela precisa iteração adicional.

---

## 7. Decisões tomadas (perguntas em aberto resolvidas)

1. **PostHog funnel data:** não disponível no momento da decisão. Consequência: mantém ordem default da Fase 2 (sign-in → player → feedback → ...). Se durante a Fase 1 alguém tiver tempo de abrir o dashboard e ajustar a prioridade, melhor — senão seguimos.

2. **Usuários ativos no player hoje:** 7 usuários totais, todos com sessão única (entraram e não voltaram). Isso dá liberdade pra refatorar sem medo de quebrar sessão em andamento. **Decisão:** seguimos com split físico mesmo assim — custo de implementação é baixo e o código fica mais limpo que responsivo unificado.

3. **PWA:** fora do escopo. Fase 3.1 removida.

4. **MUI vs Tailwind:** manter híbrido. **Regra:** código mobile-novo não usa MUI — só HTML + Tailwind. Código existente (Clerk, Autocomplete, Dialog desktop) continua com MUI. Motivos:
   - Migrar MUI inteiro é outro projeto, não pode virar caudal desse.
   - MUI está integrado em Clerk (`@clerk/themes`), arrancar custa semanas.
   - Código mobile sem MUI = bundle menor, touch targets controlados, já no estilo do protótipo.
   - Abre caminho natural pra migração futura se quisermos: mobile já está fora do MUI.

---

## 8. Non-goals

Itens **fora** desse plano, pra evitar escopo crescendo:

- **App nativo (iOS/Android)** — PWA cobre "instalação" sem loja.
- **Modo offline completo** — provas exigem backend.
- **Redesign visual geral** — manter identidade (cyan/sky, violet pra exams, emerald pra treino). O trabalho é de layout/ergonomia, não rebranding.
- **Refatoração de `features/*`** — queries, services, stores ficam como estão.
- **Migração pra server components** — Vite SPA segue SPA.
- **Dark mode mobile** — separado.
- **Acessibilidade auditoria completa** — básico vai junto (labels, foco, contraste), auditoria formal é outro track.

---

## 9. Rollout e validação

### 9.1. Feature flags

Usar flags do PostHog pra liberar cada tela gradualmente:

- `mobile_player_v2` — 10% dos usuários mobile → 50% → 100% ao longo de 1 semana.
- `mobile_dashboard_v2` — mesmo padrão.
- etc.

Flag por tela permite reverter sem deploy se alguma variante tiver bug.

### 9.2. Métricas de go/no-go por tela

Antes de ir de 50% → 100% numa tela, validar no PostHog:

- Conclusão da jornada naquela tela mantida ou melhorada.
- Tempo médio não explodiu (às vezes UX melhor = usuário passa mais tempo lendo).
- Zero aumento de `$exception` eventos (frontend crashes).

### 9.3. Ordem de merge

Cada PR da Fase 2 segue:

1. Deploy com flag em 0%.
2. Habilita pra `@maximilian` e 2–3 testers.
3. Abre pra 10% mobile.
4. Valida métricas por 48h.
5. 50% → 100% se OK.

### 9.4. Reversão

Se uma tela mobile estiver performando pior que a desktop:

- Desliga a flag → volta automaticamente pro layout responsivo simples (ou desktop forçado).
- Abre investigação no PostHog antes de deletar o código — às vezes é só um bug específico de um dispositivo.

---

## 10. Estimativa total

| Fase | Duração | PRs |
|---|---|---|
| Fase 1 — Fundação | 1–2 dias | 1–2 PRs |
| Fase 2 — Telas | 2–3 semanas | 9 PRs |
| Fase 3 — Polimento | 0.5–1 dia | 1–2 PRs |
| **Total** | **~3 semanas calendário** | **~12 PRs** |

Fase 2 pode ser paralelizada se houver mais de um dev; senão segue em série na ordem do item 5.

---

## 11. Critério de "pronto"

Projeto considerado concluído quando:

- Todas as 9 telas da Fase 2 estão em 100% no PostHog.
- Funil mobile atinge critério de sucesso (item 1) por 2 semanas consecutivas.
- Lighthouse mobile ≥ 85 nas 3 rotas principais.
- Nenhum bug crítico mobile em aberto há mais de 7 dias.

Documentar aprendizados aqui mesmo em uma seção "12. O que aprendemos" ao final do projeto.
