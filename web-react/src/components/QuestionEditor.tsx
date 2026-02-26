import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Markdown } from '@/components/Markdown'
import { MarkdownEditor } from '@/components/MarkdownEditor'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ImageIcon from '@mui/icons-material/Image'
import SaveIcon from '@mui/icons-material/Save'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useRef, useState, useEffect } from 'react'
import type { ExamBaseQuestion } from '@/features/examBaseQuestion/domain/examBaseQuestion.types'
import {
  useUpdateExamBaseQuestionMutation,
  useDeleteExamBaseQuestionMutation,
  useCreateAlternativeMutation,
  useUpdateAlternativeMutation,
  useDeleteAlternativeMutation,
  useGenerateExplanationsMutation,
  getApiMessage,
  isConflictError,
} from '@/features/examBaseQuestion/queries/examBaseQuestions.queries'
import { examBaseQuestionsService } from '@/features/examBaseQuestion/services/examBaseQuestions.service'

function stringListToArray(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function arrayToStringList(arr: string[]): string {
  return arr.join(', ')
}

const sortedAlternatives = (q: ExamBaseQuestion) =>
  [...q.alternatives].sort((a, b) => a.key.localeCompare(b.key))

export interface QuestionEditorProps {
  examBaseId: string
  question: ExamBaseQuestion
  onDeleted?: () => void
}

export function QuestionEditor({
  examBaseId,
  question,
  onDeleted,
}: QuestionEditorProps) {
  const [subject, setSubject] = useState(question.subject)
  const [topic, setTopic] = useState(question.topic)
  const [subtopicsStr, setSubtopicsStr] = useState(
    arrayToStringList(question.subtopics ?? []),
  )
  const [statement, setStatement] = useState(question.statement)
  const [statementImageUrl, setStatementImageUrl] = useState<string>(
    question.statementImageUrl ?? '',
  )
  const [referenceText, setReferenceText] = useState<string>(
    question.referenceText ?? '',
  )
  const [skillsStr, setSkillsStr] = useState(
    arrayToStringList(question.skills ?? []),
  )
  const [correctAlternative, setCorrectAlternative] = useState<string>(
    question.correctAlternative ?? '',
  )
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingAltId, setEditingAltId] = useState<string | null>(null)
  const [newAltKey, setNewAltKey] = useState('')
  const [newAltText, setNewAltText] = useState('')
  const [newAltExplanation, setNewAltExplanation] = useState('')
  const [altError, setAltError] = useState<string | null>(null)
  const [generateExplainError, setGenerateExplainError] = useState<string | null>(null)
  const [disagreementWarning, setDisagreementWarning] = useState<string | null>(null)
  const [editAltKey, setEditAltKey] = useState('')
  const [editAltText, setEditAltText] = useState('')
  const [editAltExplanation, setEditAltExplanation] = useState('')
  const [uploadImageError, setUploadImageError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [statementImageLoadError, setStatementImageLoadError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSubject(question.subject)
    setTopic(question.topic)
    setSubtopicsStr(arrayToStringList(question.subtopics ?? []))
    setStatement(question.statement)
    setStatementImageUrl(question.statementImageUrl ?? '')
    setReferenceText(question.referenceText ?? '')
    setSkillsStr(arrayToStringList(question.skills ?? []))
    setCorrectAlternative(question.correctAlternative ?? '')
  }, [question.id, question.subject, question.topic, question.subtopics, question.statement, question.statementImageUrl, question.referenceText, question.skills, question.correctAlternative])

  const updateQuestion = useUpdateExamBaseQuestionMutation(examBaseId)
  const deleteQuestion = useDeleteExamBaseQuestionMutation(examBaseId)
  const createAlternative = useCreateAlternativeMutation(examBaseId, question.id)
  const updateAlternative = useUpdateAlternativeMutation(examBaseId, question.id)
  const deleteAlternative = useDeleteAlternativeMutation(examBaseId, question.id)
  const generateExplanations = useGenerateExplanationsMutation(examBaseId, question.id)

  const alternatives = sortedAlternatives(question)
  const alternativeKeys = alternatives.map((a) => a.key)

  const handleSave = async () => {
    setSaveError(null)
    const correct =
      correctAlternative && alternativeKeys.includes(correctAlternative)
        ? correctAlternative
        : ''
    try {
      await updateQuestion.mutateAsync({
        questionId: question.id,
        input: {
          subject,
          topic,
          subtopics: stringListToArray(subtopicsStr),
          statement,
          statementImageUrl: statementImageUrl?.trim() || null,
          referenceText: referenceText?.trim() || null,
          skills: stringListToArray(skillsStr),
          correctAlternative: correct,
        },
      })
    } catch (err) {
      setSaveError(getApiMessage(err))
    }
  }

  const handleStatementImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadImageError(null)
    setUploadingImage(true)
    try {
      const { url } = await examBaseQuestionsService.uploadStatementImage(examBaseId, file)
      setStatementImageUrl(url)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setUploadImageError(getApiMessage(err))
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setSaveError(null)
    try {
      await deleteQuestion.mutateAsync(question.id)
      setDeleteDialogOpen(false)
      onDeleted?.()
    } catch (err) {
      setSaveError(getApiMessage(err))
    }
  }

  const handleAddAlternative = async () => {
    setAltError(null)
    if (!newAltKey.trim() || !newAltText.trim() || !newAltExplanation.trim()) {
      setAltError('Key, text and explanation are required.')
      return
    }
    try {
      await createAlternative.mutateAsync({
        key: newAltKey.trim(),
        text: newAltText.trim(),
        explanation: newAltExplanation.trim(),
      })
      setNewAltKey('')
      setNewAltText('')
      setNewAltExplanation('')
    } catch (err) {
      const msg = isConflictError(err)
        ? 'An alternative with this key already exists for this question.'
        : getApiMessage(err)
      setAltError(msg)
    }
  }

  const startEditAlt = (alt: ExamBaseQuestion['alternatives'][0]) => {
    setEditingAltId(alt.id)
    setEditAltKey(alt.key)
    setEditAltText(alt.text)
    setEditAltExplanation(alt.explanation ?? '')
    setAltError(null)
  }

  const handleUpdateAlternative = async () => {
    if (!editingAltId) return
    setAltError(null)
    try {
      await updateAlternative.mutateAsync({
        alternativeId: editingAltId,
        input: {
          key: editAltKey.trim(),
          text: editAltText.trim(),
          explanation: editAltExplanation.trim(),
        },
      })
      setEditingAltId(null)
    } catch (err) {
      const msg = isConflictError(err)
        ? 'An alternative with this key already exists for this question.'
        : getApiMessage(err)
      setAltError(msg)
    }
  }

  const handleDeleteAlt = async (alternativeId: string) => {
    setAltError(null)
    try {
      await deleteAlternative.mutateAsync(alternativeId)
      if (correctAlternative && alternatives.find((a) => a.id === alternativeId)?.key === correctAlternative) {
        setCorrectAlternative('')
      }
    } catch (err) {
      setAltError(getApiMessage(err))
    }
  }

  const handleGenerateExplanations = async () => {
    setGenerateExplainError(null)
    setDisagreementWarning(null)
    try {
      const result = await generateExplanations.mutateAsync()
      setTopic(result.topic)
      setSubtopicsStr(arrayToStringList(result.subtopics))
      await updateQuestion.mutateAsync({
        questionId: question.id,
        input: { topic: result.topic, subtopics: result.subtopics },
      })
      for (const e of result.explanations) {
        const alt = alternatives.find((a) => a.key === e.key)
        if (alt) {
          await updateAlternative.mutateAsync({
            alternativeId: alt.id,
            input: { explanation: e.explanation },
          })
        }
      }
      if (result.agreesWithCorrectAnswer === false) {
        setDisagreementWarning(
          result.disagreementWarning ??
            'A IA identificou possível inconsistência na resposta marcada como correta.',
        )
      }
    } catch (err) {
      setGenerateExplainError(getApiMessage(err))
    }
  }

  return (
    <Box sx={{ pt: 1, pb: 2 }}>
      <Stack spacing={2}>
        {saveError && (
          <Alert severity="error" onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}
        {altError && (
          <Alert severity="error" onClose={() => setAltError(null)}>
            {altError}
          </Alert>
        )}
        {generateExplainError && (
          <Alert severity="error" onClose={() => setGenerateExplainError(null)}>
            {generateExplainError}
          </Alert>
        )}
        {disagreementWarning && (
          <Alert
            severity="warning"
            onClose={() => setDisagreementWarning(null)}
            sx={{ '& .MuiAlert-message': { fontWeight: 600 } }}
          >
            <strong>Atenção:</strong> A IA identificou possível inconsistência na resposta marcada como correta. Recomendamos revisar a questão.
            <br />
            <br />
            {disagreementWarning}
          </Alert>
        )}

        <TextField
          label="Subject"
          size="small"
          fullWidth
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <TextField
          label="Topic"
          size="small"
          fullWidth
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <TextField
          label="Subtopics (comma-separated)"
          size="small"
          fullWidth
          value={subtopicsStr}
          onChange={(e) => setSubtopicsStr(e.target.value)}
        />
        <MarkdownEditor
          label="Enunciado"
          value={statement}
          onChange={setStatement}
          minHeight={400}
        />
        <MarkdownEditor
          label="Texto de referência (opcional)"
          value={referenceText}
          onChange={setReferenceText}
          minHeight={400}
          placeholder="Texto da prova ao qual a questão se refere (ex.: texto base compartilhado por várias questões)"
        />

        <Typography variant="subtitle2">Imagem do enunciado</Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleStatementImageFile}
            style={{ display: 'none' }}
            id={`statement-image-${question.id}`}
          />
          <label htmlFor={`statement-image-${question.id}`}>
            <Button
              variant="outlined"
              component="span"
              size="small"
              startIcon={<ImageIcon />}
              disabled={uploadingImage}
            >
              {uploadingImage ? 'Enviando…' : 'Enviar imagem'}
            </Button>
          </label>
          <TextField
            size="small"
            placeholder="Ou cole a URL da imagem"
            value={statementImageUrl}
            onChange={(e) => {
              setStatementImageUrl(e.target.value)
              setStatementImageLoadError(false)
            }}
            sx={{ minWidth: 280 }}
          />
          {statementImageUrl && (
            <IconButton
              size="small"
              color="error"
              onClick={async () => {
                setStatementImageUrl('')
                setStatementImageLoadError(false)
                setSaveError(null)
                const correct =
                  correctAlternative && alternativeKeys.includes(correctAlternative)
                    ? correctAlternative
                    : ''
                try {
                  await updateQuestion.mutateAsync({
                    questionId: question.id,
                    input: {
                      subject,
                      topic,
                      subtopics: stringListToArray(subtopicsStr),
                      statement,
                      statementImageUrl: null,
                      referenceText: referenceText?.trim() || null,
                      skills: stringListToArray(skillsStr),
                      correctAlternative: correct,
                    },
                  })
                } catch (err) {
                  setSaveError(getApiMessage(err))
                }
              }}
              disabled={updateQuestion.isPending}
              aria-label="Remover imagem"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
        {uploadImageError && (
          <Alert severity="error" onClose={() => setUploadImageError(null)}>
            {uploadImageError}
          </Alert>
        )}
        {statementImageUrl && (
          <Box
            sx={{
              maxWidth: 400,
              maxHeight: 300,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            {statementImageLoadError ? (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                Não foi possível carregar a imagem.
              </Typography>
            ) : (
              <img
                src={statementImageUrl}
                alt="Enunciado"
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                onError={() => setStatementImageLoadError(true)}
                onLoad={() => setStatementImageLoadError(false)}
              />
            )}
          </Box>
        )}

        <TextField
          label="Skills (comma-separated)"
          size="small"
          fullWidth
          value={skillsStr}
          onChange={(e) => setSkillsStr(e.target.value)}
        />

        <FormControl size="small" fullWidth>
          <InputLabel>Correct alternative</InputLabel>
          <Select
            value={correctAlternative}
            label="Correct alternative"
            onChange={(e) => setCorrectAlternative(e.target.value)}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {alternativeKeys.map((key) => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="subtitle2" sx={{ mt: 1 }}>
          Alternatives (sorted by key)
        </Typography>
        {alternatives.map((alt) => (
          <Box
            key={alt.id}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {editingAltId === alt.id ? (
              <>
                <TextField
                  size="small"
                  label="Key"
                  value={editAltKey}
                  onChange={(e) => setEditAltKey(e.target.value)}
                />
                <MarkdownEditor
                  label="Texto da alternativa"
                  value={editAltText}
                  onChange={setEditAltText}
                  minHeight={140}
                />
                <MarkdownEditor
                  label="Explicação"
                  value={editAltExplanation}
                  onChange={setEditAltExplanation}
                  minHeight={180}
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleUpdateAlternative}
                    disabled={updateAlternative.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setEditingAltId(null)}
                  >
                    Cancel
                  </Button>
                </Stack>
              </>
            ) : (
              <>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight="medium" component="span">
                      {alt.key}:{' '}
                    </Typography>
                    <Markdown variant="body2" sx={{ display: 'inline' }}>
                      {alt.text}
                    </Markdown>
                  </Box>
                  <Stack direction="row">
                    <IconButton
                      size="small"
                      onClick={() => startEditAlt(alt)}
                      aria-label="Edit alternative"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteAlt(alt.id)}
                      disabled={deleteAlternative.isPending}
                      aria-label="Delete alternative"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                {alt.explanation && (
                  <Box sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" component="span">
                      Explicação:{' '}
                    </Typography>
                    <Markdown variant="caption" sx={{ display: 'inline' }}>
                      {alt.explanation}
                    </Markdown>
                  </Box>
                )}
              </>
            )}
          </Box>
        ))}

        <Typography variant="subtitle2">Add alternative</Typography>
        <Stack spacing={1}>
          <TextField
            size="small"
            label="Key (e.g. A, B, C)"
            value={newAltKey}
            onChange={(e) => setNewAltKey(e.target.value)}
            placeholder="A"
          />
          <MarkdownEditor
            label="Texto da alternativa"
            value={newAltText}
            onChange={setNewAltText}
            minHeight={400}
          />
          <MarkdownEditor
            label="Explicação"
            value={newAltExplanation}
            onChange={setNewAltExplanation}
            minHeight={400}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleAddAlternative}
            disabled={createAlternative.isPending}
          >
            Add alternative
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleGenerateExplanations}
            disabled={
              generateExplanations.isPending ||
              alternatives.length === 0 ||
              !correctAlternative
            }
            title={
              !correctAlternative
                ? 'Marque a alternativa correta para gerar explicações'
                : undefined
            }
          >
            {generateExplanations.isPending ? 'Gerando…' : 'Gerar explicações com IA'}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={updateQuestion.isPending}
          >
            Save question
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteQuestion.isPending}
          >
            Delete question
          </Button>
        </Stack>
      </Stack>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete question?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete this question and all its alternatives. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm} autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
