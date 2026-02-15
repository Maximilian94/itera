import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ExamAttemptPlayer } from '@/components/ExamAttemptPlayer'

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoard, examId, attemptId } = Route.useParams()
  const navigate = useNavigate()

  return (
    <ExamAttemptPlayer
      examBaseId={examId}
      attemptId={attemptId}
      feedbackLink={{ examBoard, examId, attemptId }}
      onBack={() =>
        navigate({
          to: '/exams/$examBoard/$examId',
          params: { examBoard, examId },
        })
      }
    />
  )
}
