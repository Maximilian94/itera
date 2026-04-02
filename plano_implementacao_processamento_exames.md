# Plano de Implementacao - Novo Fluxo de Processamento de Exames

## Visao Geral

Implementar um fluxo guiado (wizard/stepper) de 5 etapas para adicionar exames na aplicacao. O fluxo sera uma nova experiencia na pagina de edicao de exames (`/exams/editar/:examBaseId`), substituindo o processo atual por um pipeline mais estruturado e com mais controle de qualidade.

---

## Fase 1: Edital (Upload e Extracao de Metadados)

### Objetivo
Permitir upload do PDF do edital e extrair automaticamente os metadados do exame.

### Status: Ja implementado parcialmente
A funcionalidade ja existe na rota `/exams/editar/:examBaseId` com extracao de metadados via IA.

### O que precisa ser feito

**Frontend (`web-react`)**
- [ ] Criar componente `ExamStepper` com 5 etapas (MUI Stepper) na pagina de edicao
- [ ] Mover o formulario de edital existente para dentro do Step 1 do stepper
- [ ] Adicionar validacao: so permitir avancar para a Fase 2 quando os campos obrigatorios estiverem preenchidos (nome, instituicao, cargo, data, escopo)
- [ ] Adicionar indicador visual de "fase atual" do exame

**Backend (`api`)**
- [ ] Adicionar campo `processingPhase` no modelo `ExamBase` (enum: `EDITAL`, `PROVA`, `GABARITO`, `REVISAO`, `EXPLICACOES`, `CONCLUIDO`)
- [ ] Criar migration Prisma para o novo campo
- [ ] Atualizar endpoint `PATCH /exam-bases/:id` para aceitar `processingPhase`

### Arquivos impactados
- `api/prisma/schema.prisma` - novo enum e campo
- `web-react/src/routes/_authenticated/exams/editar.$examBaseId.tsx` - refatorar para stepper
- `web-react/src/features/examBase/examBase.types.ts` - novo tipo

---

## Fase 2: Prova (Upload e Parsing do PDF da Prova)

### Objetivo
Upload do PDF da prova, enviar para a Anthropic (Sonnet 4.6) e extrair as questoes estruturadas.

### O que precisa ser feito

**Backend (`api`)**
- [ ] Criar novo endpoint `POST /exam-bases/:examBaseId/questions/parse-from-pdf`
  - Recebe: PDF da prova (multipart/form-data)
  - Converte PDF para texto/markdown
  - Envia para Claude Sonnet 4.6 via Anthropic SDK
  - Prompt deve extrair array de objetos com:
    - `number` (numero da questao)
    - `statement` (enunciado)
    - `referenceText` (texto de referencia, se existir - repetir integralmente mesmo se compartilhado)
    - `hasImage` (boolean - se a questao parece ter imagem que nao pode ser extraida do texto)
    - `alternatives` (array com key e text de cada alternativa)
  - Retorna: array de questoes parseadas (sem salvar ainda)
- [ ] Implementar logica de chunking do PDF caso seja muito grande (>50 questoes)
  - Dividir em blocos de ~15 questoes
  - Processar cada bloco em paralelo com Sonnet 4.6
  - Consolidar resultados mantendo numeracao correta
- [ ] Criar DTO de validacao para o retorno da IA

**Frontend (`web-react`)**
- [ ] Criar componente `ProvaUpload` para Step 2 do stepper
  - Area de drag-and-drop para upload do PDF
  - Botao "Processar com IA"
  - Loading state com progresso (ex: "Processando bloco 2 de 4...")
- [ ] Criar componente `QuestoesList` (lista de preview das questoes extraidas)
  - Mostrar cada questao com: numero, enunciado (truncado), alternativas
  - Badge de alerta para questoes com `hasImage: true`
  - Permitir edicao inline do enunciado e alternativas
  - Permitir exclusao de questoes incorretas
- [ ] Criar componente `ImageUploadAction` para questoes com `hasImage: true`
  - Botao/area de upload de imagem por questao
  - Upload vai para GCS via endpoint existente de storage
  - Atualizar `statementImageUrl` da questao
