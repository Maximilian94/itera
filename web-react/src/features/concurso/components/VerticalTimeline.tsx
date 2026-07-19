import { CheckIcon } from '@heroicons/react/24/outline'
import type {
  ConcursoEtapa,
  ConcursoStatus,
  ConcursoTimeline,
} from '../domain/concurso.types'

export type TimelineStepState = 'done' | 'current' | 'upcoming'

export type TimelineStep = {
  label: string
  /** null → a etapa some do cronograma (a menos que `keepUndated`). */
  date: string | null
  state: TimelineStepState
  /** Descrição opcional (caráter da etapa) — mostrada abaixo da data. */
  description?: string | null
}

const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const fmt = (iso: string | null, formatter: Intl.DateTimeFormat) =>
  iso != null ? formatter.format(new Date(iso)) : null

/**
 * Mapeia o `timeline` da API para as etapas do cronograma; estados
 * derivam do status temporal do concurso (que o backend já calculou).
 * Etapas sem data ficam de fora — `VerticalTimeline` também as filtra.
 */
export function buildConcursoTimelineSteps(
  timeline: ConcursoTimeline,
  status: ConcursoStatus,
): Array<TimelineStep> {
  const regStart = fmt(timeline.registrationStart, dayMonth)
  const regEnd = fmt(timeline.registrationEnd, dayMonth)
  const registration =
    regStart != null && regEnd != null ? `${regStart} a ${regEnd}` : (regStart ?? regEnd)

  return [
    {
      label: 'Inscrições',
      date: registration,
      state: status === 'open' ? 'current' : 'done',
    },
    {
      label: 'Prova objetiva',
      date: fmt(timeline.examDate, fullDate),
      state: status === 'future' ? 'current' : status === 'past' ? 'done' : 'upcoming',
    },
    {
      label: 'Resultado final',
      date: fmt(timeline.resultDate, fullDate),
      state: status === 'past' ? 'done' : 'upcoming',
    },
  ]
}

/**
 * Constrói o cronograma a partir das ETAPAS datadas do concurso. Ordena por
 * data (as sem data vão para o fim); estado deriva de hoje: passadas = done, a
 * próxima futura = current, as demais = upcoming.
 */
export function buildEtapaTimelineSteps(
  etapas: Array<ConcursoEtapa>,
): Array<TimelineStep> {
  const today = new Date()
  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  )
  const parse = (d: string | null | undefined) =>
    d != null && /^\d{4}-\d{2}-\d{2}/.test(d) ? Date.parse(`${d.slice(0, 10)}T00:00:00Z`) : null

  const withTs = etapas.map((e) => ({ etapa: e, ts: parse(e.date) }))
  const dated = withTs
    .filter((e): e is { etapa: ConcursoEtapa; ts: number } => e.ts != null)
    .sort((a, b) => a.ts - b.ts)
  const undated = withTs.filter((e) => e.ts == null)
  const currentTs = dated.find((e) => e.ts >= todayUTC)?.ts ?? null

  return [...dated, ...undated].map(({ etapa, ts }) => ({
    label: etapa.name,
    description: etapa.description ?? null,
    date: ts != null ? fullDate.format(new Date(ts)) : null,
    state:
      ts == null
        ? 'upcoming'
        : ts < todayUTC
          ? 'done'
          : ts === currentTs
            ? 'current'
            : 'upcoming',
  }))
}

/** Cronograma vertical do sidebar (done/current/upcoming). */
export function VerticalTimeline({
  steps,
  keepUndated = false,
}: {
  steps: Array<TimelineStep>
  /** Mantém etapas sem data (mostradas como "A definir"). */
  keepUndated?: boolean
}) {
  const visible = keepUndated ? steps : steps.filter((s) => s.date != null)
  return (
    <ol className="mt-4 flex flex-col">
      {visible.map((step, i) => (
        <li key={`${step.label}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
          {i < visible.length - 1 && (
            <span className="absolute left-[11px] top-6 h-full w-px bg-slate-200" />
          )}
          {step.state === 'done' ? (
            <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
              <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
          ) : step.state === 'current' ? (
            <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-600 ring-4 ring-cyan-100">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
          ) : (
            <span className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            </span>
          )}
          <div className="min-w-0 pt-0.5">
            <p
              className={`text-sm font-semibold ${
                step.state === 'current'
                  ? 'text-cyan-700'
                  : step.state === 'done'
                    ? 'text-slate-900'
                    : 'text-slate-400'
              }`}
            >
              {step.label}
            </p>
            <p className="text-xs text-slate-500">{step.date ?? 'A definir'}</p>
            {step.description != null && step.description !== '' && (
              <p className="mt-0.5 text-xs text-slate-400">{step.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
