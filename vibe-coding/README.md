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
