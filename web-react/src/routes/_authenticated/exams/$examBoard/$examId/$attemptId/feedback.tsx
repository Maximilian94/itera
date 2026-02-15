import { Alert, Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { Markdown } from '@/components/Markdown'
import { Card } from '@/components/Card'
import {
  useExamBaseAttemptFeedbackQuery,
  useGenerateSubjectFeedbackMutation,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'

function getSubjectBarColor(
  percentage: number,
  minPassing: number,
): string {
  if (percentage >= minPassing) return 'bg-green-500'
  if (percentage >= minPassing - 15) return 'bg-amber-500'
  return 'bg-red-500'
}

function getSubjectTextColor(
  percentage: number,
  minPassing: number,
): string {
  if (percentage >= minPassing) return 'text-green-700'
  if (percentage >= minPassing - 15) return 'text-amber-700'
  return 'text-red-700'
}

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/feedback',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoard, examId, attemptId } = Route.useParams()
  const navigate = useNavigate()
  const examBaseId = examId

  const { data, isLoading, error } = useExamBaseAttemptFeedbackQuery(
    examBaseId,
    attemptId,
  )
  const generateFeedback = useGenerateSubjectFeedbackMutation(
    examBaseId,
    attemptId,
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-auto">
        <Card noElevation className="p-6">
          <span className="text-sm text-slate-500">Carregando feedback…</span>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col gap-4 h-full min-h-0 overflow-auto">
        <Card noElevation className="flex flex-col gap-3 p-6">
          <Alert severity="error">
            {error instanceof Error
              ? error.message
              : 'Não foi possível carregar o feedback.'}
          </Alert>
          <Button
            variant="outlined"
            onClick={() =>
              navigate({
                to: '/exams/$examBoard/$examId',
                params: { examBoard, examId },
              } as any)
            }
          >
            Voltar à prova
          </Button>
        </Card>
      </div>
    )
  }

  const {
    examTitle,
    minPassingGradeNonQuota,
    overall,
    passed,
    subjectStats,
    subjectFeedback = {},
  } = data

  const hasAnyFeedback = subjectStats.some((s) => subjectFeedback[s.subject])

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 overflow-auto p-1">
      <h1 className="text-xl font-bold text-slate-900">{examTitle}</h1>

      {/* Resultado + Desempenho por matéria lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          noElevation
          className={`p-6 ${
            passed
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {passed ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-200">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-200">
                  <XCircleIcon className="w-8 h-8 text-red-600" />
                </div>
              )}
              <div>
                <p
                  className={`text-lg font-semibold ${
                    passed ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {passed ? 'Aprovado' : 'Reprovado'}
                </p>
                <p className="text-sm text-slate-600">
                  {overall.correct} de {overall.total} questões corretas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-8 h-8 text-slate-400" />
              <span className="text-3xl font-bold text-slate-800">
                {overall.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
            Nota mínima para aprovação (ampla concorrência):{' '}
            {minPassingGradeNonQuota}%
          </p>
        </Card>

        <Card noElevation className="p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Desempenho por matéria
          </h2>
          <div className="flex flex-col gap-4">
            {subjectStats.map((stat) => (
              <div key={stat.subject}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    {stat.subject}
                  </span>
                  <span
                    className={`text-sm font-semibold ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-400 ease-out ${getSubjectBarColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                    style={{
                      width: `${Math.min(100, stat.percentage)}%`,
                      minWidth: stat.percentage > 0 ? 8 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Gerar feedback por matéria (quando ainda não existe) */}
      {subjectStats.length > 0 && !hasAnyFeedback && (
        <Card noElevation className="p-5 border border-slate-200 bg-slate-50/50">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-slate-800 mb-1">
                Feedback e recomendações por matéria
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Provas antigas podem não ter o feedback gerado pela IA. Clique
                no botão abaixo para gerar avaliações e recomendações de estudo
                por matéria.
              </p>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SparklesIcon className="w-5 h-5" />}
                onClick={() => generateFeedback.mutate()}
                disabled={generateFeedback.isPending}
              >
                {generateFeedback.isPending
                  ? 'Gerando feedback…'
                  : 'Gerar feedback por matéria'}
              </Button>
              {generateFeedback.isError && (
                <Alert severity="error" className="mt-3">
                  {generateFeedback.error instanceof Error
                    ? generateFeedback.error.message
                    : 'Erro ao gerar feedback.'}
                </Alert>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Feedback por matéria (quando já existe) */}
      {hasAnyFeedback && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-slate-800">
              Feedback e recomendações por matéria
            </h2>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SparklesIcon className="w-4 h-4" />}
              onClick={() => generateFeedback.mutate()}
              disabled={generateFeedback.isPending}
            >
              {generateFeedback.isPending ? 'Refazendo…' : 'Refazer feedback'}
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            {subjectStats.map((stat) => {
              const feedback = subjectFeedback[stat.subject]
              if (!feedback) return null
              const isGreen = stat.percentage >= minPassingGradeNonQuota
              const isRed = stat.percentage < minPassingGradeNonQuota - 15
              const cardBorder = isGreen
                ? 'border-green-200'
                : isRed
                  ? 'border-red-200'
                  : 'border-amber-200'
              const cardBg = isGreen
                ? 'bg-green-50/50'
                : isRed
                  ? 'bg-red-50/50'
                  : 'bg-amber-50/50'
              return (
                <Card
                  key={stat.subject}
                  noElevation
                  className={`p-5 border-2 ${cardBorder} ${cardBg} overflow-hidden rounded-lg`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {stat.subject}
                    </h3>
                    <span
                      className={`text-sm font-semibold ${getSubjectTextColor(
                        stat.percentage,
                        minPassingGradeNonQuota,
                      )}`}
                    >
                      {stat.percentage.toFixed(0)}% acertos
                    </span>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Avaliação
                      </p>
                      <div className="text-sm text-slate-700">
                        <Markdown>{feedback.evaluation}</Markdown>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                        Recomendações de estudo
                      </p>
                      <div className="flex flex-col gap-3 text-sm text-slate-700">
                        {feedback.recommendations?.map((rec, idx) => (
                          <div key={idx}>
                            <p className="font-medium text-slate-800 mb-0.5">{rec.title}</p>
                            <div className="text-slate-700">
                              <Markdown>{rec.text}</Markdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2 pt-2 pb-4">
        <Button
          variant="contained"
          color="primary"
          startIcon={<DocumentTextIcon className="w-5 h-5" />}
          onClick={() =>
            navigate({
              to: '/exams/$examBoard/$examId/$attemptId',
              params: { examBoard, examId, attemptId },
            } as any)
          }
        >
          Ver as questões
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() =>
            navigate({
              to: '/exams/$examBoard/$examId',
              params: { examBoard, examId },
            } as any)
          }
        >
          Voltar à prova
        </Button>
      </div>
    </div>
  )
}
