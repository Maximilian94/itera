import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import { Link } from '@tanstack/react-router'
import {
  BanknotesIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { Tooltip } from '@mui/material'
import dayjs from 'dayjs'
import { CalendarDaysIcon, TrophyIcon } from '@heroicons/react/24/solid'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { formatBRL } from '@/lib/utils'

const baseRowClasses = `
  border border-solid rounded-lg shadow-md
  transition-all ease-in-out duration-200 hover:shadow-sm active:shadow-none
  cursor-pointer p-2
`

function governmentScopeLabel(scope: 'MUNICIPAL' | 'STATE' | 'FEDERAL') {
  if (scope === 'MUNICIPAL') return 'Municipal'
  if (scope === 'STATE') return 'Estadual'
  return 'Federal'
}

type ExamBaseRowProps = {
  examBase: ExamBase
  /** When provided, row is selectable (onClick) instead of navigating. */
  selectable?: boolean
  selected?: boolean
  onSelect?: () => void
}

export function ExamBaseRow({ examBase, selectable, selected, onSelect }: ExamBaseRowProps) {
  const examBoardId = examBase.examBoardId
  const questionCount = examBase._count?.questions ?? 0
  const canNavigate = Boolean(examBoardId) && !selectable
  const rowClasses = `${baseRowClasses} ${
    selected ? 'border-blue-500 bg-blue-50 ring-1 ring-inset ring-blue-500' : 'border-slate-300 hover:bg-slate-100'
  }`

  const content = (
    <div className={`flex ${rowClasses}`}>
      <div className="flex w-full justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <Tooltip title={dayjs(examBase.examDate).format('DD/MMMM/YYYY')}>
            <div className="flex flex-col items-center justify-center group shrink-0">
              <CalendarDaysIcon className="w-5 h-5 text-slate-500 group-hover:text-rose-500 group-hover:rotate-10 transition-all ease-in-out duration-200" />
              <span className="text-xs text-slate-500 group-hover:text-rose-500 group-hover:text-sm group-hover:font-medium transition-all ease-in-out duration-200 select-none">
                {dayjs(examBase.examDate).format('MMM/YYYY')}
              </span>
            </div>
          </Tooltip>
          <Tooltip title={examBase.examBoard?.name ?? 'Banca'}>
            <img
              src={examBase.examBoard?.logoUrl ?? ''}
              alt={examBase.examBoard?.name ?? 'Exame'}
              className="w-10 h-10 object-contain rounded-md"
            />
          </Tooltip>
          <div className="flex flex-col items-start justify-center">
            <div className="flex items-center gap-1">
              <span className="text-md font-medium select-none">
                {examBase.institution ?? examBase.name}
              </span>
              <span className="text-md font-medium select-none">·</span>
              <span className="text-xs text-slate-500 select-none">{examBase.state ?? ''} {examBase.city ? `- ${examBase.city}` : ''}</span>
            </div>
            <span className="text-xs text-slate-400 select-none">
              {governmentScopeLabel(examBase.governmentScope)} · {examBase.role}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(examBase.userStats?.attemptCount ?? 0) > 0 && (
            <>
              <Tooltip title="Melhor nota">
                <div className="flex flex-col items-center justify-center group">
                  <TrophyIcon className="w-5 h-5 text-slate-500 group-hover:text-amber-500 group-hover:rotate-10 transition-all ease-in-out duration-200" />
                  <span className="text-xs text-slate-500 group-hover:text-amber-500 group-hover:text-sm group-hover:font-medium transition-all ease-in-out duration-200 select-none">
                    {examBase.userStats?.bestScore != null
                      ? `${examBase.userStats.bestScore.toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
              </Tooltip>
              <Tooltip title="Tentativas realizadas">
                <div className="flex flex-col items-center justify-center group">
                  <ArrowPathIcon className="w-5 h-5 text-slate-500 group-hover:text-indigo-500 group-hover:rotate-10 transition-all ease-in-out duration-200" />
                  <span className="text-xs text-slate-500 group-hover:text-indigo-500 group-hover:text-sm group-hover:font-medium transition-all ease-in-out duration-200 select-none">
                    {examBase.userStats!.attemptCount} Tentativas
                  </span>
                </div>
              </Tooltip>
            </>
          )}
          <Tooltip title="Quantidade de questões">
            <div className="flex flex-col items-center justify-center group">
              <DocumentTextIcon className="w-5 h-5 text-slate-500 group-hover:text-blue-500 group-hover:rotate-10 transition-all ease-in-out duration-200" />
              <span className="text-xs text-slate-500 group-hover:text-blue-500 group-hover:text-sm group-hover:font-medium transition-all ease-in-out duration-200 select-none">
                {questionCount} Questões
              </span>
            </div>
          </Tooltip>
          <Tooltip title="Salário base">
            <div className="flex flex-col items-center justify-center group">
              <BanknotesIcon className="w-5 h-5 text-slate-500 group-hover:text-green-500 group-hover:rotate-10 transition-all ease-in-out duration-200" />
              <span className="text-xs text-slate-500 group-hover:text-green-500 group-hover:text-sm group-hover:font-medium transition-all ease-in-out duration-200 select-none">
                {formatBRL(examBase.salaryBase ?? 0)}
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
    </div>
  )

  if (selectable && onSelect) {
    return (
      <button type="button" onClick={onSelect} className="block w-full text-left">
        {content}
      </button>
    )
  }
  if (canNavigate) {
    return (
      <Link
        to="/exams/$examBoard/$examId"
        params={{ examBoard: examBoardId!, examId: examBase.id }}
        className="block"
      >
        {content}
      </Link>
    )
  }
  return <div className="block">{content}</div>
}
