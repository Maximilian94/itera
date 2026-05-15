# Diagnóstico Edital — maio de 2026

Funil de captura de leads pré-pagamento via diagnóstico de **comportamento de estudo** (não de conhecimento técnico). LPs (`/lp/edital`, futuras `/lp/plantao`) redirecionam pra um wizard standalone estilo Typeform em `/diagnostico`. Resultado é entregue na tela + por email transacional. Infraestrutura de leads (perfil + tags + events) reusável; instrumentação completa pra paid marketing no Meta (Pixel + CAPI deduplicados).

> **Status: planejamento.** Implementação ainda não iniciada. Doc é a especificação acordada e será atualizado conforme construção.
>
> Documentos relacionados:
> - `vibe-coding/2026-04-posthog-analytics.md` — taxonomia PostHog na qual este feature se encaixa.
> - `nextjs-maximize-enfermagem/src/components/lp/edital/Frustracao.tsx` — primeira seção da LP.
> - `nextjs-maximize-enfermagem/src/lib/analytics.ts` — singleton PostHog com opt-in por consent (LGPD), modelo a estender pro Meta Pixel.

---

## 1. Resumo executivo

**O que é:** wizard estilo Typeform em `/diagnostico` que mede comportamento de estudo da pessoa (10 perguntas A/B/C/D, ~3 min) e retorna um perfil personalizado em uma de 4 categorias (Sobrecarregado / Esforçado Sem Direção / Em Evolução / Estratégico) com scores secundários, pontos fortes/atenção e CTA pro método Maximize. LPs (`/lp/edital` etc.) chamam o wizard via CTA — não embedam.

**Por que existe:** hoje a LP não captura leads. Sem lista, não dá pra fazer follow-up por email, nem testar variações de LP de forma honesta, nem entender perfil de quem chega. O diagnóstico entrega valor real ao visitante (justifica deixar email) e começa uma lista segmentável.

**Como funciona em uma frase:** wizard frontend é dono das 10 perguntas + scoring + UI; backend (NestJS+Prisma existente) recebe payload, persiste lead, dispara email com resultado e push pro Meta; tudo gated por consent LGPD.

**Decisões mais importantes:**
1. **Wizard separado da LP** — vive em `/diagnostico` com UI dedicada (Typeform-like). LP só converte e redireciona. Reusável por qualquer LP futura.
2. **Lead capturado ANTES da qualificação** — depois das 10 perguntas e da tela "analisando", pede nome/email; lead criado nesse ponto (com email já dispara). Qualificação é segundo step (atualiza lead). Se a pessoa abandonar a qualificação, ainda é lead válido.
3. **Lead × User separados** — User é pagante (Clerk/Stripe); Lead é pré-conversão. Linkam por email no momento da compra.
4. **Frontend computa o `resultado`; backend recebe opaco** — API não precisa saber as perguntas. Mudar copy/scoring vira PR só no front.
5. **Email-only (sem PDF)** — usa template hospedado no Resend, mesmo padrão de `welcome` e `subscription-activated`. ChatGPT sugeriu PDF; rejeitado por simplicidade — resultado fica na tela + email transacional.
6. **Meta Pixel + CAPI com `event_id` deduplicado** — sem isso, 30-50% das conversões somem por bloqueios e o algoritmo otimiza cego.
7. **Tags M2M + events append-only** — tag responde "esse lead é X?" (estado), event responde "quando ele fez X?" (histórico).

**Roadmap em alto nível:**
- **MVP (sem paid)**: Fases 0a → 5. LP captura leads via diagnóstico, manda email, rastreia engajamento. Pode ir live pra orgânico.
- **Camada paid**: Fases 6 → 9. Adiciona attribution (UTMs/fbclid), Pixel client-side, CAPI server-side. Necessário antes de gastar 1 real em Meta Ads.
- **QA final**: Fase 10. Validação visual, copy review, balanceamento de scoring se necessário.

---

## 2. Glossário

Conceitos referenciados no doc.

### UTM (Urchin Tracking Module)
Padrão de etiquetar URLs com origem do tráfego. Ao criar anúncio no Meta, link de destino vai com `?utm_source=instagram&utm_medium=cpc&utm_campaign=diag-q2-2026`. No LP/wizard, lê via `window.location.search` e salva com o lead. **Você quem coloca os UTMs ao configurar o anúncio.**

| Campo | Pra que serve | Exemplo Meta | Exemplo Google |
|---|---|---|---|
| `utm_source` | De onde veio | `instagram` | `google` |
| `utm_medium` | Tipo (categoria) | `cpc` | `cpc` |
| `utm_campaign` | Nome da campanha | `diag-q2-2026` | `concurso-tjsp` |
| `utm_content` | Variação dentro da campanha (criativo A vs B) | `enfermeira-livros` | `headline-curta` |
| `utm_term` | Palavra-chave (quase só Google) | (vazio) | `concurso+enfermagem` |

### fbclid (Facebook Click ID)
ID único que o Meta auto-anexa em qualquer clique em link do FB/IG (`?fbclid=IwAR...`), mesmo sem UTMs. Equivalente Google: `gclid`. Capturar é importante por (1) **fallback de attribution** se faltar UTM, (2) **match quality no CAPI** — o Meta usa fbclid/`_fbc` pra casar a conversão server-side com a conta FB/IG. Sem ele, match quality despenca e CPL pode dobrar.

### First-touch attribution
Pessoa clica no anúncio segunda 14h, fecha. Volta quarta 21h via Google direto e converte. Se você só ler UTMs no submit (quarta 21h), perdeu — parece "tráfego direto", mas o Meta trouxe. Solução: na primeira visita, salva UTMs+fbclid em cookie/localStorage com TTL de 90 dias; **não sobrescreve** em visitas seguintes.

### Meta Pixel
Script JS no `<head>`. Manda `PageView` automático + você dispara manualmente `Lead`, `ViewContent`, `Purchase`. Meta usa pra mostrar conversões no Ads Manager, otimizar entrega e montar audiências de retargeting. Problema: 30-50% dos eventos somem por ad blockers, iOS 14 ATT, modo anônimo.

### CAPI (Conversions API)
Canal server-to-server do Meta. Backend faz HTTP direto pra `graph.facebook.com/.../events` mandando o evento. Imune a ad blocker. Mas perde dados que só o browser conhece (`_fbp`, `_fbc`, IP, user agent), então precisa receber esses dados do front e repassar.

### event_id (deduplicação Pixel + CAPI)
Pixel + CAPI rodam em paralelo pra ter redundância. Se contar duplicado, métricas inflam. Solução: ambos disparam com o mesmo `event_id` (UUID gerado no front no momento do submit). Meta dedupica e conta como uma só conversão, mas usa dados de matching dos dois.

### Hash dos identificadores (CAPI)
Política do Meta: você não pode mandar email/phone em texto puro. Tem que mandar como `SHA256` do valor lowercased + trimmed (e phone só com dígitos).

### AEM (Aggregated Event Measurement)
Mecanismo do Meta pra lidar com iOS 14 ATT. Você prioriza até 8 conversões por domínio no Events Manager. `Lead` é o evento #1 desse projeto.

### Verificação de domínio (Meta)
Pré-requisito pra disparar evento de conversão pelo seu domínio. Faz uma vez no Business Manager via DNS TXT ou meta tag. Sem isso, eventos `Lead` viram lixo no painel.

### Lead capture timing
Convenção desse projeto: lead é "criado" no DB **no momento em que o email é entregue**, depois das 10 perguntas e antes da qualificação. Se a pessoa abandona a qualificação, ainda é lead válido (com diagnóstico salvo). Qualificação é uma segunda atualização do lead.

---

## 3. Problema

A LP `/lp/edital` tem boa promessa de valor, mas hoje termina sem captura. Quem entra, lê e sai. Sem lista de leads:
- Não dá pra fazer follow-up por email.
- Não dá pra rodar paid marketing com honestidade — você gasta R$1000 e não sabe quantos dos N submits do dia vieram do anúncio.
- Não dá pra entender o perfil de quem chega.

