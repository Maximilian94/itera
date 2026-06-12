# 2026-06 — Testes Vitest + passe de acessibilidade nas páginas de concurso (MAX-26)

Fechamento de qualidade da Fase 2 do épico MAX-11: cobertura de testes das páginas
de concurso (nível 1) e cargo (nível 2) no `web-react/`, mais um passe de
acessibilidade (axe + contraste + teclado + reduced-motion).

## O que foi feito

### Harness de teste de páginas (novidade no repo)

Até aqui só havia testes de componentes puros. Para testar as **rotas reais** sem
Clerk nem backend, nasceu `src/features/concurso/__tests__/page-test-utils.tsx`:

- **Router**: as rotas de arquivo (`createFileRoute`) são re-parentadas num
  `createRootRoute()` de teste com `Route.update({ getParentRoute })` — exatamente
  a mesma técnica que o `routeTree.gen.ts` usa. Isso pula o layout
  `_authenticated` (que exige Clerk) e roda com `createMemoryHistory`.
  Destinos de `Link`/`navigate` (`/exams`, `/treino`, `/planos`…) entram como stubs.
- **Rede**: mock do `fetch` global por pathname ("MSW sem MSW"). Como **todos** os
  services passam por `apiFetch` (`@/lib/api`), esse é o único choke point —
  payloads JSON por rota, `'pending'` para testar loading, status para 404/500.
- **Axe**: `expectNoSeriousAxeViolations()` roda `axe-core` direto no container e
  falha com violações `serious`/`critical`. `color-contrast` fica desabilitado
  (jsdom não renderiza) e é coberto por um teste de tokens.

### Testes novos (57 no total, todos verdes)

- `concurso-page.test.tsx` (nível 1): payload mockado → cards/ficha/pill;
  estados loading (skeleton com `role=status`), 404, erro de rede com retry,
  concurso sem cargos; cargo sem prova treinável não vira botão; axe.
- `cargo-page.test.tsx` (nível 2): matriz {past, future} × {com/sem tentativas} —
  CTA primário muda (`Treinar com esta prova` / `Fazer primeiro simulado` /
  `Continuar treino` / link `/treino` sem alvo), programático só em future,
  distribuição fato × preditiva (títulos/verbos), prontidão acima/abaixo do corte,
  `studyPlan.currentStep` controla etapa destacada + CTA da etapa
  (diagnostico/treino_dirigido/reta_final), 404, axe nos dois enquadramentos.
- `components.test.tsx` ampliado: StatusPill nos 3 estados + `motion-reduce`,
  fronteiras dos chips de acerto (70→emerald, 69→amber, 60→amber, 59→rose),
  ReadinessBar abaixo do corte, insight degradando sem tentativas.
- `contrast.test.ts`: contraste WCAG dos pares de token usados nas páginas
  (culori `wcagContrast` + `tailwindcss/colors`) — trava regressão de contraste
  sem depender de renderização real.

### Correções de acessibilidade que os testes encontraram

1. **FichaCard**: o grupo `dl > div` tinha um `<span>` (ícone) irmão de `dt/dd` —
   violação axe `definition-list`/`dlitem`. O ícone foi para dentro do `dt`
   (absoluto na coluna do `pl-11`), visual idêntico.
2. **Contraste**: rótulos pequenos `text-emerald-600` ("Acima do corte", score sm)
   tinham ~3.6:1 sobre branco/slate-50 → trocados por `emerald-700` (≥5:1).
   O score 4xl continua `emerald-600` (texto grande, exige só 3:1).
3. **Teclado**: `summary` do conteúdo programático ganhou
   `focus-visible:ring` (só tinha estilo de hover).

### Achado documentado (não corrigido)

CTA primário branco sobre `cyan-600` = **3.67:1** — abaixo de 4.5:1 para
`text-sm`. É o acento de marca (Momentum Cyan, DESIGN.md) usado no app inteiro;
mudar é decisão de design (ex.: `bg-cyan-700` em CTAs de texto pequeno), não cabe
neste ticket. Fica o registro para um passe futuro de design.

## Decisões que envelhecem

- Testes de página ficam em `src/features/concurso/__tests__/` e **não** em
  `src/routes/` — o gerador do TanStack Router escaneia `routes/` e trataria
  testes como rotas.
- Mock no `fetch` global (e não `vi.mock` de services) para não acoplar os testes
  à fatoração interna dos services; se algum dia o app sair do `apiFetch`, migrar
  para MSW de verdade.
- `axe-core` direto em vez de `vitest-axe` (menos uma dependência de compat).
