-- Aposenta do feed os stubs VAZIOS que o fluxo antigo de descoberta publicava
-- automaticamente.
--
-- Contexto: antes do gate de publicação, `discovery/add` criava o concurso e o
-- tornava visível no mesmo clique. Sobraram cards com apenas órgão + UF +
-- janela de inscrição — sem edital, sem salário, sem data de prova e sem nada
-- em que o usuário possa clicar. A migration anterior
-- (20260903120000_concurso_publish_and_ai_cost) publicou TUDO por segurança,
-- para não esvaziar o /concursos; esta refina a regra agora que a decisão de
-- produto foi tomada. Eles voltam para a fila do admin e são republicados
-- quando alguém completar as fases.
--
-- ⚠️ "Vazio" é definido de forma CONSERVADORA. Além de não ter edital nem link
-- da organizadora, o concurso não pode ter:
--   * provas vinculadas  — teria questões para treinar, que é o conteúdo que
--     mais importa (e a visibilidade dele já é gated por ExamBase.published);
--   * documentos na timeline — a aba Notícias já tem o que mostrar, mesmo que
--     o link de origem tenha se perdido.
-- Sem essas duas cláusulas a regra derrubaria concursos com conteúdo real
-- (medido na base de dev: 70 pelo critério ingênuo × 61 por este).
UPDATE "concursos" c
SET "publishedAt" = NULL
WHERE c."publishedAt" IS NOT NULL
  AND c."editalUrl" IS NULL
  AND c."documentsSourceUrl" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "exam_bases" e WHERE e."concursoId" = c.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "concurso_documents" d WHERE d."concursoId" = c.id
  );