- [ ] Bloquear avanco para Fase 3 enquanto existirem questoes com `hasImage: true` sem imagem uploaded
- [ ] Botao "Confirmar e Salvar Questoes" que faz POST em batch para `/exam-bases/:examBaseId/questions`

### Modelo de dados (retorno da IA)
```typescript
interface ParsedQuestion {
  number: number;
  statement: string;
  referenceText: string | null;
  hasImage: boolean;
  alternatives: {
    key: string; // "A", "B", "C", "D", "E"
    text: string;
  }[];
}
```

### Arquivos impactados
- `api/src/examBaseQuestion/exam-base-question.controller.ts` - novo endpoint
- `api/src/examBaseQuestion/exam-base-question.service.ts` - nova logica
- `api/src/examBaseQuestion/exam-base-question-pdf-ai.service.ts` - parsing com Sonnet 4.6
- `web-react/src/features/examBaseQuestion/examBaseQuestion.service.ts` - novo service call
- Novos componentes no frontend

---

## Fase 3: Gabarito (Upload e Matching de Respostas)

### Objetivo
Upload do PDF do gabarito, extrair respostas corretas com IA (Haiku 4.5) e associar as questoes ja cadastradas.

### O que precisa ser feito

**Backend (`api`)**
- [ ] Refatorar endpoint existente `POST /exam-bases/:examBaseId/questions/extract-gabarito-answer-key`
  - Ja existe e usa Claude Haiku - manter
  - Adicionar validacao: verificar se o gabarito e compativel com a prova
    - Comparar quantidade de questoes no gabarito vs questoes cadastradas
    - Verificar se os numeros das questoes batem
    - Se o PDF tiver multiplos gabaritos (varias provas), pedir ao usuario para selecionar qual
  - Retornar: mapeamento `{ questionNumber: correctAlternative }` + flag de confianca
- [ ] Criar endpoint `POST /exam-bases/:examBaseId/questions/apply-gabarito`
  - Recebe: mapeamento questao -> alternativa correta
  - Atualiza `correctAlternative` de cada `ExamBaseQuestion`
  - Retorna: lista de questoes atualizadas

**Frontend (`web-react`)**
- [ ] Criar componente `GabaritoUpload` para Step 3 do stepper
  - Upload do PDF do gabarito
  - Botao "Extrair Gabarito com IA"
  - Loading state
- [ ] Criar componente `GabaritoPreview`
  - Tabela mostrando: Questao | Alternativa Correta (extraida pela IA)
  - Permitir edicao manual da alternativa correta
  - Highlight em amarelo para questoes onde a IA teve baixa confianca
  - Se o PDF tiver multiplos gabaritos, mostrar selector
- [ ] Botao "Aplicar Gabarito" que chama o endpoint de apply
- [ ] Apos aplicar, mostrar resumo: "X questoes com gabarito preenchido"

### Validacao de compatibilidade
```typescript
interface GabaritoValidation {
  isCompatible: boolean;
  questionsInGabarito: number;
  questionsInExam: number;
  missingQuestions: number[]; // questoes no exam sem gabarito
  extraQuestions: number[];   // questoes no gabarito sem match no exam
}
```

### Arquivos impactados
- `api/src/examBaseQuestion/exam-base-question-pdf-ai.service.ts` - validacao de compatibilidade
- `api/src/examBaseQuestion/exam-base-question.controller.ts` - novo endpoint apply
- `api/src/examBaseQuestion/exam-base-question.service.ts` - logica de apply
- Novos componentes no frontend

---

## Fase 4: Revisao (Controle de Qualidade Humano)

### Objetivo
Permitir que o administrador revise questao por questao, com destaque especial para inconsistencias entre gabarito e IA.

### O que precisa ser feito

**Backend (`api`)**
- [ ] Adicionar campo `reviewStatus` no modelo `ExamBaseQuestion` (enum: `PENDING`, `APPROVED`, `FLAGGED`)
- [ ] Adicionar campo `aiSuggestedAlternative` no modelo `ExamBaseQuestion` (para comparar com gabarito)
- [ ] Criar endpoint `PATCH /exam-bases/:examBaseId/questions/:questionId/review`
  - Aceita: `reviewStatus`, e opcionalmente correcoes nos campos da questao
