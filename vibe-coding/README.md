# Vibe Coding — Registro de Sessões

Pasta para documentar mudanças construídas em sessões colaborativas com IA. Cada arquivo cobre uma funcionalidade ponta-a-ponta: o problema, a solução, como funciona e os arquivos tocados.

## Objetivo

Criar uma trilha de pão para:
- Rever decisões tomadas sem ter que reler commits um a um.
- Dar contexto a quem não acompanhou a sessão (você mesmo daqui a 3 meses, novos devs, IA em chats futuros).
- Facilitar a reversão seletiva de decisões quando uma delas envelhecer mal.

## Convenção de nomes

`YYYY-MM-<slug>.md` — assim ficam ordenados cronologicamente. Ex.: `2026-04-posthog-analytics.md`.

## Índice

- [2026-04 — PostHog Analytics](./2026-04-posthog-analytics.md) — instrumentação de product analytics (funis, session replay, LGPD) para investigar abandono de provas.
- [2026-04 — Mobile Redesign](./2026-04-mobile-redesign.md) — plano para tornar o `web-react/` usável em celular: adaptive components, split físico desktop/mobile, rollout por PostHog flags.
- [2026-05 — Diagnóstico Edital](./2026-05-diagnostico-edital.md) — captura de leads via questionário na LP `/lp/edital` com infra genérica de leads (perfil + tags + events) reusável por LPs futuras.
- [2026-05 — Scraping PCI Concursos](./2026-05-scraping-pci.md) — scraping do acervo PCI Concursos para catalogar provas de enfermagem, com scoring de prioridade e promoção para o pipeline de processamento existente.
- [2026-06 — Testes + a11y das páginas de concurso](./2026-06-concurso-testes-a11y.md) — harness de teste de rotas do `web-react/` (router em memória + fetch mockado), passe de axe/contraste/teclado nas páginas de concurso e cargo (MAX-26).
- [2026-06 — Limpeza e lançamento da página de concurso](./2026-06-pagina-concurso.md) — fechamento do épico MAX-11: remoção do mockup de preview, drop da coluna deprecada `registrationDate` (janela `registrationStart`/`registrationEnd`) e atualização das docs (MAX-27).
- [2026-07 — Redesign da aba Treino do cargo](./2026-07-treino-cargo-redesign.md) — mesa do treinador (1 card de ação + lista), shell por níveis sem breadcrumb (`BackSquare` + subtítulo do pai), prova/re-tentativa embutidas na página (player lazy) e view transitions por estado (título da prova/ponto sobe do card ao header).
- [2026-07 — Design da remodelagem Cargo↔Prova (R3.1)](./2026-07-remodelagem-cargo-prova-design.md) — modelo alvo Concurso→Cargo→CargoProva→ExamBase (M:N), mapa de campos que migram/ficam, invariantes (1 oficial por cargo via unique parcial), backfill e estratégia de contrato estável. **Aprovado e implementado.**
- [2026-07 — Remodelagem Cargo↔Prova: implementação + produção](./2026-07-remodelagem-cargo-prova.md) — execução completa do TAREFAS-PRODUCAO.md: integridade do lazy-link, sessão/cota idempotente, schema+backfill, serviço de Cargo, reads com contrato estável (self-heal de leitura), admin UI de vínculos, navegação só Home+Concursos, Fase 5 de UX e runbook de deploy.
- [2026-08 — Perfil de preferências + recomendação](./2026-08-preferencias-recomendacao.md) — `UserPreference` (escopo de busca por raio/UF/Brasil), match por tempo de viagem estimado, gate wizard em `/concursos` e partição "Recomendados para você".
- [2026-08 — Home "Mesa do dia" + metas](./2026-08-home-mesa-do-dia.md) — reescrita da home em torno da meta (`UserGoal`): herói com prontidão vs corte + countdown + retomada em 1 clique, metas secundárias, "Sua semana", evolução compacta (gráficos completos em `/evolucao`) e recomendados; ciclo definir/parar de treinar.
