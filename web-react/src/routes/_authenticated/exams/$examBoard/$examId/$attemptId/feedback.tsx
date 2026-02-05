import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  alpha,
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  useTheme,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
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
import { Markdown } from '@/components/Markdown'
import {
  useExamBaseAttemptFeedbackQuery,
  useGenerateSubjectFeedbackMutation,
} from '@/features/examBaseAttempt/queries/examBaseAttempt.queries'

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
)

/**
 * Returns MUI color key for subject bar based on percentage vs min passing grade.
 */
function getSubjectColor(
  percentage: number,
  minPassing: number,
): 'success' | 'warning' | 'error' {
  if (percentage >= minPassing) return 'success'
  if (percentage >= minPassing - 15) return 'warning'
  return 'error'
}

/**
 * Returns hex color for subject bar (green / yellow / red) based on performance.
 */
function getSubjectBgColor(
  percentage: number,
  minPassing: number,
): string {
  if (percentage >= minPassing) return '#22c55e'
  if (percentage >= minPassing - 15) return '#eab308'
  return '#ef4444'
}

export const Route = createFileRoute(
  '/_authenticated/exams/$examBoard/$examId/$attemptId/feedback',
)({
  component: RouteComponent,
})

/**
 * Feedback page: exam title, approval status, subject bars, radar chart,
 * and AI-generated evaluation/recommendations per subject.
 */
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
  const generateFeedback = useGenerateSubjectFeedbackMutation(
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
          onClick={() => navigate({ to: '/exams/$examBoard/$examId', params: { examBoard, examId } } as any)}
        >
          Voltar à prova
        </Button>
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
    <div className="p-4 h-full overflow-y-auto">
      <Box className="flex flex-col gap-3 h-full">
        <Paper className="flex flex-col gap-2 p-4">
          <Typography variant="h5" component="h1" fontWeight={600}>
            {examTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Feedback da prova
          </Typography>
        </Paper>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
          <Paper className="flex flex-col gap-2 p-4 h-full">
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
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
                  backgroundColor: passed ? 'success.main' : 'error.main',
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
                {overall.correct}/{overall.total} ({overall.percentage.toFixed(1)}%)
              </strong>
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Nota mínima para aprovação (não cotista): {minPassingGradeNonQuota}%
            </Typography>
          </Box>
        </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
          <Paper className="flex flex-col gap-2 p-4">
          <Typography variant="subtitle1" fontWeight={600}>
            Desempenho por matéria
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {subjectStats.map((stat) => {
              const color = getSubjectColor(stat.percentage, minPassingGradeNonQuota)
              const bgColor = getSubjectBgColor(stat.percentage, minPassingGradeNonQuota)
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
                    <Typography variant="body2" color={`${color}.main`} fontWeight={600}>
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
        </Grid>

        {/* <Grid container spacing={2}>
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
        </Grid> */}

        {subjectStats.length > 0 &&
          !subjectStats.some((s) => subjectFeedback[s.subject]) && (
            <Paper className="flex flex-col gap-2 p-4">
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Feedback e recomendações por matéria
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Provas antigas podem não ter o feedback gerado pela IA. Clique no botão
                abaixo para gerar avaliações e recomendações de estudo por matéria.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => generateFeedback.mutate()}
                disabled={generateFeedback.isPending}
              >
                {generateFeedback.isPending ? 'Gerando feedback…' : 'Gerar feedback por matéria'}
              </Button>
              {generateFeedback.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {generateFeedback.error instanceof Error
                    ? generateFeedback.error.message
                    : 'Erro ao gerar feedback.'}
                </Alert>
              )}
            </Paper>
          )}

        {subjectStats.some((s) => subjectFeedback[s.subject]) && (
          <Paper className="flex flex-col gap-4 p-4">
            <Box className="flex items-center justify-between gap-2">
              <Typography variant="subtitle1" fontWeight={600}>
                Feedback e recomendações por matéria
              </Typography>
              {/* TODO: mostrar este botão apenas para admin */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AutoAwesomeIcon />}
                onClick={() => generateFeedback.mutate()}
                disabled={generateFeedback.isPending}
              >
                {generateFeedback.isPending ? 'Refazendo feedback…' : 'Refazer feedback'}
              </Button>
            </Box>

            {subjectStats.map((stat) => {
              const feedback = subjectFeedback[stat.subject]
              if (!feedback) return null
              return (
                <Paper
                  key={stat.subject}
                  elevation={3}
                  className="flex flex-col gap-2 p-4"
                >
                  <Typography variant="subtitle1" fontWeight={600}>
                    {stat.subject}
                  </Typography>
                  <Markdown>{feedback.evaluation}</Markdown>
                  <Markdown>{feedback.recommendations}</Markdown>
                </Paper>
              )
            })}
            {/* <Box>
              {subjectStats.map((stat) => {
                const feedback = subjectFeedback[stat.subject]
                if (!feedback) return null
                return (
                  <Accordion key={stat.subject} elevation={3}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <div className="flex gap-4 items-center">
                        <Typography variant="body1" fontWeight={500}>
                          {stat.subject}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {stat.percentage.toFixed(0)}% de acertos
                        </Typography>
                      </div>

                    </AccordionSummary>
                    <AccordionDetails            >
                      <Box >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}

                        >
                          Avaliação
                        </Typography>
                        <Markdown variant="body2">{feedback.evaluation}</Markdown>
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}

                        >
                          Recomendações de estudo
                        </Typography>
                        <Markdown variant="body2">{feedback.recommendations}</Markdown>
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )
              })}
            </Box> */}
          </Paper>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
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
            onClick={() =>
              navigate({ to: '/exams/$examBoard/$examId', params: { examBoard, examId } } as any)
            }
          >
            Voltar a informações da prova
          </Button>
        </Box>
      </Box>
    </div>
  )
}