- [ ] Criar endpoint `GET /exam-bases/:examBaseId/questions/review-summary`
  - Retorna: contagem por status (pending, approved, flagged), lista de inconsistencias

**Frontend (`web-react`)**
- [ ] Criar componente `RevisaoStepper` para Step 4
  - Navegacao questao a questao (anterior/proximo)
  - Barra de progresso: "Revisadas: 45/80"
  - Filtros: "Todas", "Pendentes", "Com inconsistencia", "Aprovadas"
- [ ] Criar componente `RevisaoQuestion`
  - Exibir questao completa: enunciado, texto de referencia, imagem (se tiver), alternativas
  - **Highlight vermelho/amarelo** quando `correctAlternative` (gabarito) != `aiSuggestedAlternative`
    - Mostrar mensagem: "A IA sugeriu alternativa X, mas o gabarito indica Y. Qual esta correta?"
    - Botoes: "Manter Gabarito" | "Usar Sugestao da IA" | "Outra alternativa"
  - Botao "Aprovar Questao" (muda status para APPROVED)
  - Botao "Reportar Problema" (muda status para FLAGGED com campo de observacao)
  - Edicao inline de todos os campos da questao
- [ ] Bloquear avanco para Fase 5 enquanto existirem questoes com status PENDING ou FLAGGED sem resolucao
- [ ] Dashboard resumo no topo: questoes aprovadas, pendentes, com problemas

### Arquivos impactados
- `api/prisma/schema.prisma` - novos campos
- `api/src/examBaseQuestion/exam-base-question.controller.ts` - endpoints de review
- `api/src/examBaseQuestion/exam-base-question.service.ts` - logica de review
- Novos componentes no frontend

---

## Fase 5: Explicacoes (Geracao de Explicacoes com IA)

### Objetivo
Gerar explicacoes detalhadas para cada alternativa de cada questao usando Opus 4.6, criando uma mini-aula por questao.

### O que precisa ser feito

**Backend (`api`)**
- [ ] Refatorar/criar endpoint `POST /exam-bases/:examBaseId/questions/generate-explanations`
  - Ja existe parcialmente - precisa ser adaptado para usar Opus 4.6
  - Para cada questao, enviar para Opus 4.6:
    - Enunciado completo
    - Texto de referencia (se houver)
    - Todas as alternativas
    - Alternativa correta (do gabarito)
  - A IA deve retornar:
    - Explicacao geral da questao (contextualizacao do tema)
    - Para cada alternativa: justificativa de por que esta correta ou incorreta
    - Tom didatico: o objetivo e ensinar, nao apenas justificar
  - Processar em batches (ex: 5 questoes por vez) para nao sobrecarregar a API
  - Salvar explicacoes nos registros `ExamBaseQuestionAlternative`
- [ ] Adicionar campo `generalExplanation` no modelo `ExamBaseQuestion`
  - Para a explicacao geral/contextualizacao do tema da questao
- [ ] Implementar processamento em background com BullMQ
  - Job: `generate-explanations`
  - Permite processar exames grandes sem timeout
  - Endpoint retorna jobId, frontend faz polling de progresso
- [ ] Criar endpoint `GET /exam-bases/:examBaseId/questions/explanations-progress`
  - Retorna: total de questoes, questoes com explicacao gerada, status do job

**Frontend (`web-react`)**
- [ ] Criar componente `ExplicacoesGenerator` para Step 5
  - Botao "Gerar Explicacoes com IA (Opus 4.6)"
  - Aviso: "Este processo pode levar alguns minutos para exames grandes"
  - Barra de progresso em tempo real: "Gerando explicacao: questao 23 de 80"
  - Permitir gerar explicacoes individualmente (re-gerar uma questao especifica)
- [ ] Criar componente `ExplicacaoPreview`
  - Visualizar a explicacao gerada para cada questao
  - Mostrar explicacao geral + explicacao por alternativa
  - Alternativa correta destacada em verde
  - Alternativas incorretas com justificativa do erro
  - Botao de edicao para ajuste manual das explicacoes
