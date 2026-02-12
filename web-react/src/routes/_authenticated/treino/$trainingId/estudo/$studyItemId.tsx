import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  BookOpenIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import {
  useTrainingStudyItemsQuery,
  useCompleteStudyItemMutation,
  useGenerateStudyItemContentMutation,
  trainingKeys,
} from '@/features/training/queries/training.queries'
import { useQueryClient } from '@tanstack/react-query'
import type { TrainingStudyItemExercise } from '@/features/training/domain/training.types'

export const Route = createFileRoute('/_authenticated/treino/$trainingId/estudo/$studyItemId')({
  component: StudyItemDetailPage,
})

const TAB_RECOMENDACAO = 0
const TAB_EXPLICACAO = 1
const TAB_EXERCICIOS = 2

function StudyItemDetailPage() {
  const { trainingId, studyItemId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(0)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  /** exerciseId -> selected alternative id (local state, not persisted) */
  const [selectedByExerciseId, setSelectedByExerciseId] = useState<Record<string, string>>({})

  const { data: studyItems = [], isLoading } = useTrainingStudyItemsQuery(trainingId)
  const item = studyItems.find((i) => i.id === studyItemId)
  const completeMutation = useCompleteStudyItemMutation(trainingId, studyItemId)
  const generateMutation = useGenerateStudyItemContentMutation(trainingId, studyItemId)
  const isPronto = Boolean(item?.completedAt)
  const exercises = item?.exercises ?? []
  const totalExercises = exercises.length
  const safeExerciseIndex = totalExercises > 0 ? Math.min(exerciseIndex, totalExercises - 1) : 0
  const currentExercise = totalExercises > 0 ? exercises[safeExerciseIndex] : null

  const handleVoltarEstudo = () => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.studyItems(trainingId) })
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    navigate({ to: '/treino/$trainingId/estudo', params: { trainingId } })
  }

  const togglePronto = () => {
    completeMutation.mutate(!isPronto, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
        queryClient.invalidateQueries({ queryKey: trainingKeys.studyItems(trainingId) })
        handleVoltarEstudo()
      },
    })
  }

  const handlePrevExercise = () => {
    setExerciseIndex((i) => Math.max(0, i - 1))
  }

  const handleNextExercise = () => {
    setExerciseIndex((i) => Math.min(totalExercises - 1, i + 1))
  }

  const handleSelectAlternative = (exerciseId: string, alternativeId: string) => {
    setSelectedByExerciseId((prev) => ({ ...prev, [exerciseId]: alternativeId }))
  }

  if (isLoading) {
    return <p className="text-slate-500 text-sm">Carregando...</p>
  }

  if (!item) {
    return (
      <>
        <p className="text-slate-600 text-sm">Item de estudo não encontrado.</p>
        <Button variant="outlined" startIcon={<ArrowLeftIcon className="w-5 h-5" />} onClick={handleVoltarEstudo}>
          Voltar: Estudo
        </Button>
      </>
    )
  }

  const tabButtons = [
    { value: TAB_RECOMENDACAO, label: 'Recomendação', icon: DocumentTextIcon },
    { value: TAB_EXPLICACAO, label: 'Explicação', icon: BookOpenIcon },
    { value: TAB_EXERCICIOS, label: 'Exercícios', icon: PencilSquareIcon },
  ]

  return (
    <div className="flex flex-col gap-6 overflow-y-auto min-h-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{item.subject}</p>
          <h1 className="text-xl font-bold text-slate-900">{item.recommendationTitle}</h1>
        </div>
        <Button
          variant={isPronto ? 'outlined' : 'contained'}
          color={isPronto ? 'success' : 'primary'}
          startIcon={isPronto ? <CheckCircleIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
          onClick={togglePronto}
          disabled={completeMutation.isPending}
        >
          {isPronto ? 'Pronto' : 'Marcar pronto'}
        </Button>
      </div>

      <Card noElevation className="overflow-hidden border border-slate-200">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabButtons.map((t) => {
            const Icon = t.icon
            const isActive = tab === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50' : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } cursor-pointer`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="p-5 min-h-[200px]">
          {tab === TAB_RECOMENDACAO && (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-slate-700">
                <Markdown>{item.recommendationText}</Markdown>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <p className="text-sm text-slate-600 mb-3">
                  O próximo passo é aprofundar o conhecimento neste assunto. Acesse a aba <strong>Explicação</strong> para ler o conteúdo detalhado.
                </p>
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<ArrowRightIcon className="w-4 h-4" />}
                  onClick={() => setTab(TAB_EXPLICACAO)}
                >
                  Ir para Explicação
                </Button>
              </div>
            </div>
          )}

          {tab === TAB_EXPLICACAO && (
            <div className="flex flex-col gap-4">
              {!item.explanation && !generateMutation.isPending && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    Nenhuma explicação ainda. Gere uma explicação e exercícios com IA abaixo.
                  </p>
                  <Button
                    variant="outlined"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? 'Gerando...' : 'Gerar explicação e exercícios (IA)'}
                  </Button>
                </div>
              )}
              {generateMutation.isPending && (
                <p className="text-sm text-slate-500">Gerando conteúdo...</p>
              )}
              {item.explanation && (
                <>
                  <div className="text-sm text-slate-700">
                    <Markdown>{item.explanation}</Markdown>
                  </div>
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600 mb-3">
                      Agora que você leu a explicação do conteúdo, é hora de treinar! Acesse a aba <strong>Exercícios</strong> para praticar.
                    </p>
                    <Button
                      variant="contained"
                      color="primary"
                      endIcon={<ArrowRightIcon className="w-4 h-4" />}
                      onClick={() => setTab(TAB_EXERCICIOS)}
                    >
                      Ir para Exercícios
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === TAB_EXERCICIOS && (
            <div className="flex flex-col gap-4">
              {totalExercises === 0 ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    Nenhum exercício ainda. Gere uma explicação e exercícios com IA abaixo.
                  </p>
                  <Button
                    variant="outlined"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    {generateMutation.isPending ? 'Gerando...' : 'Gerar explicação e exercícios (IA)'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handlePrevExercise}
                      disabled={safeExerciseIndex === 0}
                      aria-label="Questão anterior"
                      className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-slate-700 shrink-0">
                      Questão {safeExerciseIndex + 1} de {totalExercises}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextExercise}
                      disabled={safeExerciseIndex === totalExercises - 1}
                      aria-label="Próxima questão"
                      className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {currentExercise && (
                    <StudyExerciseBlock
                      exercise={currentExercise}
                      selectedAlternativeId={selectedByExerciseId[currentExercise.id]}
                      onSelectAlternative={(alternativeId) => handleSelectAlternative(currentExercise.id, alternativeId)}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={handleVoltarEstudo}
        >
          Voltar: Estudo
        </Button>
      </div>
    </div>
  )
}

function StudyExerciseBlock({
  exercise,
  selectedAlternativeId,
  onSelectAlternative,
}: {
  exercise: TrainingStudyItemExercise
  selectedAlternativeId?: string
  onSelectAlternative: (alternativeId: string) => void
}) {
  const sortedAlternatives = [...exercise.alternatives].sort((a, b) =>
    (a.key || '').localeCompare(b.key || ''),
  )
  const hasSelection = selectedAlternativeId != null

  return (
    <div className="flex flex-col gap-4">
      <div className="text-base font-medium text-slate-900">
        <Markdown>{exercise.statement}</Markdown>
      </div>
      <div className="flex flex-col gap-2">
        {sortedAlternatives.map((alt) => {
          const isSelected = selectedAlternativeId === alt.id
          const isCorrect = alt.isCorrect
          const isWrong = hasSelection && isSelected && !isCorrect
          const showResult = hasSelection
          const optionBg = showResult
            ? isCorrect
              ? 'bg-green-50 border-green-400'
              : isWrong
                ? 'bg-red-50 border-red-400'
                : 'bg-slate-50 border-slate-300'
            : isSelected
              ? 'bg-blue-50 border-blue-400'
              : 'bg-slate-50 border-slate-300 hover:bg-slate-100'
          const keyBadge = showResult
            ? isCorrect
              ? 'bg-green-600 text-white'
              : isWrong
                ? 'bg-red-600 text-white'
                : 'bg-slate-200 text-slate-700'
            : isSelected
              ? 'bg-blue-500 text-white'
              : 'bg-slate-200 text-slate-700'

          return (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSelectAlternative(alt.id)}
              className={`flex gap-3 items-center justify-start w-full p-3 rounded-lg border-2 text-left transition-colors ${optionBg}`}
            >
              <span className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}>
                {alt.key}
              </span>
              <span className="text-sm text-slate-800 flex-1">
                <Markdown>{alt.text}</Markdown>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
