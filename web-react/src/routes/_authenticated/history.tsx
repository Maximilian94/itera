import { Tooltip } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import dayjs from 'dayjs'
import {
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  TrophyIcon,
  XCircleIcon,
} from '@heroicons/react/24/solid'
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
          {items.map((item) => {
            const isClickable = item.examBoardId != null
            const status =
              item.finishedAt == null
                ? { label: 'Em andamento', icon: ClockIcon, className: 'text-amber-600 bg-amber-50', tooltip: 'Prova ainda não finalizada' }
                : item.passed === true
                  ? { label: 'Aprovado', icon: CheckCircleIcon, className: 'text-green-600 bg-green-50', tooltip: 'Você atingiu a nota mínima para aprovação' }
                  : { label: 'Reprovado', icon: XCircleIcon, className: 'text-red-600 bg-red-50', tooltip: 'Nota abaixo do mínimo para aprovação' }
            const StatusIcon = status.icon
            const realizationDate = item.finishedAt ? dayjs(item.finishedAt) : dayjs(item.startedAt)
            const location = [item.state, item.city].filter(Boolean).join(' · ')
            const examYear = dayjs(item.examDate).format('YYYY')

            return (
              <div
                key={item.id}
                role={isClickable ? 'button' : undefined}
                onClick={() => isClickable && handleRowClick(item)}
                className={`
                  flex flex-wrap items-center gap-4 rounded-lg border border-slate-300 p-1 px-2
                  transition-all ease-in-out duration-200
                  ${isClickable ? 'cursor-pointer hover:bg-slate-50 hover:shadow-sm active:shadow-none' : ''}
                `}
              >
                {/* Coluna 1: Data da realização (ícone + data) */}
                <div className="flex flex-col items-start gap-0 shrink-0 w-min">
                  <Tooltip title={realizationDate.format('DD/MM/YYYY HH:mm')}>
                    <div className="flex items-center gap-2">
                      {/* <CalendarDaysIcon className="w-5 h-5 text-slate-500" /> */}
                      <span className="text-sm font-medium text-slate-700">
                        {realizationDate.format('DD/MM/YYYY')}
                      </span>
                    </div>
                  </Tooltip>
                  <span className="text-xs text-slate-500">
                    {realizationDate.format('HH:mm')}
                  </span>
                </div>

                {/* Coluna 2: Logo banca + Instituição (ano) + Estado/Cidade */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Tooltip title={item.examBoardName ?? 'Banca'}>
                    <div className="shrink-0 w-10 h-10 rounded-lg border border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                      {item.examBoardLogoUrl ? (
                        <img
                          src={item.examBoardLogoUrl}
                          alt={item.examBoardName ?? ''}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-400">
                          {(item.examBoardName ?? '?').charAt(0)}
                        </span>
                      )}
                    </div>
                  </Tooltip>
                  <div className="flex flex-col gap-0 min-w-0">
                    <Tooltip title={item.institution ?? item.examBaseName ?? 'Prova'}>
                      <span className="text-base font-semibold text-slate-900 truncate">
                        {item.institution ?? item.examBaseName ?? 'Prova'} ({examYear})
                      </span>
                    </Tooltip>
                    <div className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                      {item.examBoardName && (
                        <Tooltip title="Banca examinadora">
                          <span>{item.examBoardName}</span>
                        </Tooltip>
                      )}
                      {location && (
                        <Tooltip title="Localidade da prova">
                          <span>{location}</span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna 3: Nota (ícone) + tendência */}
                <div className="flex items-center gap-2 shrink-0">
                  <Tooltip title={item.percentage != null ? `Taxa de acerto: ${item.percentage.toFixed(1)}%` : 'Nota disponível após finalizar a prova'}>
                    <div className="flex items-center gap-1.5">
                      <TrophyIcon className="w-5 h-5 text-slate-500" />
                      <span className="text-base font-semibold text-slate-800">
                        {item.percentage != null ? `${item.percentage.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </Tooltip>
                  {item.percentage != null && (
                    <Tooltip title={item.trendPercentage != null ? `Em relação à tentativa anterior: ${item.trendPercentage > 0 ? '+' : ''}${item.trendPercentage}%` : 'Tendência em relação à tentativa anterior (em breve)'}>
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                        {item.trendPercentage != null ? (
                          item.trendPercentage >= 0 ? (
                            <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-red-600" />
                          )
                        ) : (
                          '—'
                        )}
                        {item.trendPercentage != null && (
                          <span className={item.trendPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.trendPercentage > 0 ? '+' : ''}{item.trendPercentage}%
                          </span>
                        )}
                      </span>
                    </Tooltip>
                  )}
                </div>

                {/* Chip: Aprovado / Reprovado / Em andamento */}
                <Tooltip title={status.tooltip}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium shrink-0 ${status.className}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                    {status.label}
                  </span>
                </Tooltip>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