- [ ] Botao "Finalizar e Publicar Exame" apos todas as explicacoes geradas
  - Chama `POST /exam-bases/:id/publish`
  - Muda `processingPhase` para `CONCLUIDO`

### Prompt da IA (Opus 4.6) - Estrutura
```
Voce e um professor especialista. Analise a questao abaixo e crie uma explicacao didatica.

Questao {number}: {statement}

{referenceText se existir}

Alternativas:
A) {text}
B) {text}
C) {text}
D) {text}

Resposta correta: {correctAlternative}

Retorne em JSON:
{
  "generalExplanation": "Contextualizacao do tema e conceitos envolvidos...",
  "alternatives": {
    "A": { "isCorrect": false, "explanation": "Esta alternativa esta incorreta porque..." },
    "B": { "isCorrect": true, "explanation": "Esta e a alternativa correta porque..." },
    ...
  }
}
```

### Arquivos impactados
- `api/prisma/schema.prisma` - novo campo `generalExplanation`
- `api/src/examBaseQuestion/exam-base-question-pdf-ai.service.ts` - prompt Opus 4.6
- `api/src/examBaseQuestion/exam-base-question.controller.ts` - endpoints
- `api/src/examBaseQuestion/exam-base-question.service.ts` - logica + BullMQ job
- Novos componentes no frontend

---

## Ordem de Implementacao Recomendada

### Sprint 1 - Fundacao (Stepper + Fase 1)
1. Criar migration com novos campos (`processingPhase`, `reviewStatus`, `aiSuggestedAlternative`, `generalExplanation`)
2. Implementar componente `ExamStepper` no frontend
3. Integrar formulario de edital existente no Step 1
4. Logica de navegacao entre fases

### Sprint 2 - Fase 2 (Prova)
1. Endpoint de parsing de PDF com Sonnet 4.6
2. Componentes de upload, preview e edicao de questoes
3. Fluxo de upload de imagens para questoes com `hasImage`
4. Salvamento em batch das questoes

### Sprint 3 - Fase 3 (Gabarito)
1. Validacao de compatibilidade gabarito vs prova
2. Componentes de upload e preview do gabarito
3. Endpoint de aplicacao do gabarito nas questoes
4. Tratamento de gabaritos com multiplas provas

### Sprint 4 - Fase 4 (Revisao)
1. Interface de revisao questao a questao
2. Sistema de highlight de inconsistencias
3. Fluxo de aprovacao/rejeicao
4. Dashboard de progresso da revisao

### Sprint 5 - Fase 5 (Explicacoes)
1. Integracao com Opus 4.6 para geracao de explicacoes
2. Processamento em background com BullMQ
3. Interface de progresso e preview
4. Fluxo de publicacao final

---

## Consideracoes Tecnicas

### Performance
- PDFs grandes devem ser processados em chunks para evitar limites de tokens da API
- Explicacoes devem ser geradas em background (BullMQ) pois Opus 4.6 e mais lento
- Usar cache no frontend (React Query) para evitar re-fetching desnecessario

### Custos de IA
- **Sonnet 4.6** (Fase 2 - Prova): custo moderado, ~1 chamada por chunk de 15 questoes
- **Haiku 4.5** (Fase 3 - Gabarito): custo baixo, 1 chamada por gabarito
- **Opus 4.6** (Fase 5 - Explicacoes): custo alto, 1 chamada por batch de 5 questoes
- Estimar custo total por exame de 80 questoes: ~$2-5 USD

### Seguranca
- Todos os endpoints de processamento devem ter `@Roles('ADMIN')`
- Validar tipo e tamanho do PDF no upload (max 50MB)
- Sanitizar output da IA antes de salvar no banco

### UX
- Cada fase deve ter indicacao clara de status (completo, em progresso, pendente)
- Permitir voltar a fases anteriores para correcoes
- Salvar progresso automaticamente (auto-save com debounce)
- Mostrar estimativas de tempo para operacoes de IA