A solução precisa: (1) entregar valor real (diagnóstico personalizado de comportamento), (2) capturar email + dados básicos no momento de maior intenção (depois de investir tempo), (3) começar lista segmentável reusável por LPs futuras, (4) instrumentar pra paid antes de gastar dinheiro.

---

## 4. Decisões arquiteturais (com tradeoffs)

| Decisão | Alternativa | Por quê |
|---|---|---|
| **Wizard standalone em `/diagnostico`** | Embed dentro da LP | UX Typeform-like (uma pergunta por tela, full-screen) precisa de espaço próprio. Reusável por LPs futuras (`/lp/plantao` chama o mesmo `/diagnostico`). LP fica enxuta e focada em conversão pro CTA. |
| **Lead criado depois das 10 perguntas, antes da qualificação** | Submit único no fim | Captura mais cedo = menos abandono. Pessoa investiu tempo respondendo 10 perguntas, vê tela "analisando", entrega email — converte. Qualificação adicional é bonus; se abandonar, lead já está salvo. Tradeoff: 2 endpoints (submit + qualification) em vez de 1. |
| **Lead × User separados** | Reusar `User` com flag `isLead` | `User` está acoplado a Clerk/Stripe (pagantes). Misturar visitante anônimo com pagante polui regras. Linkam por email na conversão. |
| **Frontend dono das perguntas + scoring** | Backend dono | API não precisa saber o que é cada pergunta. Mudar copy/scoring vira PR só no front. **Tradeoff:** cliente pode mandar resultado fakeado — aceitável (a pessoa só prejudica a si mesma). Se virar problema, scoring sobe pro back. |
| **Compartilhar APENAS o tipo do `resultado`** via `domain/diagnostico/` | Compartilhar perguntas inteiras | API renderiza email com o resultado, então o shape vira contrato. Perguntas são conteúdo de UI — não vale compartilhar. |
| **Tags M2M** | `String[]` no `leads` | Permite query "leads com tag X", tabela `tags` reusável, indices apropriados. |
| **`lead_events` append-only** | Só tags | Tag = "estado", event = "história". Webhooks Resend mandam stream de eventos. Os dois coexistem. |
| **Email-only (sem PDF)** | PDF anexo | Resend hosted template é o padrão do projeto. Resultado já fica na tela; email reforça. ChatGPT sugeriu PDF; rejeitado por simplicidade e custo de manutenção (gerador, fonte, layout responsivo, etc.). |
| **Submissões repetidas: append** | Update da última | Igual `attempts` (append-only). Histórico preservado. Resumo "mais recente" = `ORDER BY createdAt DESC LIMIT 1`. |
| **Tags em snake_case** | colon-namespace | Consistente com nomes de evento/coluna no projeto. |
| **Idempotência webhook Resend reusa `WebhookEvent`** | Tabela própria | Modelo já existe. `source: 'resend'`. |
| **Pixel + CAPI** | Só um deles | Pixel sozinho perde 30-50% por bloqueios. CAPI sozinho perde dados de browser. Os dois com `event_id` deduplicado é prática estabelecida. |
| **First-touch attribution em cookie** | Last-touch | Pra paid de captação, first-touch é mais relevante (a fonte que **trouxe** a pessoa, mesmo que ela volte por outro canal). |
| **Attribution flat na `leads`** | Tabela separada | Captura first-touch é "uma vez por lead" — não precisa N:1. Flat fica simples. |
| **`qualificacao` como JSONB no `leads`** | Tabela separada `lead_qualificacao` | Qualificação é "info sobre a pessoa", igual phone — cabe na entidade. JSONB facilita evoluir (adicionar pergunta nova sem migration). |

---

## 5. Especificação do questionário

### 5.1. Premissas de UX

- Wizard estilo Typeform: **uma pergunta por tela**, full-screen, transição suave.
- Barra de progresso visível (X de 10 + qualificação separada).
- Sem textos longos, foco no enunciado + 4 alternativas.
- **Não pedir email antes da pergunta 10**. Captura só depois da tela "analisando".
- Qualificação **depois** da captura (lead já salvo nesse ponto).
- Resultado parece personalizado mesmo gerado por regras simples.

### 5.2. Fluxo do wizard

```
1. Welcome screen        — CTA "Começar diagnóstico"
2. Pergunta 1 de 10      — single-choice A/B/C/D
3. ...
11. Pergunta 10 de 10    — single-choice A/B/C/D
12. Tela de transição    — "Estamos analisando suas respostas..." (3-5s)
13. Captura do lead      — nome + email + WhatsApp (opcional) + opt-in LGPD
                           [SUBMIT 1: cria lead + manda email com resultado]
14. Qualificação 1 de 4  — perguntas pra segmentação comercial
15. ...
17. Qualificação 4 de 4
                           [SUBMIT 2: atualiza lead com qualificação + tags]
18. Tela de resultado    — perfil + scores + pontos + CTA pro método
```

### 5.3. As 10 perguntas principais (fixas)

Todas têm 4 alternativas. Pontuação fixa: **A=3, B=2, C=1, D=0** pontos. Pontuação total máxima: **30**.

**Pergunta 1.** Hoje, como você costuma escolher o que vai estudar?
- A) Sigo um plano organizado por prioridade
- B) Escolho com base no edital ou no que acho mais importante
- C) Estudo o que aparece ou o que sinto que preciso no dia
- D) Não tenho muita clareza sobre o que estudar primeiro

**Pergunta 2.** Com que frequência você consegue manter uma rotina de estudos?
- A) Estudo quase todos os dias ou tenho uma rotina bem definida
- B) Estudo algumas vezes por semana, mas nem sempre com regularidade
- C) Tento estudar, mas minha rotina muda muito
- D) Quase nunca consigo manter constância

**Pergunta 3.** Quando você estuda um conteúdo novo, qual é sua principal forma de aprender?
- A) Faço questões, reviso erros e volto na teoria quando preciso
- B) Leio ou assisto aula e depois faço algumas questões
- C) Leio, grifo, resumo ou assisto aula, mas faço poucas questões
- D) Normalmente só consumo teoria e quase não pratico

**Pergunta 4.** Você costuma revisar os conteúdos depois de alguns dias?
- A) Sim, tenho revisões programadas
- B) Às vezes reviso, mas sem muita organização
- C) Só reviso quando percebo que esqueci
- D) Quase nunca reviso

**Pergunta 5.** Quando erra uma questão, o que você faz?
- A) Analiso o erro e identifico o motivo: conteúdo, interpretação ou falta de atenção
- B) Leio o comentário e tento entender
- C) Vejo a resposta certa e sigo para a próxima
- D) Não tenho o hábito de analisar meus erros

**Pergunta 6.** Você sente que esquece muito do que estudou?
- A) Não muito, porque reviso e pratico com frequência
- B) Às vezes, principalmente assuntos que vejo pouco
- C) Sim, esqueço bastante coisa depois de alguns dias
- D) Sim, parece que estudo e depois preciso começar tudo de novo

**Pergunta 7.** Como você se sente diante do edital de Enfermagem?
- A) Sei o que priorizar e o que pode esperar
- B) Entendo o edital, mas às vezes me sinto perdido(a)
- C) Acho muito conteúdo e tenho dificuldade de decidir por onde começar
- D) Sinto que nunca vou dar conta de tudo

**Pergunta 8.** Você costuma estudar com base no seu desempenho?
- A) Sim, foco mais nos assuntos em que erro ou tenho dificuldade
- B) Tento fazer isso, mas nem sempre acompanho meus resultados
- C) Sei mais ou menos minhas dificuldades, mas não uso isso para planejar
- D) Não acompanho meu desempenho de forma clara

**Pergunta 9.** Quando você tem pouco tempo para estudar, o que costuma fazer?
- A) Priorizo questões e conteúdos de maior impacto
- B) Estudo o que considero mais urgente
- C) Tento estudar um pouco de tudo
- D) Fico travado(a) sem saber o que escolher

**Pergunta 10.** Qual frase mais combina com sua realidade hoje?
- A) Eu estudo com método e quero melhorar minha performance
- B) Eu estudo, mas sinto que poderia aproveitar melhor meu tempo
- C) Eu me esforço, mas sinto que meu estudo não rende o suficiente
- D) Eu me sinto perdido(a), sobrecarregado(a) e sem direção

