import { Markdown } from '@/components/Markdown'

export interface QuestionDisplayQuestion {
  id: string
  statement: string
  statementImageUrl?: string | null
  referenceText?: string | null
  alternatives: Array<{ id: string; key: string; text: string }>
}

interface QuestionDisplayProps {
  question: QuestionDisplayQuestion
}

/**
 * Displays a single question (statement, reference text, image, alternatives).
 * Read-only; matches the layout used in ExamAttemptPlayer.
 */
export function QuestionDisplay({ question }: QuestionDisplayProps) {
  return (
    <div className="flex flex-col gap-6">
      {question.referenceText != null && question.referenceText.trim() !== '' && (
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Texto de referência
          </span>
          <div className="mt-1 text-sm text-slate-700">
            <Markdown>{question.referenceText}</Markdown>
          </div>
        </div>
      )}
      {question.statementImageUrl != null && question.statementImageUrl.trim() !== '' && (
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
        {question.alternatives.map((alt) => (
          <div
            key={alt.id}
            className="flex gap-3 items-center justify-start w-full p-3 rounded-lg text-left border-2 border-slate-300 bg-white"
          >
            <span className="flex shrink-0 items-center justify-center min-w-8 h-8 rounded-md text-sm font-semibold bg-slate-200 text-slate-700">
              {alt.key}
            </span>
            <span className="text-sm text-slate-800 flex-1">
              <Markdown>{alt.text}</Markdown>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
