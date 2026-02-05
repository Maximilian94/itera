import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import CancelIcon from '@mui/icons-material/Cancel'
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'

export type ExamBaseAttemptsListProps = {
  items: ExamBaseAttemptHistoryItem[]
  isLoading?: boolean
  error?: Error | null
  emptyMessage?: string
  /** When true, rows are clickable and use examBoardId to navigate. Caller can pass onRowClick to handle navigation. */
  onRowClick?: (item: ExamBaseAttemptHistoryItem) => void
  /** When true, show columns: Banca, Instituição, Data da prova (useful when listing multiple exam bases). Default true. */
  showExamBaseColumns?: boolean
}

const formatDate = (date: string) => dayjs(date).format('DD/MM/YYYY')
const formatDateTime = (date: string) =>
  dayjs(date).format('DD/MM/YYYY HH:mm')

function statusChip(item: ExamBaseAttemptHistoryItem) {
  if (item.finishedAt == null) {
    return (
      <Chip
        size="small"
        color="warning"
        icon={<HourglassTopIcon />}
        label="Em andamento"
      />
    )
  }
  if (item.passed === true) {
    return (
      <Chip
        size="small"
        color="success"
        icon={<CheckCircleIcon />}
        label="Aprovado"
      />
    )
  }
  return (
    <Chip
      size="small"
      color="error"
      icon={<CancelIcon />}
      label="Reprovado"
    />
  )
}

export function ExamBaseAttemptsList({
  items,
  isLoading = false,
  error = null,
  emptyMessage = 'Nenhuma tentativa.',
  onRowClick,
  showExamBaseColumns = true,
}: ExamBaseAttemptsListProps) {
  if (error) {
    return (
      <Typography color="error">Erro ao carregar a lista de tentativas.</Typography>
    )
  }

  if (isLoading) {
    return <Typography color="text.secondary">Carregando...</Typography>
  }

  if (items.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Paper>
    )
  }

  const canClickRow = (item: ExamBaseAttemptHistoryItem) =>
    onRowClick != null && item.examBoardId != null

  return (
    <TableContainer component={Paper}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Data realizado</TableCell>
            {showExamBaseColumns && (
              <>
                <TableCell>Banca</TableCell>
                <TableCell>Instituição</TableCell>
                <TableCell>Data da prova (banca)</TableCell>
              </>
            )}
            <TableCell align="right">Nota</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              hover={canClickRow(item)}
              sx={{
                cursor: canClickRow(item) ? 'pointer' : 'default',
              }}
              onClick={() => canClickRow(item) && onRowClick?.(item)}
            >
              <TableCell>
                {item.finishedAt
                  ? formatDateTime(item.finishedAt)
                  : formatDateTime(item.startedAt)}
              </TableCell>
              {showExamBaseColumns && (
                <>
                  <TableCell>{item.examBoardName ?? '—'}</TableCell>
                  <TableCell>{item.institution ?? '—'}</TableCell>
                  <TableCell>{formatDate(item.examDate)}</TableCell>
                </>
              )}
              <TableCell align="right">
                {item.percentage != null
                  ? `${item.percentage.toFixed(1)}%`
                  : '—'}
              </TableCell>
              <TableCell>{statusChip(item)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