### 5.4. Scoring

```ts
const ANSWER_SCORES = { A: 3, B: 2, C: 1, D: 0 } as const;

// Score total (max 30)
const totalScore = Object.values(respostas)
  .reduce((acc, alt) => acc + ANSWER_SCORES[alt], 0);
```

### 5.5. Perfil principal (4 categorias)

| Faixa | Slug | Nome | Significado |
|---|---|---|---|
| 0–8 | `sobrecarregado` | Estudante Sobrecarregado | Baixa clareza, pouca rotina, sensação de excesso |
| 9–15 | `esforcado_sem_direcao` | Esforçado Sem Direção | Estuda muito, sem priorizar, sem acompanhar desempenho |
| 16–22 | `em_evolucao` | Estudante em Evolução | Tem estrutura, mas perde por falta de revisão/análise/prioridade |
| 23–30 | `estrategico` | Estudante Estratégico | Bons hábitos, espaço pra otimização |

**Mensagens principais (renderizadas no resultado e email):**

- **Sobrecarregado** — "Você não precisa estudar mais conteúdos ao mesmo tempo. Primeiro, precisa organizar sua direção de estudo e entender quais pontos merecem prioridade agora."
- **Esforçado Sem Direção** — "Seu problema não parece ser falta de esforço. O que está travando sua evolução é a falta de estratégia para transformar estudo em resultado."
- **Em Evolução** — "Você já tem uma boa base de estudo, mas pode evoluir mais rápido se usar seus erros e dificuldades como guia principal."
- **Estratégico** — "Você já estuda com mais consciência do que a maioria dos candidatos. Agora, seu próximo passo é refinar prioridades, revisar melhor e transformar desempenho em vantagem competitiva."

### 5.6. Scores secundários (4 dimensões)

```ts
const SECONDARY_SCORES = {
  clarezaDirecao:   { perguntas: ['q1', 'q7', 'q9'], maxScore: 9 },  // de onde vem a direção
  consistencia:     { perguntas: ['q2'],             maxScore: 3 },  // rotina
  qualidadeMetodo:  { perguntas: ['q3', 'q5', 'q8'], maxScore: 9 },  // como estuda
  retencao:         { perguntas: ['q4', 'q6'],       maxScore: 6 },  // memória/revisão
};

// Cada dimensão também vira percentage
const percentage = Math.round((score / maxScore) * 100);
```

A dimensão com **maior percentage** vira "ponto forte" no resultado; a com **menor**, "ponto de atenção".

### 5.7. Perguntas de qualificação (após captura)

Não alteram score; alimentam tags de segmentação comercial. Definidas como JSONB no lead pra evolução sem migration.

> **Nota:** as alternativas abaixo são propostas iniciais — refinar com o time comercial antes da Fase 4.

**Q1.** Você já é enfermeiro(a)?
- Sim, já formado(a)
- Estou em formação
- Não

**Q2.** Você já trabalha na área da saúde?
- Sim, como enfermeiro(a)
- Sim, em outra função
- Não

**Q3.** Você está estudando para concurso público atualmente?
- Sim, ativamente
- Sim, mas pouco
- Não

**Q4.** Você pretende prestar concurso nos próximos meses?
- Nos próximos 3 meses
- Nos próximos 6 meses
- Nos próximos 12 meses
- Ainda não decidi

### 5.8. Estrutura do resultado

Tela de resultado mostra:
1. **Título** — "Seu Diagnóstico de Estudo para Concursos de Enfermagem"
2. **Perfil principal** — "Você é um(a) {Nome do Perfil}" + mensagem principal
3. **Cards/gráfico de scores** — 4 dimensões com percentage
4. **Ponto forte** — dimensão de maior percentage + texto explicativo
5. **Ponto de atenção** — dimensão de menor percentage + texto explicativo
6. **Foco recomendado** — sugestões baseadas no perfil + ponto fraco
7. **Mini roadmap** — 3-5 próximos passos sugeridos
8. **CTA** — "Conhecer o método Maximize" / "Quero estudar com estratégia" → link pro app

Email espelha 1, 2, 3 (em texto), 4, 5, 6, 8 (CTA).

---

## 6. Modelo de dados

Acréscimos ao `api/prisma/schema.prisma`:

```prisma
model Lead {
  id              String    @id @default(uuid()) @db.Uuid
  email           String    @unique
  name            String?
  phone           String?
  fonteLp         String?   // 'edital', 'plantao' — derivado do landingPage
  unsubscribedAt  DateTime?
  createdAt       DateTime  @default(now())

  // Attribution (first-touch)
  utmSource     String?
  utmMedium     String?
  utmCampaign   String?
  utmContent    String?
  utmTerm       String?
  fbclid        String?
  gclid         String?
  landingPage   String?    // path: '/lp/edital', '/diagnostico'
  referrer      String?
  ipAddress     String?
  userAgent     String?
  fbp           String?
  fbc           String?

  // Qualificação comercial (JSONB; preenchida em segundo submit, opcional)
  qualificacao  Json?      // { jaEnfermeiro, trabalhaSaude, estudandoConcurso, intencaoConcurso }

  tags                  LeadTag[]
  events                LeadEvent[]
  diagnosticoRespostas  DiagnosticoResposta[]

  @@map("leads")
}

model Tag {
  id        String    @id @default(uuid()) @db.Uuid
  name      String    @unique
  color     String?
  createdAt DateTime  @default(now())

  leads LeadTag[]

  @@map("tags")
}

model LeadTag {
  leadId    String   @db.Uuid
  lead      Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  tagId     String   @db.Uuid
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  appliedAt DateTime @default(now())

  @@id([leadId, tagId])
  @@index([tagId])
  @@map("lead_tags")
}

model LeadEvent {
  id         String   @id @default(uuid()) @db.Uuid
  leadId     String   @db.Uuid
  lead       Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  type       String
  payload    Json?
  createdAt  DateTime @default(now())

  @@index([leadId, createdAt(sort: Desc)])
  @@index([type])
  @@map("lead_events")
}

model DiagnosticoResposta {
  id         String   @id @default(uuid()) @db.Uuid
  leadId     String   @db.Uuid
  lead       Lead     @relation(fields: [leadId], references: [id], onDelete: Cascade)
  respostas  Json     // { q1: 'A', q2: 'B', ... q10: 'D' }
  resultado  Json     // shape definido em domain/diagnostico/
  createdAt  DateTime @default(now())

  @@index([leadId])
  @@map("diagnostico_respostas")
}
```

---

## 7. Taxonomia

### Tags (snake_case, seedadas na migration)

| Tag | Quando aplica | Quem aplica |
|---|---|---|
| **Origem** | | |
| `lp_edital` | Lead vindo de `/lp/edital` (campo `fonteLp`) | `DiagnosticoService.submit` |
| `lp_plantao` | Lead vindo de `/lp/plantao` (futuro) | mesmo |
| `wizard_direto` | Lead que entrou direto em `/diagnostico` (sem LP) | mesmo |
| **Marketing source** | | |
| `paid_meta` | UTM source ∈ {facebook, instagram} ∧ medium paid | `attribution-tag.helper.ts` |
| `paid_google` | UTM source = google ∧ medium paid | mesmo |
| `organic_social` | UTM source FB/IG ∧ medium não-paid | mesmo |
| `direct` | Sem UTM e sem fbclid | mesmo |
| **Diagnóstico** | | |
| `diagnostico_concluido` | Submit das 10 perguntas + lead capture | `DiagnosticoService.submit` |
| `qualificacao_concluida` | Submit das 4 perguntas de qualificação | `LeadService.updateQualificacao` |
| **Perfil** (uma só por lead, da última resposta) | | |
| `perfil_sobrecarregado` | total ∈ [0, 8] | `DiagnosticoService.submit` |
| `perfil_esforcado_sem_direcao` | total ∈ [9, 15] | mesmo |
| `perfil_em_evolucao` | total ∈ [16, 22] | mesmo |
| `perfil_estrategico` | total ∈ [23, 30] | mesmo |
| **Qualificação** | | |
| `enfermeiro_formado` | Q1 = "Sim, já formado(a)" | `LeadService.updateQualificacao` |
| `enfermeiro_em_formacao` | Q1 = "Estou em formação" | mesmo |
| `nao_enfermeiro` | Q1 = "Não" | mesmo |
| `trabalha_saude` | Q2 ≠ "Não" | mesmo |
| `estudando_concurso` | Q3 = "Sim, ativamente" | mesmo |
| `intencao_concurso_3m` | Q4 = "Nos próximos 3 meses" | mesmo |
| `intencao_concurso_6m` | Q4 = "Nos próximos 6 meses" | mesmo |
| `intencao_concurso_12m` | Q4 = "Nos próximos 12 meses" | mesmo |
| **Engajamento** | | |
| `email_aberto` | Primeira abertura de email | Webhook Resend |
| `email_clicado` | Primeiro clique em link | Webhook Resend |
| `unsubscribed` | Lead descadastra | Webhook Resend / endpoint |

