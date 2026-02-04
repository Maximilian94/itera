import {
  Alert,
  alpha,
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  useTheme,
} from '@mui/material'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Radar } from 'react-chartjs-2'
import { useExamBaseAttemptFeedbackQuery } from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

function getSubjectColor(
  percentage: number,
  minPassing: number,
): 'success' | 'warning' | 'error' {
  if (percentage >= minPassing) return 'success'
  if (percentage >= minPassing - 15) return 'warning'
  return 'error'
}

function getSubjectBgColor(
  percentage: number,
  minPassing: number,
): string {
  if (percentage >= minPassing) return '#22c55e' // green
  if (percentage >= minPassing - 15) return '#eab308' // yellow/amber
  return '#ef4444' // red
}

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/feedback',
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoard, examId, attemptId } = Route.useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const examBaseId = examId
  const textColor = theme.palette.text.secondary

  const { data, isLoading, error } = useExamBaseAttemptFeedbackQuery(
    examBaseId,
    attemptId,
  )

  if (isLoading) {
    return (
      <div className="p-4">
        <Typography color="text.secondary">Carregando feedback…</Typography>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4">
        <Alert severity="error" sx={{ mb: 2 }}>
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
            })
          }
        >
          Voltar à prova
        </Button>
      </div>
    )
  }

  const { examTitle, minPassingGradeNonQuota, overall, passed, subjectStats } =
    data

  const radarData = {
    labels: subjectStats.map((s) => s.subject),
    datasets: [
      {
        label: '% de acertos',
        data: subjectStats.map((s) => s.percentage),
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
        borderColor: theme.palette.primary.main,
        borderWidth: 1,
      },
      {
        label: 'Nota mínima aprovação',
        data: subjectStats.map(() => minPassingGradeNonQuota),
        backgroundColor: alpha(theme.palette.success.main, 0.1),
        borderColor: alpha(theme.palette.success.main, 0.8),
        borderWidth: 1,
        borderDash: [5, 5],
      },
    ],
  }

  const radarOptions = {
    maintainAspectRatio: false,
    color: textColor,
    scales: {
      r: {
        min: 0,
        max: 100,
        ticks: {
          stepSize: 20,
          color: textColor,
          backdropColor: 'transparent',
        },
        pointLabels: {
          color: textColor,
        },
        grid: {
          color: textColor,
        },
        angleLines: {
          color: textColor,
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: textColor,
        },
      },
    },
  }

  return (
    <div className="p-4">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Row 1: Exam title */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: 'var(--bg-slate-900)',
          }}
        >
          <Typography variant="h5" component="h1" fontWeight={600}>
            {examTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Feedback da prova
          </Typography>
        </Paper>

        {/* Row 2: Approval + overall success rate */}
        <Paper
          sx={{
            p: 2,
            backgroundColor: 'var(--bg-slate-900)',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" component="span">
                {passed ? 'Aprovado' : 'Reprovado'}
              </Typography>
              <Box
                component="span"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: passed
                    ? 'success.main'
                    : 'error.main',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {passed ? '✓' : '✗'}
              </Box>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Taxa de acerto geral:{' '}
              <strong>
                {overall.correct}/{overall.total} (
                {overall.percentage.toFixed(1)}%)
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Nota mínima para aprovação (não cotista):{' '}
              {minPassingGradeNonQuota}%
            </Typography>
          </Box>
        </Paper>

        {/* Row 3: Subject bars (left) + Radar chart (right) */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{
                p: 2,
                height: '100%',
                minHeight: 480,
                backgroundColor: 'var(--bg-slate-900)',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Desempenho por matéria
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {subjectStats.map((stat) => {
                  const color = getSubjectColor(
                    stat.percentage,
                    minPassingGradeNonQuota,
                  )
                  const bgColor = getSubjectBgColor(
                    stat.percentage,
                    minPassingGradeNonQuota,
                  )
                  return (
                    <Box key={stat.subject}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="body2" fontWeight={500}>
                          {stat.subject}
                        </Typography>
                        <Typography
                          variant="body2"
                          color={`${color}.main`}
                          fontWeight={600}
                        >
                          {stat.percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 24,
                          borderRadius: 1,
                          backgroundColor: 'action.hover',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${Math.min(100, stat.percentage)}%`,
                            minWidth: stat.percentage > 0 ? 4 : 0,
                            backgroundColor: bgColor,
                            borderRadius: 1,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              sx={{
                p: 2,
                height: '100%',
                minHeight: 480,
                backgroundColor: 'var(--bg-slate-900)',
              }}
            >
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Radar de acertos por matéria
              </Typography>
              <Box sx={{ height: 420, position: 'relative' }}>
                <Radar data={radarData} options={radarOptions} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() =>
              navigate({
                to: '/exams/$examBoard/$examId/$attemptId',
                params: { examBoard, examId, attemptId },
              })
            }
          >
            Voltar à prova
          </Button>
          <Button
            variant="outlined"
            onClick={() =>
              navigate({
                to: '/exams/$examBoard/$examId',
                params: { examBoard, examId },
              })
            }
          >
            Voltar aos detalhes
          </Button>
        </Box>
      </Box>
    </div>
  )
}
