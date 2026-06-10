# Product

Scope: this document describes the **`web-react/`** internal app (the logged-in
panel: practice questions, mock exams/provas, training flows, performance
metrics). The public marketing site (`nextjs-maximize-enfermagem/`) is a separate
surface and is out of scope here.

## Register

product

## Users

Enfermeiros brasileiros se preparando para concursos públicos de enfermagem.
São profissionais adultos, frequentemente já formados e muitas vezes estudando
em horários apertados (antes/depois de plantões). O contexto de uso é o estudo
recorrente e de longa duração: sessões repetidas de questões, simulados e
revisão de desempenho ao longo de semanas ou meses até a data da prova.

O trabalho a ser feito (job-to-be-done): "praticar até ter confiança de que vou
passar" — responder questões realistas, fazer simulados fiéis à banca, entender
os erros e acompanhar a evolução do meu desempenho.

## Product Purpose

Plataforma de preparação que transforma estudo disperso em progresso mensurável.
O usuário pratica questões e simulados (provas) de bancas reais, recebe feedback
e explicações por alternativa, e acompanha a evolução do seu desempenho ao longo
do tempo. Sucesso = o usuário volta com regularidade, sente que está melhorando
de forma visível e chega na prova confiante (e, no fim, aprovado).

Superfícies principais: dashboard de evolução, fluxo de treino (treino/estudo/
diagnóstico), simulados de provas por banca (exams/$examBoard/$examId), feedback
de tentativa, histórico e gestão de conta/planos.

## Brand Personality

Motivadora e energética, **sem ser infantil**. Trata o usuário como o
profissional competente que ele é: o tom encoraja e celebra progresso real, mas
com a postura de um treinador sério, não de um mascote. Três palavras:
**motivadora, confiante, focada.**

Emoção-alvo: momentum. O usuário deve sentir que cada sessão o aproxima da
aprovação e que seu esforço está rendendo. Energia vem da clareza do progresso e
de microvitórias honestas, não de fogos de artifício.

## Anti-references

- **Gamificação infantil** (anti-referência principal e explícita): nada de
  mascotes estilo Duolingo, confete a cada acerto, badges cartunescos ou tom de
  app de criança. A motivação é para um adulto profissional em alta pressão.
- **Site de concurso "cram" sobrecarregado**: evitar o visual denso, poluído e
  cheio de blocos de texto típico de muitos sites de concurso brasileiros.
  Respiro e hierarquia são parte da proposta.
- **Dashboard SaaS genérico**: evitar o template de grid de cards idênticos com
  ícone + título + texto e a "hero-metric" (número gigante + label + stats).

## Design Principles

1. **Momentum visível.** Progresso e melhora de desempenho estão sempre
   presentes e legíveis. O usuário enxerga que está avançando sem precisar
   procurar — esse é o motor motivacional, no lugar de recompensas infantis.
2. **Confiança merecida.** O tom assume um profissional competente. Encorajar,
   não puxar saco; celebrar marcos reais, não cada clique.
3. **Foco acima de decoração.** Cada tela serve à tarefa de estudo do momento.
   Reduzir carga cognitiva: o que não ajuda a estudar sai da frente.
4. **Fidelidade que gera confiança.** Questões, explicações e simulados precisam
   parecer fiéis à banca e tecnicamente corretos. A credibilidade do conteúdo é
   parte da experiência.
5. **Feito para a maratona.** Projetado para sessões longas e repetidas: baixa
   fadiga, ótima legibilidade e energia que não cansa ao longo do tempo.

## Accessibility & Inclusion

Meta: **WCAG 2.1 AA**, com atenção extra a baixa visão. Como o uso envolve
leitura prolongada (enunciados longos, explicações), priorizar:

- Contraste de texto ≥ 4.5:1 (corpo) e ≥ 3:1 (texto grande); placeholders também
  em 4.5:1.
- Suporte a aumento de fonte / texto grande sem quebrar layout.
- Navegação por teclado e estados de foco visíveis em todo o fluxo de questões.
- `prefers-reduced-motion`: toda animação motivacional precisa de alternativa
  (crossfade/instantâneo); a energia nunca pode atrapalhar quem precisa de calma.