### Events (em `lead_events.type`)

| Tipo | Trigger | Payload |
|---|---|---|
| `diagnostico_concluido` | Backend, no submit principal | `{ resultado, totalScore, perfil }` |
| `qualificacao_concluida` | Backend, no submit de qualificação | `{ qualificacao }` |
| `email_enviado` | Backend, job termina com sucesso | `{ jobType, resendMessageId, subject }` |
| `email_aberto` | Webhook Resend (`email.opened`) | `{ resendMessageId, openedAt }` |
| `email_clicado` | Webhook Resend (`email.clicked`) | `{ resendMessageId, link, clickedAt }` |
| `email_bounced` | Webhook Resend (`email.bounced`) | `{ resendMessageId, reason }` |
| `email_complained` | Webhook Resend (`email.complained`) | `{ resendMessageId }` |

### PostHog (`AnalyticsService.capture`)

| Evento | Trigger | Props |
|---|---|---|
| `lp_visualizada` | Frontend pageview de qualquer LP (`/lp/*`) | `{ utm*, fbclid, landingPage }` |
| `wizard_iniciado` | Frontend, ao clicar "começar" no `/diagnostico` welcome screen | `{ fonteLp }` |
| `wizard_pergunta_respondida` | Frontend, em cada resposta principal | `{ perguntaId, alternativa, ordem }` |
| `wizard_lead_capturado` | Frontend, depois do submit do form de email | `{ leadId, perfil }` |
| `wizard_qualificacao_concluida` | Frontend, depois do submit de qualificação | `{ leadId }` |
| `wizard_resultado_visualizado` | Frontend, mount da tela de resultado | `{ leadId, perfil }` |
| `diagnostico_concluido` | Backend, no submit principal (autoritativo) | `{ email, leadId, fonteLp, paidSource, perfil }` |

### Meta (Pixel + CAPI, mesmo `event_id`)

| Evento Meta | Trigger | Disparado por |
|---|---|---|
| `PageView` | Qualquer página com Pixel | Pixel auto |
| `ViewContent` | Wizard inicia (welcome → pergunta 1) | Pixel manual |
| `Lead` | Submit de email no step de captura | Pixel + CAPI deduplicados |

---

## 8. Fluxos detalhados

### 8.1. Primeira visita à LP (captura de attribution)

```
[Pessoa clica no anúncio Instagram]
   URL: /lp/edital?utm_source=instagram&utm_medium=cpc
                   &utm_campaign=diag-q2-2026&fbclid=IwAR...
        │
        ▼
[Browser carrega LP]
   1. Meta Pixel inicializa (gated por consent)
   2. Pixel grava cookies _fbc (do fbclid) e _fbp
   3. analytics.ts dispara $pageview no PostHog (gated)
   4. Captura de attribution roda — first-touch:
      if (!localStorage.getItem('attribution')) {
        localStorage.setItem('attribution', { utm*, fbclid, gclid,
          landingPage: '/lp/edital', referrer, fbp, fbc, capturedAt });
      }
        │
        ▼
[Pessoa lê e clica no CTA "Começar diagnóstico"]
        │
        ▼
[Navegação pra /diagnostico]
   - Pixel dispara PageView novamente (auto)
   - Attribution já está no localStorage, não sobrescreve
```

### 8.2. Wizard `/diagnostico`

```
[/diagnostico carrega]
   - Lê attribution do localStorage
   - Estado inicial: step = 'welcome'
        │
        ▼
[Welcome screen]
   - CTA "Começar diagnóstico"
   - On click:
     • Gera eventId = crypto.randomUUID() (pra Meta dedupe lá no fim)
     • PostHog: wizard_iniciado
     • Pixel: ViewContent
     • step = 'question_1'
        │
        ▼
[Loop perguntas 1..10]
   - Mostra pergunta + 4 alternativas
   - Usuário escolhe → respostas[qN] = 'A'|'B'|'C'|'D'
   - PostHog: wizard_pergunta_respondida
   - step = 'question_{N+1}' ou 'analyzing' se N=10
        │
        ▼
[Tela "Estamos analisando suas respostas..."]
   - Animação de 3-5s
   - Em paralelo: computa resultado = computeResultado(respostas)
   - step = 'lead_capture'
        │
        ▼
[Lead capture screen]
   - Form: nome, email, WhatsApp (opcional), opt-in LGPD
   - On submit:
     • Pixel: fbq('track', 'Lead', {...}, { eventID: eventId })
     • POST /leads/diagnostico (ver §8.3) com payload completo
     • Aguarda resposta → recebe { leadId }
     • Armazena leadId no estado
     • PostHog: wizard_lead_capturado
     • step = 'qualification_1'
        │
        ▼
[Loop qualificação 1..4]
   - Mostra pergunta + alternativas
   - Usuário escolhe → qualificacao[qN] = valor
   - step = 'qualification_{N+1}' ou 'result' se N=4
        │
        ▼
[Antes de mostrar resultado]
   - PATCH /leads/:leadId/qualificacao com payload de qualificação
   - PostHog: wizard_qualificacao_concluida
        │
        ▼
[Tela de resultado]
   - Mostra perfil + scores + pontos + CTA
   - PostHog: wizard_resultado_visualizado
   - CTA leva pro app/método
```

### 8.3. Submit principal (`POST /leads/diagnostico`)

```
[Frontend POST /leads/diagnostico]
   Body:
   {
     email, name, phone, fonteLp: 'edital',
     respostas: { q1: 'A', ..., q10: 'D' },   // shape opaco pra API
     resultado: { totalScore, perfil, scores, pontoForte, pontoAtencao, proximoPasso },
     attribution: { utm*, fbclid, gclid, referrer, landingPage, fbp, fbc },
     eventId,
     consentMarketing: true|false
   }
        │
        ▼
[LeadController.submitDiagnostico]
   - valida DTO (class-validator)
   - chama DiagnosticoService.submit(payload, req.ip, req.headers['user-agent'])
        │
        ▼
[DiagnosticoService.submit]
   1. lead = LeadService.upsertByEmail(email, { name, phone, fonteLp,
        attribution, ipAddress, userAgent })
        - first-touch: só preenche attribution + ip + ua se lead novo
   2. resposta = prisma.diagnosticoResposta.create({ leadId, respostas, resultado })
   3. tags = [
        `lp_${fonteLp}`,                            // 'lp_edital'
        'diagnostico_concluido',
        `perfil_${resultado.perfil.slug}`,          // 'perfil_em_evolucao'
        ...computeTagsFromAttribution(attribution), // 'paid_meta', etc.
      ]
      TagService.applyTags(lead.id, tags)
   4. EmailProducer.enqueue('diagnostico_resultado', {
        to: email, leadId, diagnosticoRespostaId: resposta.id,
        params: { firstName: name, resultado }
      })
   5. LeadEventService.record(lead.id, 'diagnostico_concluido',
        { resultado, totalScore, perfil: resultado.perfil.slug })
   6. AnalyticsService.capture('diagnostico_concluido',
        { email, leadId, fonteLp, paidSource, perfil: resultado.perfil.slug })
   7. if (consentMarketing && metaConfigured) {
        await MetaConversionsService.sendLeadEvent({
          eventId, eventTime: now,
          email, phone, fbp, fbc, ipAddress, userAgent,
          customData: { content_name: 'Diagnostico Edital' }
        });
      }
        │
        ▼
[Response 200] { ok: true, leadId: lead.id }
```

