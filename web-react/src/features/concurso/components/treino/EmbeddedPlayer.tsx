import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { ChartBarIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'
import { ExamAnalysisOverlay } from '@/components/ExamAnalysisOverlay'
import {
  trainingKeys,
  useTrainingQuery,
} from '@/features/training/queries/training.queries'

/*
 * Players embutidos na página do cargo: responder a prova diagnóstica e a
 * re-tentativa SEM sair do concurso (breadcrumb/header/stepper continuam).
 * Adaptados de /treino/$trainingId/prova e /treino/$trainingId/retentativa/prova
 * — as rotas antigas continuam existindo para links diretos.
 *
 * O wrapper marca `data-exam-player`: os ancestrais (página/fluxo) trocam para
 * uma cadeia flex de altura de app, e o player gerencia o scroll interno.
 */

/** Prova diagnóstica embutida (trainingProvaMode + overlay de análise). */
export function ProvaPlayerEmbed(props: {
  trainingId: string
  /** Chamado quando a análise termina ou o usuário pede o diagnóstico. */
  onSeeDiagnostico: () => void
}) {
  const { trainingId, onSeeDiagnostico } = props
  const queryClient = useQueryClient()
  const { data: training, isLoading } = useTrainingQuery(trainingId)

  const [provaState, setProvaState] = useState<{
    isFinished: boolean
    isFinishPending: boolean
    finish: () => void
    hasUnansweredQuestions: boolean
    firstUnansweredIndex: number
    goToQuestion: (index: number) => void
  } | null>(null)
  const [unansweredModalOpen, setUnansweredModalOpen] = useState(false)
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(false)
  const [analysisApiDone, setAnalysisApiDone] = useState(false)

  const handleExamFinished = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
    queryClient.invalidateQueries({ queryKey: trainingKeys.list() })
    setAnalysisApiDone(true)
  }, [queryClient, trainingId])

  const handleFinishError = useCallback(() => {
    setShowAnalysisOverlay(false)
    setAnalysisApiDone(false)
  }, [])

  const triggerFinishWithOverlay = useCallback(() => {
    setShowAnalysisOverlay(true)
    provaState?.finish()
  }, [provaState])

  const finishOrWarn = () => {
    if (provaState == null) return
    if (provaState.hasUnansweredQuestions) setUnansweredModalOpen(true)
    else triggerFinishWithOverlay()
  }

  if (isLoading || training == null) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
  }
  if (training.examBoardId == null) {
    return (
      <p className="text-sm text-amber-700">
        Este simulado não está vinculado a uma banca. Não é possível abrir a
        prova por aqui.
      </p>
    )
  }

  const primaryAction =
    provaState == null ? null : provaState.isFinished ? (
      <Button
        variant="contained"
        color="primary"
        fullWidth
        endIcon={<ChartBarIcon className="h-5 w-5" />}
        onClick={onSeeDiagnostico}
      >
        Ver diagnóstico
      </Button>
    ) : (
      <Button
        variant="contained"
        color="primary"
        fullWidth
        onClick={finishOrWarn}
        disabled={provaState.isFinishPending || showAnalysisOverlay}
      >
        {provaState.isFinishPending ? 'Finalizando…' : 'Finalizar prova'}
      </Button>
    )

  return (
    <div data-exam-player className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ExamAttemptPlayer
        examBaseId={training.examBaseId}
        attemptId={training.attemptId}
        trainingProvaMode
        immediateFeedback={training.immediateFeedback}
        feedbackLink={{
          examBoard: training.examBoardId,
          examId: training.examBaseId,
          attemptId: training.attemptId,
        }}
        mobileHeaderAction={
          provaState == null ? null : provaState.isFinished ? (
            <Button
              variant="contained"
              color="primary"
              disableElevation
              onClick={onSeeDiagnostico}
              sx={MOBILE_BTN_SX}
            >
              Diagnóstico
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              disableElevation
              onClick={finishOrWarn}
              disabled={provaState.isFinishPending || showAnalysisOverlay}
              sx={MOBILE_BTN_SX}
            >
              {provaState.isFinishPending ? 'Finalizando…' : 'Finalizar'}
            </Button>
          )
        }
        provaPrimaryAction={primaryAction}
        onFinished={handleExamFinished}
        onFinishError={handleFinishError}
        onTrainingProvaStateChange={setProvaState}
      />

      {showAnalysisOverlay && (
        <ExamAnalysisOverlay
          apiFinished={analysisApiDone}
          onComplete={onSeeDiagnostico}
        />
      )}

      <Dialog
        open={unansweredModalOpen}
        onClose={() => setUnansweredModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Questões não finalizadas</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Existem questões que ainda não foram respondidas. Deseja ir para uma
            delas ou prefere finalizar a prova mesmo assim?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              if (provaState != null) {
                provaState.goToQuestion(provaState.firstUnansweredIndex)
                setUnansweredModalOpen(false)
              }
            }}
            variant="contained"
            color="primary"
            startIcon={<PencilSquareIcon className="h-5 w-5" />}
          >
            Ir para questão {provaState ? provaState.firstUnansweredIndex + 1 : ''}
          </Button>
          <Button
            onClick={() => {
              setUnansweredModalOpen(false)
              triggerFinishWithOverlay()
            }}
            color="inherit"
          >
            Finalizar mesmo assim
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

const MOBILE_BTN_SX = {
  minHeight: 40,
  minWidth: 0,
  px: 2,
  borderRadius: '14px',
  textTransform: 'none',
  fontWeight: 800,
  boxShadow: 'none',
  whiteSpace: 'nowrap',
} as const

/** Re-tentativa embutida: mesmo player em modo retry (só questões erradas). */
export function RetryPlayerEmbed(props: {
  trainingId: string
  /** Chamado ao concluir a re-tentativa ou pedir o resultado final. */
  onFinal: () => void
}) {
  const { trainingId, onFinal } = props
  const queryClient = useQueryClient()

  return (
    <div data-exam-player className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ExamAttemptPlayer
        trainingId={trainingId}
        onFinished={() => {
          queryClient.invalidateQueries({ queryKey: trainingKeys.one(trainingId) })
          queryClient.invalidateQueries({ queryKey: trainingKeys.list() })
          onFinal()
        }}
        onNavigateToFinal={onFinal}
      />
    </div>
  )
}
