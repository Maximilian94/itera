import { useState } from 'react'
import { CustomTabPanel } from '@/ui/customTabPanel'
import { Markdown } from '@/components/Markdown'
import {
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PencilSquareIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'

const QUESTION_ALTERNATIVE_KEYS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
]

export interface QuestionWithFeedback {
  id: string
  statement: string
  statementImageUrl?: string | null
  referenceText?: string | null
  subject?: string | null
  topic?: string | null
  correctAlternative?: string | null
  selectedAlternativeId?: string | null
  alternatives: Array<{
    id: string
    key: string
    text: string
    explanation?: string | null
  }>
}

interface QuestionWithFeedbackDisplayProps {
  question: QuestionWithFeedback
}

/**
 * Displays a question with full feedback: tabs for Questão, Explicação, Comentários, etc.
 * Shows the user's marked alternative (wrong) and the correct one.
 */
export function QuestionWithFeedbackDisplay({
  question,
}: QuestionWithFeedbackDisplayProps) {
  const [value, setValue] = useState(0)
  const selectedAlternativeId = question.selectedAlternativeId ?? null
  const correctAltKey = question.correctAlternative ?? null

  const comingSoonTooltip = 'Em breve disponível. Estamos trabalhando nisso.'
  const tabButtons = [
    { value: 0, label: 'Questão', icon: PlayIcon },
    { value: 1, label: 'Explicação', icon: BookOpenIcon },
    { value: 2, label: 'Estatísticas', icon: ChartBarIcon, comingSoon: true },
    { value: 3, label: 'Comentários', icon: ChatBubbleLeftRightIcon, comingSoon: true },
    { value: 4, label: 'Histórico', icon: ClockIcon, comingSoon: true },
    { value: 5, label: 'Notas', icon: PencilSquareIcon, comingSoon: true },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabButtons.map((tab) => {
          const Icon = tab.icon
          const isActive = value === tab.value
          const isComingSoon = tab.comingSoon ?? false
          const isDisabled = isComingSoon
          const tabClasses = [
            'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
            isActive
              ? 'border-cyan-500 text-cyan-600 bg-cyan-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50',
            isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => !isDisabled && setValue(tab.value)}
              disabled={isDisabled}
              className={tabClasses}
              title={isComingSoon ? comingSoonTooltip : undefined}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0">
        <CustomTabPanel value={value} hidden={value !== 0}>
          <div className="flex flex-col gap-6 -mt-2">
            {question.referenceText != null &&
              question.referenceText.trim() !== '' && (
                <div>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Texto de referência
                  </span>
                  <div className="mt-1 text-sm text-slate-700">
                    <Markdown>{question.referenceText}</Markdown>
                  </div>
                </div>
              )}
            {question.statementImageUrl != null &&
              question.statementImageUrl.trim() !== '' && (
                <div className="max-w-[560px] rounded-lg border border-slate-300 overflow-hidden">
                  <img
                    src={question.statementImageUrl}
                    alt="Enunciado"
                    className="w-full h-auto block"
                  />
                </div>
              )}
            <div className="text-base font-medium text-slate-900">
              <Markdown>{question.statement}</Markdown>
            </div>
            <div className="flex flex-col gap-2">
              {question.alternatives.map((alt, idx) => {
                const keyLabel =
                  QUESTION_ALTERNATIVE_KEYS[idx] ?? alt.key
                const isCorrect = correctAltKey === alt.key
                const isWrong =
                  selectedAlternativeId === alt.id && !isCorrect
                const optionBg = isCorrect
                  ? 'bg-green-50 border-green-400'
                  : isWrong
                    ? 'bg-rose-50 border-rose-400'
                    : 'bg-slate-50 border-slate-300'
                const keyBadge = isCorrect
                  ? 'bg-green-600 text-white'
                  : isWrong
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-200 text-slate-700'
                return (
                  <div
                    key={alt.id}
                    className={`flex gap-3 items-center justify-start w-full p-3 rounded-lg text-left border-2 transition-colors ${optionBg}`}
                  >
                    <span
                      className={`flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold ${keyBadge}`}
                    >
                      {keyLabel}
                    </span>
                    <span className="text-sm text-slate-800 flex-1">
                      <Markdown>{alt.text}</Markdown>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== 1}>
          <div className="flex flex-col gap-6 -mt-2">
            <p className="text-sm font-semibold text-slate-700">
              Resposta correta: {correctAltKey ?? '—'}
            </p>
            <div className="flex flex-col gap-5">
              {question.alternatives.map((alt, idx) => {
                const keyLabel =
                  QUESTION_ALTERNATIVE_KEYS[idx] ?? alt.key
                const isCorrect = correctAltKey === alt.key
                const wasSelected = selectedAlternativeId === alt.id
                const isWrong = wasSelected && !isCorrect
                const variant = isCorrect
                  ? 'correct'
                  : isWrong
                    ? 'wrong'
                    : 'neutral'
                const cardStyles = {
                  correct:
                    'border-2 border-green-400 bg-green-100 overflow-hidden rounded-lg',
                  wrong:
                    'border-2 border-rose-400 bg-rose-100 overflow-hidden rounded-lg',
                  neutral:
                    'border border-slate-300 bg-slate-50 overflow-hidden rounded-lg',
                }
                const headerTextStyles = {
                  correct: 'text-green-800',
                  wrong: 'text-rose-800',
                  neutral: 'text-slate-700',
                }
                const badgeCorrect =
                  'text-xs font-semibold text-green-700 bg-green-200/80 px-2 py-0.5 rounded'
                const badgeWrong =
                  'text-xs font-semibold text-rose-700 bg-rose-200/80 px-2 py-0.5 rounded'
                const explanationWrapStyles = {
                  correct:
                    'border-t border-green-300 bg-green-50/70',
                  wrong: 'border-t border-rose-300 bg-rose-50/70',
                  neutral: 'border-t border-slate-200 bg-slate-100/70',
                }
                return (
                  <div
                    key={alt.id}
                    className={`${cardStyles[variant]}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span
                          className={`text-sm font-semibold ${headerTextStyles[variant]}`}
                        >
                          {keyLabel}.
                        </span>
                        {isCorrect && (
                          <span className={badgeCorrect}>
                            Resposta correta
                          </span>
                        )}
                        {isWrong && (
                          <span className={badgeWrong}>
                            Sua resposta
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-sm ${headerTextStyles[variant]}`}
                      >
                        <Markdown>{alt.text}</Markdown>
                      </div>
                    </div>
                    <div
                      className={`p-4 ${explanationWrapStyles[variant]}`}
                    >
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-2">
                        Explicação
                      </span>
                      {alt.explanation ? (
                        <div className="text-sm text-slate-700">
                          <Markdown>{alt.explanation}</Markdown>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500 italic">
                          Sem explicação cadastrada.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CustomTabPanel>

        <CustomTabPanel value={value} hidden={value !== 2}>
          <div className="py-2 -mt-2">
            <span className="text-sm text-slate-500">
              Estatísticas (em breve)
            </span>
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} hidden={value !== 3}>
          <div className="py-2 -mt-2">
            <span className="text-sm text-slate-500">
              Comentários (em breve)
            </span>
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} hidden={value !== 4}>
          <div className="py-2 -mt-2">
            <span className="text-sm text-slate-500">
              Histórico (em breve)
            </span>
          </div>
        </CustomTabPanel>
        <CustomTabPanel value={value} hidden={value !== 5}>
          <div className="py-2 -mt-2">
            <span className="text-sm text-slate-500">
              Notas (em breve)
            </span>
          </div>
        </CustomTabPanel>
      </div>
    </div>
  )
}