### 8.4. Submit de qualificação (`PATCH /leads/:id/qualificacao`)

```
[Frontend PATCH /leads/:id/qualificacao]
   Body: { qualificacao: { jaEnfermeiro, trabalhaSaude,
                           estudandoConcurso, intencaoConcurso } }
        │
        ▼
[LeadController.updateQualificacao]
   - Valida DTO + verifica que :id existe
   - chama LeadService.updateQualificacao(id, qualificacao)
        │
        ▼
[LeadService.updateQualificacao]
   1. prisma.lead.update({ where: { id }, data: { qualificacao } })
   2. tags = computeTagsFromQualificacao(qualificacao)
        // ['enfermeiro_formado', 'trabalha_saude', 'estudando_concurso', 'intencao_concurso_3m']
      tags.push('qualificacao_concluida')
      TagService.applyTags(id, tags)
   3. LeadEventService.record(id, 'qualificacao_concluida', { qualificacao })
        │
        ▼
[Response 200] { ok: true }
```

**Erro handling:**
- Falha em qualquer passo do submit principal (8.3) → 500. Frontend mostra erro genérico, mantém estado.
- Falha em CAPI → log warning, **não falha a request**. Lead já criado.
- Falha em qualificação (8.4) → 500. Frontend continua pro resultado mesmo assim — qualificação é bonus, não bloqueia experiência.

### 8.5. Email job processor

```
[Worker pega job 'diagnostico_resultado']
        │
        ▼
[email.processor.ts: handleDiagnosticoResultado(job)]
   1. EmailService.sendDiagnosticoResultadoEmail(to, params)
      → Resend com template 'diagnostico-resultado'
      → variables: GREETING, PERFIL_NOME, PERFIL_MENSAGEM, TOTAL_SCORE,
                   SCORE_CLAREZA, SCORE_CONSISTENCIA, SCORE_METODO, SCORE_RETENCAO,
                   PONTO_FORTE, PONTO_ATENCAO, PROXIMO_PASSO,
                   CTA_URL, SUPPORT_EMAIL
   2. EmailDispatchLogService.markSent(jobId, resendMessageId)
   3. LeadEventService.record(leadId, 'email_enviado', {...})
        │
        ▼ (assíncrono)
[Lead abre email] → Webhook Resend (§8.6)
```

### 8.6. Webhook Resend

```
[Resend dispara webhook]
   POST /webhooks/resend
        │
        ▼
[ResendWebhookController]
   1. Verifica assinatura (Svix + RESEND_WEBHOOK_SECRET)
   2. Retorna 200; processa async
        │
        ▼
[ResendWebhookService.process]
   1. Idempotência: WebhookEvent.upsert({ source: 'resend', eventId })
   2. lead = prisma.lead.findUnique({ where: { email } })
   3. Mapeia tipo Resend → event/tag:
      | Resend type      | LeadEvent        | Tag             |
      |------------------|------------------|-----------------|
      | email.opened     | email_aberto     | email_aberto    |
      | email.clicked    | email_clicado    | email_clicado   |
      | email.bounced    | email_bounced    | —               |
      | email.complained | email_complained | unsubscribed    |
   4. Record event + apply tag
   5. Se complained: prisma.lead.update({ unsubscribedAt: now })
```

---

## 9. Arquitetura de arquivos

### Backend (`api/`)

```
api/src/lead/
  lead.module.ts
  lead.controller.ts                  // POST /leads/diagnostico, PATCH /leads/:id/qualificacao
  lead.service.ts                     // upsertByEmail, updateQualificacao
  tag.service.ts                      // applyTag, applyTags
  lead-event.service.ts               // record
  diagnostico.service.ts              // submit() — orquestrador principal
  attribution-tag.helper.ts           // computeTagsFromAttribution()
  qualificacao-tag.helper.ts          // computeTagsFromQualificacao()
  dto/
    submit-diagnostico.dto.ts
    update-qualificacao.dto.ts
  webhooks/
    resend-webhook.controller.ts
    resend-webhook.service.ts

api/src/meta-conversions/             // novo
  meta-conversions.module.ts
  meta-conversions.service.ts         // sendLeadEvent
  meta-conversions.types.ts
  hash.helper.ts                      // sha256 lowercased+trimmed

api/src/email/                        // existente — adições
  email-job.types.ts                  // + 'diagnostico_resultado'
  email.processor.ts                  // + handler
  email.service.ts                    // + sendDiagnosticoResultadoEmail
  templates/
    diagnostico-resultado.template.ts
    index.ts
```

### Frontend (`nextjs-maximize-enfermagem/`)

```
src/app/
  lp/edital/page.tsx                  // existente — adicionar CTA pro /diagnostico
  diagnostico/page.tsx                // novo — host do wizard standalone
src/components/diagnostico/           // novo — UI do wizard
  Wizard.tsx                          // controller (state machine)
  WelcomeScreen.tsx
  PerguntaScreen.tsx                  // single-choice A/B/C/D genérico
  AnalyzingScreen.tsx
  LeadCaptureScreen.tsx               // form: nome, email, WhatsApp, LGPD
  QualificacaoScreen.tsx
  ResultadoScreen.tsx                 // perfil + scores + cards + CTA
  ProgressBar.tsx
src/data/diagnostico/
  perguntas.ts                        // 10 perguntas + tipos
  qualificacao.ts                     // 4 perguntas de qualificação + tipos
  perfis.ts                           // PERFIS, SECONDARY_SCORES
src/lib/diagnostico/
  scoring.ts                          // computeResultado(respostas)
  api.ts                              // submitDiagnostico, updateQualificacao
  types.ts                            // re-export do domain/
src/lib/attribution/                  // novo
  capture.ts
  storage.ts
  types.ts
src/lib/meta-pixel/                   // novo
  init.ts
  events.ts
src/lib/analytics.ts                  // existente — estender pra Meta
src/components/CookieBanner.tsx       // existente — atualizar texto
src/app/politica-de-privacidade/page.tsx  // existente — atualizar conteúdo
```

### Tipos compartilhados (`domain/`)

```
domain/diagnostico/
  diagnostico.interface.ts
```

```ts
export type Alternativa = 'A' | 'B' | 'C' | 'D';
export type ProfileSlug =
  | 'sobrecarregado'
  | 'esforcado_sem_direcao'
  | 'em_evolucao'
  | 'estrategico';

export interface ScoreSecundario {
  categoria: 'clarezaDirecao' | 'consistencia' | 'qualidadeMetodo' | 'retencao';
  score: number;
  maxScore: number;
  percentage: number;
}

export interface DiagnosticoResultado {
  totalScore: number;                  // 0-30
  perfil: {
    slug: ProfileSlug;
    nome: string;
    mensagemPrincipal: string;
  };
  scores: ScoreSecundario[];           // 4 dimensões
  pontoForte: ScoreSecundario;
  pontoAtencao: ScoreSecundario;
  proximoPasso: string;
}

export interface AttributionData {
  utmSource?: string; utmMedium?: string; utmCampaign?: string;
  utmContent?: string; utmTerm?: string;
  fbclid?: string; gclid?: string;
  landingPage?: string; referrer?: string;
  fbp?: string; fbc?: string;
}

export interface DiagnosticoSubmissionPayload {
  email: string;
  name?: string;
  phone?: string;
  fonteLp: string;                     // 'edital', 'plantao', 'wizard_direto'
  respostas: Record<string, Alternativa>;
  resultado: DiagnosticoResultado;
  attribution?: AttributionData;
  eventId: string;
  consentMarketing: boolean;
}

export interface QualificacaoPayload {
  jaEnfermeiro: 'formado' | 'em_formacao' | 'nao';
  trabalhaSaude: 'enfermeiro' | 'outra_funcao' | 'nao';
  estudandoConcurso: 'ativamente' | 'pouco' | 'nao';
  intencaoConcurso: '3m' | '6m' | '12m' | 'nao_decidiu';
}
```

