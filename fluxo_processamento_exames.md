Quero implementar uma nova forma de adicionar exames na aplicacao:

A nova forma será dividido em 5 etapas.

- Edital
- Prova
- Gabarito
- Revisao
- Explicações

# Fase do Edital
O objetivo desta fase é que no FE, envie o edital em PDF e que seus dados sejam preenchidos (Hoje ja esta funcionando assim na url: "http://localhost:3001/exams/editar/efacddcc-903b-4dc1-bab8-da35c0eece36")

# Fase da Prova
Nesta fase quero muitas mudancas.

Agora, vamos fazer upload do PDF da prova, este PDF será enviado para a Antropic e usando Sonnet 4.6 quero que seja respondido um array de objeto das perguntas.

Precisamos do:
- number
- statement
- referenceText (Se existir... E se for repetido, repete-se todo o texto nomvante)
- hasImage (Isto será util para "Obrigar" uma acao entes de adicionar a prova)
- alternatives

Aqui podemos usar Sonnet 4.6

Aqui vamos mostrar a lista de perguntas para que seja olhado.

As perguntas que esta faltando imagme, precisa de uma acao

# Fase Gabarito

Aqui, será outro PDF com o gabarito.

Aqui precisamos ter atencao para garantir que este gabarito seja da prova que foi feita o upload ok? Pois tem alguns gabaritos que sao varias tabelas de gabaritos de provas.

Depois que o gabarito for feito o upload, a IA irá devolver a lista de Questao vs alterantiva correta e irá preencher na lista de questoes

Isso pode ser feito com Haiku 4.5

# Explicacoes
Agora com o gabarito e as alternativas corretas, a IA deverá enviar as perguntas com alternativas, ela deverá achar a correta, e colocar uma pequena "aula" justificando cada alternativa, sendo correta ou errada. O objetivo é que seja possivel aprender pela explicacao.

Aqui precisamos de uma IA forte, pode ser Opus 4.6

# Revisao
Nesta fase, o ADM poderá olhar questao por questao.

O importante aqui, é que as questoes que a IA marcou uma alternativa correta diferente do gabarito, faca um highlihg avisando esta inconsistencia, e pedir acao humana aqui 