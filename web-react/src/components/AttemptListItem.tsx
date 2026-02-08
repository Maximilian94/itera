import type { ExamBaseAttemptHistoryItem } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import { ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import dayjs from 'dayjs'

export type AttemptListItemProps = {
  item: ExamBaseAttemptHistoryItem
  onClick?: (item: ExamBaseAttemptHistoryItem) => void
}

export function AttemptListItem({ item, onClick }: AttemptListItemProps) {
  const isClickable = item.examBoardId != null && onClick != null
  const status =
    item.finishedAt == null
      ? { label: 'Em andamento', icon: ClockIcon, className: 'text-amber-600 bg-amber-50' }
      : item.passed === true
        ? { label: 'Aprovado', icon: CheckCircleIcon, className: 'text-green-600 bg-green-50' }
        : { label: 'Reprovado', icon: XCircleIcon, className: 'text-red-600 bg-red-50' }
  const StatusIcon = status.icon
  const date = item.finishedAt ? dayjs(item.finishedAt) : dayjs(item.startedAt)

  return (
    <div
      role={isClickable ? 'button' : undefined}
      onClick={() => isClickable && onClick(item)}
      className={`
        w-full flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-left
        transition-all ease-in-out duration-200
        ${isClickable ? 'hover:bg-slate-50 hover:border-slate-300 cursor-pointer' : 'cursor-default opacity-80'}
      `}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <TrophyIcon className="w-4 h-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">
            {item.institution ?? item.examBaseName ?? 'Prova'}
          </p>
          <p className="text-xs text-slate-500">
            {date.format('DD/MM/YYYY HH:mm')}
            {item.examBoardName && ` · ${item.examBoardName}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.percentage != null && (
          <span className="text-sm font-semibold text-slate-700">
            {item.percentage.toFixed(0)}%
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${status.className}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </span>
      </div>
    </div>
  )
}