---

## 10. Fases de implementação

> **Convenção:** cada tarefa tem **Por quê**, **Saída** e **Validação**.
>
> **Cutoffs sugeridos:**
> - Após **Fase 5**: LP + wizard funcionais pra orgânico (sem paid).
> - Após **Fase 9**: pronto pra rodar paid no Meta.
> - Após **Fase 10**: QA final.

---

### Fase 0a — Pré-requisitos do MVP

**0a.1 — Criar template `diagnostico-resultado` no painel do Resend**
- **Por quê:** padrão do projeto é template hospedado. HTML editável sem deploy.
- **Saída:** template publicado com id `diagnostico-resultado` aceitando variáveis: `GREETING`, `PERFIL_NOME`, `PERFIL_MENSAGEM`, `TOTAL_SCORE`, `SCORE_CLAREZA`, `SCORE_CONSISTENCIA`, `SCORE_METODO`, `SCORE_RETENCAO`, `PONTO_FORTE`, `PONTO_ATENCAO`, `PROXIMO_PASSO`, `CTA_URL`, `SUPPORT_EMAIL`.
- **Validação:** mandar email teste pelo painel.
- **Dependência externa:** quem desenha o HTML?

---

### Fase 1 — Infraestrutura de leads (backend)

**1.1 — Migration Prisma + seed das tags base**
- **Por quê:** schema é a fundação. Seed garante consistência entre dev/staging/prod.
- **Saída:** migration com `Lead`, `Tag`, `LeadTag`, `LeadEvent`, `DiagnosticoResposta`. Seed com tags base (origem, source, perfil, qualificação, engajamento — ver §7).
- **Validação:** `npx prisma migrate dev` + Studio.

**1.2 — Tipos compartilhados em `domain/diagnostico/`**
- **Por quê:** front e back precisam concordar no shape do `resultado` e do payload. Evita drift.
- **Saída:** `diagnostico.interface.ts` com todos os tipos da §9.
- **Validação:** `tsc --noEmit` em api e nextjs.

**1.3 — Módulo `lead/` no NestJS (services)**
- **Por quê:** separação por feature (convenção). Services unitários ficam testáveis.
- **Saída:** `LeadService.upsertByEmail` (first-touch) + `LeadService.updateQualificacao`; `TagService`; `LeadEventService`; `attribution-tag.helper.ts`; `qualificacao-tag.helper.ts`.
- **Validação:** unit tests (jest) cobrindo: upsert novo/existente, applyTags com no-op em duplicata, computeTagsFrom* pra todos os cenários.

**1.4 — DTOs + class-validator**
- **Por quê:** validar input cedo, antes de qualquer lógica.
- **Saída:** `submit-diagnostico.dto.ts` (com `@ValidateNested` em attribution, resultado), `update-qualificacao.dto.ts`.
- **Validação:** controller test com payloads inválidos retorna 400.

---

### Fase 2 — Email transacional

**2.1 — Job type `diagnostico_resultado` em `email-job.types.ts`**
- **Por quê:** type-safety na fila. Sem entrada no union, processor não sabe o que fazer.
- **Saída:** `DiagnosticoResultadoEmailJob` com `to`, `leadId`, `diagnosticoRespostaId`, `params: { firstName?, resultado }`. `getEmailJobId` retorna `diagnostico_resultado_${diagnosticoRespostaId}`.
- **Validação:** `tsc --noEmit`.

**2.2 — Helper de variáveis em `templates/diagnostico-resultado.template.ts`**
- **Por quê:** isolar lógica de string num arquivo, igual outros templates.
- **Saída:** `buildDiagnosticoResultadoVariables(params)` montando todas as variáveis (incluindo formatação de scores como string com `%`).
- **Validação:** unit test cobrindo perfis e scores diferentes.

**2.3 — Método `sendDiagnosticoResultadoEmail` em `EmailService`**
- **Por quê:** mesmo padrão dos outros métodos, encapsula chamada Resend.
- **Saída:** método público em `email.service.ts`.
- **Validação:** chamar via REPL/script tsx, conferir email recebido.

**2.4 — Handler do job no `email.processor.ts`**
- **Por quê:** sem handler, fila aceita mas não processa.
- **Saída:** case `'diagnostico_resultado'` chamando `EmailService.sendDiagnosticoResultadoEmail` + `LeadEventService.record(..., 'email_enviado')`.
- **Validação:** enfileirar manualmente, ver `EmailDispatchLog` e `LeadEvent` populados.

---

### Fase 3 — Submit do diagnóstico (orquestração backend)

**3.1 — `DiagnosticoService.submit(payload)` (sem Meta ainda)**
- **Por quê:** orquestrador é o coração do feature.
- **Saída:** método executando: upsert lead, create resposta, applyTags (`lp_*` + `diagnostico_concluido` + `perfil_*` + tags de attribution), enqueue email, record event, capture PostHog.
- **Validação:** unit test mockado + integration contra DB local.

**3.2 — Endpoints `POST /leads/diagnostico` e `PATCH /leads/:id/qualificacao`**
- **Por quê:** sem endpoints, front não tem como falar com back. Públicos (sem Clerk auth) — leads são anônimos.
- **Saída:** controllers com decoradores apropriados, retornando `{ ok, leadId }` e `{ ok }` respectivamente.
- **Validação:** `curl` em ambos retorna 200 + DB tem o que esperado.

**3.3 — Captura de evento PostHog `diagnostico_concluido` no backend**
- **Por quê:** backend é fonte autoritativa pra ciclo de vida (decisão do `2026-04-posthog-analytics.md`). Frontend pode perder eventos; backend não.
- **Saída:** `AnalyticsService.capture` com props `{ email, leadId, fonteLp, paidSource, perfil }`.
- **Validação:** ver no PostHog dashboard.

---

### Fase 4 — Wizard frontend

**4.1 — Dados e tipos: `src/data/diagnostico/`**
- **Por quê:** centralizar perguntas, perfis e config de scoring num lugar facilita manutenção e troca de copy.
- **Saída:** `perguntas.ts` (10 perguntas), `qualificacao.ts` (4 perguntas), `perfis.ts` (PERFIS + SECONDARY_SCORES).
- **Validação:** `tsc --noEmit`.

**4.2 — Lógica de scoring em `src/lib/diagnostico/scoring.ts`**
- **Por quê:** scoring no front (decisão arquitetural). Pure function, fácil de testar.
- **Saída:** `computeResultado(respostas) → DiagnosticoResultado` aplicando ANSWER_SCORES, SECONDARY_SCORES, escolhendo perfil pela faixa, ranqueando ponto forte/atenção.
- **Validação:** unit test pra cada perfil (4 cenários típicos: respostas tudo D, tudo A, mistas).

**4.3 — Página `/diagnostico` (`app/diagnostico/page.tsx`)**
- **Por quê:** wizard precisa de URL própria pra ser linkável e indexável (se desejado, ou `noindex` pra evitar — decidir).
- **Saída:** página que renderiza `<Wizard />`. Layout dedicado se necessário (sem header/footer da LP — Typeform-like).
- **Validação:** abre `/diagnostico` em dev, vê welcome screen.

**4.4 — Componente `Wizard.tsx` (state machine)**
- **Por quê:** controla todo o fluxo. State machine evita bugs em transições.
- **Saída:** client component com `useReducer` gerenciando step + respostas + qualificacao + leadId + eventId. Ações: `iniciar`, `responderPergunta`, `submeterCaptura`, `responderQualificacao`, `submeterQualificacao`. Renderiza componente filho conforme step.
- **Validação:** dev local, navegar pelo fluxo manualmente.

