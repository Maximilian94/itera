import {
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import type { ExamAttemptFeedback } from '@/features/examBaseAttempt/domain/examBaseAttempt.types'
import type {
  TrainingFinalPayload,
  TrainingStudyItemResponse,
} from '@/features/training/domain/training.types'
import { Markdown } from '@/components/Markdown'

/* ================================================================== */
/*  Diagnóstico embutido                                              */
/* ================================================================== */

/** Cor da barra/badge por desempenho contra o corte (mesma régua do /treino). */
function subjectTone(pct: number, cut: number) {
  if (pct >= cut) return { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' }
  if (pct >= cut - 15) return { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' }
  return { bar: 'bg-rose-500', badge: 'bg-rose-50 text-rose-600' }
}

export function DiagnosticoEmbed({ feedback }: { feedback: ExamAttemptFeedback }) {
  const { minPassingGradeNonQuota: cut, overall, passed, subjectStats, subjectFeedback } =
    feedback
  // Pior matéria com feedback de IA → o destaque acionável (1 só, pra não poluir).
  const worst =
    subjectStats.length > 0
      ? [...subjectStats].sort((a, b) => a.percentage - b.percentage)[0]
      : undefined
  const worstFb = worst ? subjectFeedback[worst.subject] : undefined

  return (
    <div className="flex flex-col gap-5">
      {/* Banner de resultado: cor sólida semântica (acertou/errou o corte). */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-xl px-5 py-4 text-white ${
          passed ? 'bg-emerald-600' : 'bg-rose-600'
        }`}
      >
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-wider text-white/85">
            Resultado da prova
          </p>
          <div className="mt-1.5 flex items-center gap-4">
            <div>
              <p className="text-xl font-extrabold tabular-nums">
                {overall.correct}/{overall.total}
              </p>
              <p className="text-[0.62rem] font-medium uppercase tracking-wide text-white/85">
                Questões certas
              </p>
            </div>
            <span className="h-9 w-px bg-white/25" />
            <div>
              <p className="text-xl font-extrabold tabular-nums">{cut}%</p>
              <p className="text-[0.62rem] font-medium uppercase tracking-wide text-white/85">
                Nota de corte
              </p>
            </div>
          </div>
        </div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-extrabold tabular-nums ring-4 ring-white/20">
          {Math.round(overall.percentage)}%
        </div>
      </div>

      {/* Desempenho por matéria */}
      <div>
        <p className="mb-2 text-[0.62rem] font-bold uppercase tracking-wider text-slate-500">
          Desempenho por matéria · linha = corte {cut}%
        </p>
        <div className="divide-y divide-slate-100">
          {subjectStats.map((s) => {
            const tone = subjectTone(s.percentage, cut)
            return (
              <div key={s.subject} className="py-2.5">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900">{s.subject}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${tone.badge}`}
                  >
                    {Math.round(s.percentage)}%
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className="absolute inset-y-0 z-10 w-px bg-slate-400/50"
                    style={{ left: `${Math.min(100, cut)}%` }}
                  />
                  <div
                    className={`h-full rounded-full ${tone.bar}`}
                    style={{ width: `${Math.min(100, s.percentage)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Feedback da IA — o ponto mais crítico */}
      {worst && worstFb && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
            <SparklesIcon className="h-4 w-4" />
            Feedback da IA · {worst.subject}
          </p>
          <div className="mt-1.5 text-sm leading-relaxed text-slate-700">
            <Markdown>{worstFb.evaluation}</Markdown>
          </div>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/*  Estudo embutido — lista de recomendações                          */
/* ================================================================== */

export function EstudoListEmbed(props: {
  items: Array<TrainingStudyItemResponse>
  /** Item cujo título morfa lista ↔ header do foco (view transition). */
  morphItemId?: string | null
  onOpenItem: (id: string) => void
}) {
  const { items, morphItemId, onOpenItem } = props
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma recomendação de estudo ainda. Conclua a prova e veja o diagnóstico
        para gerar seu plano.
      </p>
    )
  }

  const done = items.filter((i) => i.completedAt).length
  const pct = Math.round((done / items.length) * 100)

  // Agrupa por matéria, ordem alfabética (mesma do /treino/estudo).
  const bySubject = new Map<string, Array<TrainingStudyItemResponse>>()
  for (const it of items) {
    const list = bySubject.get(it.subject) ?? []
    list.push(it)
    bySubject.set(it.subject, list)
  }
  const groups = Array.from(bySubject.entries()).sort((a, b) =>
    a[0].localeCompare(b[0]),
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-cyan-500 transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 text-right text-sm font-bold tabular-nums text-slate-600">
          {pct}%
        </span>
      </div>

      {groups.map(([subject, subjectItems]) => (
        <div key={subject}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            {subject}
          </p>
          <div className="flex flex-col gap-2">
            {subjectItems.map((item) => {
              const isDone = Boolean(item.completedAt)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenItem(item.id)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50'
                      : 'border-slate-200 bg-white hover:border-cyan-300 hover:bg-cyan-50/50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isDone ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircleIcon className="h-5 w-5" />
                    ) : (
                      <BookOpenIcon className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-sm font-bold text-slate-900"
                      style={
                        item.id === morphItemId
                          ? { viewTransitionName: 'study-item-title' }
                          : undefined
                      }
                    >
                      {item.recommendationTitle}
                    </span>
                    {item.exercises.length > 0 && (
                      <span className="text-xs text-slate-500">
                        {item.exercises.length}{' '}
                        {item.exercises.length === 1 ? 'exercício' : 'exercícios'}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${
                      isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isDone ? 'Concluído' : 'Pendente'}
                  </span>
                  <ChevronRightIcon className="h-5 w-5 shrink-0 text-slate-300" />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ================================================================== */
/*  Final embutido — linha de progresso                               */
/* ================================================================== */

export function FinalEmbed({ final }: { final: TrainingFinalPayload }) {
  const steps = [
    { label: 'Nota inicial', value: Math.round(final.initialPercentage) },
    { label: 'Antes do estudo', value: Math.round(final.beforeStudyPercentage) },
    { label: 'Nota final', value: Math.round(final.finalPercentage), highlight: true },
  ]
  const gain = Math.round(final.gainPoints)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-end gap-3">
            {i > 0 && <ChevronRightIcon className="mb-2 h-5 w-5 text-slate-300" />}
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-wide text-slate-500">
                {s.label}
              </p>
              <p
                className={`text-2xl font-extrabold tabular-nums ${
                  s.highlight ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {s.value}%
              </p>
            </div>
          </div>
        ))}
        {gain !== 0 && (
          <span
            className={`mb-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold ${
              gain > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            <ArrowTrendingUpIcon className="h-4 w-4" />
            {gain > 0 ? '+' : ''}
            {gain} pt
          </span>
        )}
      </div>
      {final.finalFeedback && (
        <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
          <Markdown>{final.finalFeedback}</Markdown>
        </div>
      )}
    </div>
  )
}
