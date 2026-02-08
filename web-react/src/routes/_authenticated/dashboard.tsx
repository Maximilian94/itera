import { AttemptListItem } from '@/components/AttemptListItem'
import { Card } from '@/components/Card'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import {
  ChartBarIcon,
  ClockIcon,
  DocumentTextIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: Dashboard,
})

const RECENT_ATTEMPTS = 5

function Dashboard() {
  const navigate = useNavigate()
  const { data: historyItems = [], isLoading } = useExamBaseAttemptHistoryQuery()

  const total = historyItems.length
  const passed = historyItems.filter((i) => i.passed === true).length
  const failed = historyItems.filter((i) => i.finishedAt != null && i.passed !== true).length
  const recent = historyItems.slice(0, RECENT_ATTEMPTS)

  const activeAttempt = historyItems.find((i) => i.finishedAt == null && i.examBoardId != null)
  const lastFinishedAttempt = historyItems.find((i) => i.finishedAt != null && i.examBoardId != null)

  const handleAttemptClick = (item: ExamBaseAttemptHistoryItem) => {
    if (!item.examBoardId) return
    if (item.finishedAt) {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId/feedback',
        params: {
          examBoard: item.examBoardId,
          examId: item.examBaseId,
          attemptId: item.id,
        },
      })
    } else {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId',
        params: {
          examBoard: item.examBoardId,
          examId: item.examBaseId,
          attemptId: item.id,
        },
      })
    }
  }

  return (
    <div className="flex flex-col gap-6 p-1">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão geral das suas provas e atividade recente.
        </p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card noElevation className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? '—' : total}</p>
              <p className="text-sm text-slate-500">Tentativas realizadas</p>
            </div>
          </div>
        </Card>
        <Card noElevation className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{isLoading ? '—' : passed}</p>
              <p className="text-sm text-slate-500">Aprovados</p>
            </div>
          </div>
        </Card>
        <Card noElevation className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{isLoading ? '—' : failed}</p>
              <p className="text-sm text-slate-500">Reprovados</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ações rápidas */}
      <Card noElevation className="p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          {activeAttempt && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayIcon className="w-5 h-5" />}
              onClick={() =>
                navigate({
                  to: '/exams/$examBoard/$examId/$attemptId',
                  params: {
                    examBoard: activeAttempt.examBoardId!,
                    examId: activeAttempt.examBaseId,
                    attemptId: activeAttempt.id,
                  },
                })
              }
            >
              Continuar exame ativo
            </Button>
          )}
          {lastFinishedAttempt && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ChartBarIcon className="w-5 h-5" />}
              onClick={() =>
                navigate({
                  to: '/exams/$examBoard/$examId/$attemptId/feedback',
                  params: {
                    examBoard: lastFinishedAttempt.examBoardId!,
                    examId: lastFinishedAttempt.examBaseId,
                    attemptId: lastFinishedAttempt.id,
                  },
                })
              }
            >
              Último feedback
            </Button>
          )}
          <Link to="/exams">
            <Button
              variant={activeAttempt ? 'outlined' : 'contained'}
              color="primary"
              startIcon={<DocumentTextIcon className="w-5 h-5" />}
            >
              Exames
            </Button>
          </Link>
          <Link to="/history">
            <Button
              variant="outlined"
              startIcon={<ClockIcon className="w-5 h-5" />}
            >
              Histórico
            </Button>
          </Link>
        </div>
      </Card>

      {/* Atividade recente */}
      <Card noElevation className="p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Atividade recente</h2>
        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando…</p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-slate-500">
            Nenhuma prova realizada ainda. Acesse Exames para começar.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((item) => (
              <li key={item.id}>
                <AttemptListItem item={item} onClick={handleAttemptClick} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