**4.5 — Componentes de tela (filhos do Wizard)**
- **Por quê:** separação por responsabilidade — cada tela com sua UI específica.
- **Saída:**
  - `WelcomeScreen.tsx` — CTA "começar"
  - `PerguntaScreen.tsx` — genérico, recebe `pergunta` e `onResponder` (renderiza A/B/C/D)
  - `AnalyzingScreen.tsx` — animação 3-5s, em paralelo computa resultado
  - `LeadCaptureScreen.tsx` — form nome/email/WhatsApp + opt-in LGPD
  - `QualificacaoScreen.tsx` — genérico, recebe pergunta de qualificação
  - `ResultadoScreen.tsx` — perfil + cards de score + ponto forte/atenção + roadmap + CTA
  - `ProgressBar.tsx` — barra de progresso com X de N
- **Validação:** Storybook ou dev local pra cada tela.

**4.6 — `src/lib/diagnostico/api.ts`**
- **Por quê:** isolar fetch da UI mantém componentes limpos.
- **Saída:** `submitDiagnostico(payload) → Promise<{ ok, leadId }>`, `updateQualificacao(leadId, qualificacao) → Promise<{ ok }>`.
- **Validação:** Network tab + DB.

**4.7 — Atualizar `app/lp/edital/page.tsx`**
- **Por quê:** LP precisa parar de embedar o wizard e passar a redirecionar.
- **Saída:** botão CTA na seção `Gancho` (e em outras se fizer sentido) com `<Link href="/diagnostico">`. Remover qualquer reference ao wizard embedado.
- **Validação:** abre `/lp/edital`, clica CTA, vai pra `/diagnostico`.

**4.8 — Validação E2E local (organic, sem Meta)**
- **Por quê:** confirmar cadeia ponta-a-ponta antes de adicionar paid.
- **Saída:** cenário documentado: LP → CTA → wizard 10 perguntas → captura → qualificação → resultado; email chega; DB tem lead + resposta + qualificacao + tags `lp_edital`, `diagnostico_concluido`, `perfil_X`, `qualificacao_concluida`, `direct`, e tags de qualificação.
- **Validação:** rodar manualmente, conferir todas as 4 personas (perfis).

---

### Fase 5 — Webhook Resend (engagement tracking)

**5.1 — Endpoint `POST /webhooks/resend`**
- **Por quê:** Resend só avisa de open/click via webhook.
- **Saída:** controller público.
- **Validação:** disparar evento de teste pelo painel Resend.

**5.2 — Verificação de assinatura**
- **Por quê:** sem isso, qualquer um forja evento.
- **Saída:** middleware/guard com Svix + `RESEND_WEBHOOK_SECRET`.
- **Validação:** request sem assinatura válida retorna 401.

**5.3 — Idempotência via `WebhookEvent`**
- **Por quê:** Resend reenvia em falha. Sem dedupe, contagens duplicadas.
- **Saída:** upsert em `WebhookEvent({ source: 'resend', eventId, eventType })`.
- **Validação:** disparar mesmo evento 2x, ver 1 linha em `lead_events`.

**5.4 — Mapping Resend type → LeadEvent + Tag**
- **Por quê:** consolidar lógica num service.
- **Saída:** service que mapeia `payload.type` ∈ {opened, clicked, bounced, complained}.
- **Validação:** abrir email no Gmail, ver `lead_events` + tag aplicada.

> **🚦 Checkpoint pós-Fase 5:** LP + wizard prontos pra tráfego orgânico. Pode ir live se não vai mexer com paid ainda.

---

### Fase 6 — Captura de attribution (frontend + backend)

**6.1 — `src/lib/attribution/capture.ts`**
- **Por quê:** sem capturar UTMs/fbclid no momento da chegada, atribuição é impossível. **Roda em qualquer pageview** (LP ou diagnóstico direto), salva só na primeira (first-touch).
- **Saída:** `captureAttribution()` que lê `window.location.search` + `document.referrer` + cookies `_fbp`/`_fbc`. Salva em localStorage com TTL 90d só se não houver entry prévia.
- **Validação:** abrir LP com UTMs+fbclid, conferir localStorage. Recarregar sem UTMs, conferir que NÃO sobrescreve.

**6.2 — Persistir attribution no payload do submit**
- **Por quê:** backend precisa receber pra salvar no lead.
- **Saída:** `lib/diagnostico/api.ts` injeta attribution lendo do localStorage antes do `fetch`. Schema de payload já tem o campo (§9).
- **Validação:** Network tab no dev tem `attribution`.

**6.3 — Backend: `LeadService.upsertByEmail` aceita attribution (first-touch)**
- **Por quê:** primeira visita ganha attribution; visitas subsequentes não sobrescrevem.
- **Saída:** se lead novo, persiste todos os campos. Se existente, ignora.
- **Validação:** unit test com cenário "submit 2x com attributions diferentes".

**6.4 — Backend: tag de origem automática**
- **Por quê:** tag automática poupa trabalho e garante consistência. "Leads de paid Meta" vira query trivial.
- **Saída:** `computeTagsFromAttribution(attr) → string[]` retornando `['paid_meta']` / `['paid_google']` / `['organic_social']` / `['direct']`.
- **Validação:** unit test cobrindo combinações.

---

### Fase 0b — Pré-requisitos pra paid Meta (operacional, fora de código)

> **Importante:** completar antes da Fase 7. Sem Pixel criado e domínio verificado, código compila mas eventos não chegam.

**0b.1 — Criar conta Meta Business + Pixel**
- **Por quê:** sem Pixel ID, não tem como mandar evento.
- **Saída:** `META_PIXEL_ID` em env vars.
- **Validação:** ver Pixel no Events Manager.

**0b.2 — Verificar domínio `maximizeenfermagem.com.br` no Meta**
- **Por quê:** Meta exige verificação pra atribuir `Lead` confiável (parte do AEM).
- **Saída:** badge "verified" no Business Manager. DNS TXT ou meta tag.
- **Validação:** Brand Safety → Domains "Verified".

**0b.3 — Gerar Access Token CAPI**
- **Por quê:** CAPI exige token; sem ele 401.
- **Saída:** `META_CAPI_ACCESS_TOKEN` + `META_TEST_EVENT_CODE` (dev) em env.
- **Validação:** chamar Graph API com payload teste retorna `events_received: 1`.

**0b.4 — Configurar AEM**
- **Por quê:** Meta limita 8 eventos priorizados (iOS 14 ATT). `Lead` é #1.
- **Saída:** AEM com `Lead` ativo no Events Manager.
- **Validação:** painel mostra ativo.

**0b.5 — Atualizar política de privacidade**
- **Por quê:** LGPD + termos do Meta exigem divulgação de Pixel + CAPI.
- **Saída:** seção em `/politica-de-privacidade` com (1) compartilhamento com Meta, (2) finalidade, (3) base legal, (4) direitos do titular, (5) link política do Meta.
- **Validação:** ler em produção.

**0b.6 — Atualizar texto do `CookieBanner.tsx`**
- **Por quê:** banner atual menciona só PostHog.
- **Saída:** texto atualizado: "...PostHog (analytics) e Meta Pixel (marketing)..."
- **Validação:** abrir LP em modo anônimo.

---

### Fase 7 — Meta Pixel (frontend)

**7.1 — `src/lib/meta-pixel/init.ts`**
- **Por quê:** Pixel precisa inicializar antes de qualquer evento.
- **Saída:** snippet `fbq('init', PIXEL_ID)` empacotado em função idempotente, **gated por `analytics.getConsent() === 'accepted'`**.
- **Validação:** `window.fbq` existe após consent, não existe se rejeitado.

**7.2 — Estender `lib/analytics.ts` pra Meta**
- **Por quê:** centralizar consent num lugar. Hoje só lida com PostHog.
- **Saída:** `optIn` chama `metaPixel.init()` + `fbq('track', 'PageView')`. `optOut` desliga.
- **Validação:** aceitar banner → ver request `facebook.com/tr?...&ev=PageView`.

**7.3 — Disparar `Lead` event com `event_id` no submit do wizard**
- **Por quê:** `Lead` é a conversão principal. Sem disparar Pixel, perde o lado browser do dedupe.
- **Saída:** `firePixelLead({ eventId, email })` chamado em `LeadCaptureScreen.tsx` antes do fetch (timing: Pixel pode levar ms; não bloquear submit).
- **Validação:** Test Events Manager mostra `Lead` com `event_id`.

