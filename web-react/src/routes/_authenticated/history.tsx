import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { AttemptListItem } from '@/components/AttemptListItem'
import { Card } from '@/components/Card'
import {
  useExamBaseAttemptHistoryQuery,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'

export const Route = createFileRoute('/_authenticated/history')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: items = [], isLoading, error } = useExamBaseAttemptHistoryQuery()
  const navigate = useNavigate()

  const handleRowClick = (item: ExamBaseAttemptHistoryItem) => {
    if (item.examBoardId && item.finishedAt) {
      navigate({
        to: '/exams/$examBoard/$examId/$attemptId/feedback',
        params: {
          examBoard: item.examBoardId,
          examId: item.examBaseId,
          attemptId: item.id,
        },
      })
    } else if (item.examBoardId) {
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
        <h1 className="text-xl font-bold text-slate-900">
          Histórico de provas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Lista ordenada pela data em que você realizou cada prova (mais recente primeiro).
        </p>
      </div>

      {error && (
        <Card noElevation className="p-5">
          <p className="text-sm text-red-600">Erro ao carregar o histórico.</p>
        </Card>
      )}

      {isLoading && (
        <Card noElevation className="p-6">
          <p className="text-sm text-slate-500">Carregando…</p>
        </Card>
      )}

      {!isLoading && !error && items.length === 0 && (
        <Card noElevation className="p-8 text-center">
          <p className="text-sm text-slate-500">
            Nenhuma prova realizada ainda. Comece uma prova em Exames para ver seu histórico aqui.
          </p>
        </Card>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <AttemptListItem key={item.id} item={item} onClick={handleRowClick} />
          ))}
        </div>
      )}
    </div>
  )
}
