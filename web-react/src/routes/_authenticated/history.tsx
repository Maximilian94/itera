import { ExamBaseAttemptsList } from '@/components/ExamBaseAttemptsList'
import { useExamBaseAttemptHistoryQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'
import { Box, Typography } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/history')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: items = [], isLoading, error } = useExamBaseAttemptHistoryQuery()
  const navigate = useNavigate()

  const handleRowClick = (item: (typeof items)[0]) => {
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
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
        Histórico de provas
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Lista ordenada pela data em que você realizou cada prova (mais recente primeiro).
      </Typography>

      <ExamBaseAttemptsList
        items={items}
        isLoading={isLoading}
        error={error ?? null}
        emptyMessage="Nenhuma prova realizada ainda. Comece uma prova em Exams para ver seu histórico aqui."
        onRowClick={handleRowClick}
        showExamBaseColumns={true}
      />
    </Box>
  )
}
