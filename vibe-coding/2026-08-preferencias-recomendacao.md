# Perfil de preferências + concursos recomendados

**Data:** 2026-08-03 · **Branch:** `feature/preferencias-recomendacao`

## O quê

A listagem `/concursos` (nível 0) agora se organiza em volta do usuário: um
perfil curto (4 perguntas, ~30s) alimenta a seção **"Recomendados para você"**
no topo da aba ativa, com chips explicando o porquê de cada match. Nada é
escondido — o resto fica em "Outros concursos".

## Decisões de produto (fechadas em conversa)

1. **Campos coletados:** localização (UF + cidade + mobilidade como **tempo de
   viagem**: até 30 min / 1h / 2h / topo me mudar), momento de carreira
   (estudante / recém-formado / registro COREN), salário mínimo aceitável
   (opcional) e horizonte (prova o quanto antes / preparando 1–2 anos).
   Descartados nas iterações: esfera de preferência (consequência de
   lugar+salário, não causa), especialidade (prematuro) e banca (inferível do
   treino). A mobilidade por divisão administrativa (cidade/estado) foi
   substituída por tempo de deslocamento a pedido do usuário — é como o
   enfermeiro pensa de verdade.
2. **Gate obrigatório:** primeira visita a `/concursos` sem perfil → o form
   ocupa o lugar da lista; não vê a lista sem preencher. Editável depois
   (barra de chips + "Editar" em Dialog). Admin passa pelo mesmo fluxo.
3. **Exibição em seções** (não filtro duro, não só reordenar): match salta aos
   olhos, mas nenhuma oportunidade some.

## Arquitetura

- **Matching no backend** (source of truth): `concurso-match.ts` (função pura,
  padrão `concurso-status.ts`). `listConcursos` anota `match` após o merge dos
  dois blocos (agregado ExamBase + prova-less Concurso) — 1 query de perfil,
  só quando logado. Reasons são códigos; o front só traduz.
- **Regras v1:** localização por tempo de viagem estimado —
  `api/src/geo/city-distance.ts`: centroides dos ~5.570 municípios IBGE
  (`municipios.json`, gerado por `api/scripts/build-municipios.mjs` a partir
  do dataset público kelvins/municipios-brasileiros) + haversine × fator de
  estrada 1.3 ÷ 70 km/h. Mesma cidade = CITY (sem geocodificar); dentro do
  orçamento = NEARBY + `travelMinutes` no payload (chip "A ~40 min de você");
  **não-geocodificável sob orçamento = não recomenda** (decisão do usuário:
  conservador, recomendação sempre justificada). Nacional (sem UF ou FEDERAL)
  casa com todo mundo; salário desconhecido é neutro; `past` nunca recomenda;
  ASAP → `open`, LONG_TERM → `open|future`. **`careerStage` não filtra** —
  guardado para copy/elegibilidade futuras. Não é rota real (Google Distance
  Matrix foi descartado: custo/quota); a copy diz "~" para ser honesta.
- **`GET/PUT /preferences`** (`api/src/preference/`, espelha o training
  module): PUT = upsert de documento completo, escopo implícito no token.
- **Front:** feature `web-react/src/features/preference/` (types, service,
  queries `['auth','preferences']`, `PreferenceWizard`/`Form`/`Gate`/`Bar`,
  `preference-options.ts`, `match-copy.ts`). Gate in-page (sem beforeLoad),
  **fail-open** em erro da query. Seções por partição client-side do
  `displayed`; paginação sobre o concatenado.
- **Gate = wizard pergunta-a-pergunta** (iteração de UX a pedido do usuário —
  "algo mais dinâmico, item por item"): 5 telas curtas com progresso cyan
  (momentum visível), opções em linhas grandes com auto-avanço ao
  escolher (pausa de 220ms p/ a seleção assentar; instantâneo sob
  reduced-motion), Voltar livre e foco no título a cada tela (leitores de
  tela acompanham). O **dialog de edição continua all-at-once**
  (`PreferenceForm`) — editar um campo não deve exigir 5 passos; o
  vocabulário de opções é compartilhado.
- **3ª iteração ("está pouco profissional") → tela cheia focada:** o card
  `max-w-2xl` com ícone sparkles embaixo do header "Concursos" parecia um
  widget perdido — chrome de uma lista que o usuário nem podia ver. Direção
  escolhida via AskUserQuestion (mockups ASCII: takeover × painel dividido ×
  card refinado): **takeover**. A rota faz early-return com root `flex-1` (sem
  header/filtros), o `PreferenceGate` vira só um `m-auto max-w-xl` e o wizard
  assume o palco: pergunta como herói (`text-3xl` + `text-wrap: balance`),
  progresso **segmentado** (1 traço por pergunta), opções maiores
  (`px-5 py-4 text-base`), CTAs alinhados à esquerda. Casa com o padrão
  full-page que o treino já estabeleceu no app.
- **Escopo de busca explícito (cidade+raio / estado / Brasil):** o usuário
  apontou o atrito "escolher cidade e depois responder 'topo qualquer lugar do
  Brasil'" — a cidade virava resposta morta. A 1ª pergunta do wizard agora é
  o **escopo** ("Onde você busca concursos?") e a trilha se ramifica: cidade →
  âncora + raio (6 telas); estado inteiro → só UF (5, `StateCitySelect`
  `hideCity`); Brasil todo → pula direto (4). No modelo, `mobility` ganhou
  `STATE` e `state`/`city` viraram nullable (migration
  `preference_search_scope`); DTO com `ValidateIf` + normalização no service
  (ANYWHERE zera a âncora, STATE zera a cidade). Matching: STATE = mesma UF
  (reason novo `STATE`); ANYWHERE passa tudo **sem** chip de proximidade (não
  há mais âncora). Form de edição ramifica igual; `PreferenceBar` resume o
  escopo ("Campinas/SP · até 1h" / "SP inteiro" / "Brasil todo").
- **Cidade = âncora da busca, não residência:** cenário levantado pelo usuário
  (mora em Recife, planeja se mudar para Jundiaí e busca concursos na
  redondeza de lá). Direção escolhida via AskUserQuestion: **reenquadrar a
  pergunta** ("Em volta de qual cidade você busca concursos?" + hint "onde
  mora — ou para onde planeja se mudar") em vez de segunda cidade-alvo no
  schema — zero mudança de matching/API; quem quer as duas regiões ao mesmo
  tempo escolhe uma (limitação aceita na v1; a evolução óbvia é a
  cidade-alvo opcional com match de 2 âncoras).

## Casos-limite aceitos na v1

- Concurso sem UF → nacional (pode inflar recomendados; monitorar).
- AutoTab inalterado: LONG_TERM com único recomendado `future` cai em
  "Abertas" por default — evolução óbvia é o autoTab preferir a aba com
  recomendados.
- `documentsCheckedAt`-style caveat: cidade é texto livre; comparação
  normalizada (acentos/caixa), divergência degrada para "Outros".

## Testes

- Unit: `concurso-match.spec.ts` (mobilidades, nacional, salário neutro,
  horizonte×status, normalização, reasons exatos) + `preference.service.spec.ts`.
- E2E: `preference.e2e-spec.ts` (401/GET null/upsert/400s) + casos de match em
  `concurso.e2e-spec.ts` (anônimo/sem perfil → null; com perfil; prova-less).
- Web: `concursos-preferences.test.tsx` (gate, destravar preenchendo, seções +
  chips, fail-open, dialog de edição, axe) + `preference-form.test.tsx`
  (isolado, Autocomplete IBGE mockado). `mockList` existente ganhou o handler
  `/preferences` preenchido.