**7.4 — Adicionar `_fbp` e `_fbc` ao payload do submit**
- **Por quê:** backend precisa repassar pro CAPI fazer match. Sem isso, match quality despenca.
- **Saída:** ler `document.cookie` extraindo `_fbp` e `_fbc`, incluir em `attribution`.
- **Validação:** Application → Cookies tem ambos; submit envia.

---

### Fase 8 — Conversions API (backend)

**8.1 — Módulo `meta-conversions/` no NestJS**
- **Por quê:** segregar integração externa em módulo próprio.
- **Saída:** `MetaConversionsModule`, `MetaConversionsService`, types, `hash.helper.ts`.
- **Validação:** módulo importável, tipo compila.

**8.2 — `MetaConversionsService.sendLeadEvent(payload)`**
- **Por quê:** abstrai chamada Graph API com error handling. CAPI é "best effort" — falha não quebra submit.
- **Saída:** monta body (`event_name: 'Lead'`, `event_time`, `event_id`, `action_source: 'website'`, `user_data` com hashes), POST `https://graph.facebook.com/v18.0/{PIXEL_ID}/events`.
- **Validação:** Test Events mostra evento server-side com match quality indicado.

**8.3 — Hash SHA256 em `hash.helper.ts`**
- **Por quê:** Meta exige PII hasheada (LGPD + termos).
- **Saída:** `hashSha256(value)` que normaliza (lowercase + trim para email; só dígitos para phone) antes do hash.
- **Validação:** unit test contra valores conhecidos do Meta docs.

**8.4 — Integrar `sendLeadEvent` em `DiagnosticoService.submit`**
- **Por quê:** chamar CAPI logo após upsert do lead. `event_id` recebido do front pra dedupe.
- **Saída:** `try/catch` envolvendo `await this.metaConversions.sendLeadEvent(...)` (não falha request principal). Pega `req.ip` e `req.headers['user-agent']`.
- **Validação:** submit em dev → Pixel + CAPI no Test Events com mesmo `event_id`.

**8.5 — Respeitar consent**
- **Por quê:** se rejeitou banner, não pode mandar PII pro Meta (LGPD).
- **Saída:** `if (!payload.consentMarketing) return;` no início.
- **Validação:** rejeitar banner → submit → CAPI não dispara (log).

---

### Fase 9 — Validação paid + observabilidade

**9.1 — Test Events Manager: confirmar dedupe**
- **Por quê:** se `event_id` divergir, contam 2 conversões → métricas infladas.
- **Saída:** screenshot mostrando `Deduplication: Yes` e `Match Quality` decente.
- **Validação:** submit dev → ver match estimado.

**9.2 — Funil completo no PostHog**
- **Por quê:** PostHog é fonte de verdade pra ciclo de vida.
- **Saída:** funil `lp_visualizada → wizard_iniciado → wizard_pergunta_respondida (10x) → wizard_lead_capturado → wizard_qualificacao_concluida → wizard_resultado_visualizado`. Filtro por `paidSource`.
- **Validação:** rodar funil 3x com sources diferentes.

**9.3 — Métricas de match quality**
- **Por quê:** match alto = otimização eficiente.
- **Saída:** screenshot com `Event Match Quality ≥ 7.0`.
- **Validação:** se < 7.0, revisar dados (email/phone normalizados? fbp/fbc presentes?).

---

### Fase 10 — QA final

**10.1 — Revisão de copy do wizard com persona real**
- **Por quê:** rodar com usuário real ou colega da área de enfermagem pega problemas que o dev não vê.
- **Saída:** ajustes de wording em `perguntas.ts`, `perfis.ts`, mensagens de transição, CTA.
- **Validação:** 3-5 personas testadas, feedback incorporado.

**10.2 — Balanceamento de scoring**
- **Por quê:** cutoffs (8/15/22) são propostos. Se na prática a maioria cair em "esforcado_sem_direcao", talvez ajustar faixas.
- **Saída:** após 50-100 submits reais, revisar distribuição. Ajustar `PERFIS` se necessário.
- **Validação:** dashboard PostHog com count por perfil ≈ 25% cada.

**10.3 — Email visual**
- **Por quê:** template no Resend pode ter visualização ruim em alguns clientes (Gmail mobile, Outlook).
- **Saída:** testar render em Gmail, Outlook, Apple Mail, Yahoo (Litmus ou send pra contas de teste).
- **Validação:** captura de telas comparativa.

---

## 11. Pontos pendentes / TBD

- **Design do template `diagnostico-resultado` no Resend** — quem desenha o HTML do email? Confirmar antes da Fase 0a.
- **Render de listas / scores no Resend template** — confirmar se variáveis aceitam loop ou se passamos string formatada (padrão atual: strings planas).
- **Path mapping `domain/` ↔ `api/` ↔ `nextjs-maximize-enfermagem/`** — confirmar como outros módulos importam.
- **Promoção Lead → User** — fora do MVP, mas mapear hook de criação de User pra adicionar tag `convertido_em_user` no lead correspondente.
- **Cookie banner UX** — banner atual é modal bloqueante. Pra paid traffic, isso reduz CR. Considerar bottom-bar não-bloqueante. Decisão à parte.
- **Texto exato do opt-in LGPD** — confirmar wording e link pra política.
- **Alternativas das perguntas de qualificação** — propostas iniciais em §5.7, refinar com time comercial.
- **Mini roadmap personalizado por perfil** — definir os 3-5 próximos passos sugeridos pra cada perfil (texto fixo por perfil é OK).
- **CTA final do resultado** — link exato pro app/método (`https://app.maximizeenfermagem.com.br`?). Considerar UTM próprio (`utm_source=diagnostico&utm_medium=resultado`) pra rastrear conversão diagnóstico → app.
- **`/diagnostico` indexável ou `noindex`?** — se for indexável, pode confundir SEO da LP. Recomendo `noindex` por padrão.

---

## 12. Kill switch / rollback

- **Desligar o wizard sem reverter código:** redirecionar `/diagnostico` pra `/lp/edital` em `next.config.ts`. LPs voltam a não captar; dados existentes preservados.
- **Reverter migration:** `npx prisma migrate resolve --rolled-back <migration_name>` + drop manual. Tags seedadas não impactam outras features.
- **Parar de enviar emails:** desabilitar handler `diagnostico_resultado` no processor (early return). Jobs continuam enfileirados mas viram no-op.
- **Webhook Resend ruidoso:** remover endpoint do controller; idempotência via `WebhookEvent` impede reprocessamento ao religar.
- **Desligar Meta sem reverter:** definir `META_PIXEL_ID = ''` em env. `init` vira no-op, `sendLeadEvent` retorna early. Lead capture continua.
- **Desligar qualificação:** remover tela do `Wizard.tsx` e pular pra resultado. Backend continua aceitando `PATCH` mas se for chamado vira no-op.

---

## 13. Próximos passos pós-MVP

- **LP `/lp/plantao` reusa todo o módulo** — chama o mesmo `/diagnostico` mudando apenas attribution `landingPage` (que vira `fonteLp = 'plantao'` automaticamente).
- **Página `/admin/leads`** (autenticada via Clerk com `role: ADMIN`) listando + filtrando por tag, lendo direto do Postgres.
- **Sequências automatizadas de email** (D+1, D+3, D+7) baseadas em tags + ausência de eventos. Hoje precisaria CRON; quando virar volume, justifica Loops/Customer.io.
- **Score de lead ponderado** — tags como `email_clicado`, `intencao_concurso_3m`, `enfermeiro_formado` valem mais que `direct`. Score numérico facilita priorização manual e segmentação.
- **A/B test de criativo via `utm_content`** — relatório por content pra ver qual criativo converte melhor.
- **Last-touch attribution adicional** (atualiza UTMs em cada visita) pra comparar com first-touch.
- **Variantes do questionário** por LP — `/lp/plantao` poderia ter perguntas adaptadas pra realidade de plantão. Wizard genérico aceita config diferente baseado em `?lp=` na URL.
- **Refazer diagnóstico** — botão "refazer" no resultado pra pessoa atualizar perfil meses depois (cria nova `DiagnosticoResposta`, atualiza tag de perfil pra a nova).
