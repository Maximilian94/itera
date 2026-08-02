import { useState } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type {
  ConcursoEtapa,
  ConcursoStatus,
  ConcursoTimeline,
} from '../domain/concurso.types'

export type TimelineStepState = 'done' | 'current' | 'upcoming'

export type TimelineStep = {
  label: string
  /** ISO date-only (ou início do intervalo); null → "A definir" (some do
   *  cronograma a menos que `keepUndated`). */
  startIso: string | null
  /** Fim do intervalo quando a etapa é um período (ex.: inscrições). */
  endIso?: string | null
  state: TimelineStepState
  /** Descrição opcional (caráter da etapa) — mostrada abaixo da data. */
  description?: string | null
  /** Marco-chave do certame (inscrições/prova/gabarito/resultado). Etapas
   *  burocráticas (`major: false`) ficam atrás do "Ver cronograma completo";
   *  ausente = marco (os cronogramas derivados só têm marcos). */
  major?: boolean
}

/* Datas do edital são date-only; formatamos em UTC para não derivar um dia
 * pelo fuso. */
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayOnly = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' })
const monthShort = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })

/**
 * Mapeia o `timeline` da API para as etapas do cronograma; estados derivam
 * do status temporal do concurso (que o backend já calculou). O componente
 * formata as datas; etapas sem data ficam de fora (o filtro é dele).
 */
export function buildConcursoTimelineSteps(
  timeline: ConcursoTimeline,
  status: ConcursoStatus,
): Array<TimelineStep> {
  return [
    {
      label: 'Inscrições',
      startIso: timeline.registrationStart ?? timeline.registrationEnd,
      endIso: timeline.registrationStart != null ? timeline.registrationEnd : null,
      state: status === 'open' ? 'current' : 'done',
    },
    {
      label: 'Prova objetiva',
      startIso: timeline.examDate,
      endIso: null,
      state: status === 'future' ? 'current' : status === 'past' ? 'done' : 'upcoming',
    },
    {
      label: 'Resultado final',
      startIso: timeline.resultDate,
      endIso: null,
      state: status === 'past' ? 'done' : 'upcoming',
    },
  ]
}

/* Curadoria do cronograma: os editais listam dezenas de micro-eventos
 * (recursos, retificações, boletos) com o mesmo peso da Prova Objetiva.
 * Classificamos cada etapa como marco (major) ou burocracia (minor) para o
 * componente poder colapsar as menores. Ordem das regras importa: a
 * homologação final vence "retificação"; "Divulgação da Nota da Prova" cai
 * em minor antes do genérico "prova". */
const FINAL_RE = /resultado final|classifica[çc][ãa]o final|homologa[çc][ãa]o do concurso/i
const MINOR_RE =
  /recurso|julgamento|retifica[çc]|boleto|pagamento|isen[çc]|impugna|inscritos|convoca[çc]|edital|\bnota\b|taxa|local e hor/i
const MAJOR_RE = /inscri[çc][õo]es|\bprova\b|gabarito|resultado/i

/** Marco-chave do certame? (exportada para teste) */
export function isEtapaMajor(name: string): boolean {
  if (FINAL_RE.test(name)) return true
  if (MINOR_RE.test(name)) return false
  return MAJOR_RE.test(name)
}

/* Pares "X — início"/"X — fim" viram UMA etapa com intervalo de datas. */
const RANGE_SUFFIX_RE = /\s*[-–—]\s*(in[íi]cio|fim)\s*$/i

type CondensedEtapa = {
  name: string
  description: string | null
  /** ISO date-only da etapa (ou início do intervalo). */
  dateStart: string | null
  /** Fim do intervalo, quando a etapa veio de um par início/fim. */
  dateEnd: string | null
}

/** Funde pares "— início"/"— fim" numa etapa só (exportada para teste). */
export function condenseEtapas(etapas: Array<ConcursoEtapa>): Array<CondensedEtapa> {
  const out: Array<CondensedEtapa> = []
  const openRanges = new Map<string, CondensedEtapa>()

  for (const etapa of etapas) {
    const match = RANGE_SUFFIX_RE.exec(etapa.name)
    if (match == null) {
      out.push({
        name: etapa.name,
        description: etapa.description ?? null,
        dateStart: etapa.date ?? null,
        dateEnd: null,
      })
      continue
    }
    const base = etapa.name.slice(0, match.index).trim()
    const key = base.toLocaleLowerCase('pt-BR')
    const isStart = /^in/i.test(match[1])
    const open = openRanges.get(key)
    if (open != null) {
      // Segunda metade do par: completa o intervalo já publicado em `out`.
      if (isStart) open.dateStart = etapa.date ?? open.dateStart
      else open.dateEnd = etapa.date ?? open.dateEnd
      open.description ??= etapa.description ?? null
      openRanges.delete(key)
      continue
    }
    const condensed: CondensedEtapa = {
      name: base,
      description: etapa.description ?? null,
      dateStart: isStart ? (etapa.date ?? null) : null,
      dateEnd: isStart ? null : (etapa.date ?? null),
    }
    openRanges.set(key, condensed)
    out.push(condensed)
  }

  // Metade sem par: mostra a data que tiver (início OU fim) como pontual.
  for (const orphan of openRanges.values()) {
    orphan.dateStart ??= orphan.dateEnd
    orphan.dateEnd = orphan.dateEnd === orphan.dateStart ? null : orphan.dateEnd
  }
  return out
}

/**
 * Constrói o cronograma a partir das ETAPAS datadas do concurso. Pares
 * início/fim viram um intervalo; ordena por data (as sem data vão para o
 * fim); estado deriva de hoje: encerradas = done, a primeira em aberto =
 * current, as demais = upcoming. Marca `major` para o colapso do componente.
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
  const parse = (d: string | null) =>
    d != null && /^\d{4}-\d{2}-\d{2}/.test(d) ? Date.parse(`${d.slice(0, 10)}T00:00:00Z`) : null
  const iso = (ts: number) => new Date(ts).toISOString().slice(0, 10)

  const withTs = condenseEtapas(etapas).map((etapa) => {
    const end = parse(etapa.dateEnd)
    // Par cujo "início" veio sem data: a data do fim ancora a etapa.
    const start = parse(etapa.dateStart) ?? end
    return { etapa, start, end: end ?? start }
  })
  const dated = withTs
    .filter((e): e is typeof e & { start: number; end: number } => e.start != null)
    .sort((a, b) => a.start - b.start)
  const undated = withTs.filter((e) => e.start == null)
  // A primeira etapa ainda não encerrada é a corrente (intervalos contam
  // enquanto o fim não passa).
  const currentStart = dated.find((e) => e.end >= todayUTC)?.start ?? null

  return [...dated, ...undated].map(({ etapa, start, end }) => ({
    label: etapa.name,
    description: etapa.description,
    startIso: start != null ? iso(start) : null,
    endIso: start != null && end != null && end !== start ? iso(end) : null,
    major: isEtapaMajor(etapa.name),
    state:
      start == null
        ? 'upcoming'
        : (end ?? start) < todayUTC
          ? 'done'
          : start === currentStart
            ? 'current'
            : 'upcoming',
  }))
}

/** Dias de hoje (local) até a data UTC do edital; negativo = passado. */
function daysUntilUTC(isoDate: string): number | null {
  const target = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(target)) return null
  const now = new Date()
  return Math.round(
    (target - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000,
  )
}

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

/** Contagem regressiva do marco corrente ("termina em 15 dias" / "é hoje"). */
function countdownLabel(startIso: string | null, endIso: string | null): string | null {
  const target = endIso ?? startIso
  if (target == null) return null
  const left = daysUntilUTC(target)
  if (left == null || left < 0) return null
  const isRange = endIso != null && endIso !== startIso
  if (left === 0) return isRange ? 'termina hoje' : 'é hoje'
  return isRange ? `termina em ${dias(left)}` : `em ${dias(left)}`
}

/** Bloco-calendário (dia + mês) que ancora cada etapa no trilho. */
function DateBlock({ step }: { step: TimelineStep }) {
  const tone =
    step.state === 'current'
      ? 'bg-cyan-700 text-white'
      : step.state === 'done'
        ? 'bg-slate-100 text-slate-600'
        : step.startIso != null
          ? 'border border-slate-200 bg-white text-slate-700'
          : 'border border-dashed border-slate-300 bg-white text-slate-400'
  return (
    <span
      className={`relative z-10 flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg ${tone}`}
    >
      {step.startIso != null ? (
        <>
          <span className="text-sm font-bold leading-none tabular-nums">
            {dayOnly.format(new Date(step.startIso))}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase leading-none">
            {monthShort.format(new Date(step.startIso)).replace('.', '')}
          </span>
        </>
      ) : (
        <span className="text-sm font-bold">—</span>
      )}
      {step.state === 'done' && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-600 text-white">
          <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </span>
  )
}

/**
 * Cronograma vertical do sidebar. A data é a âncora visual (bloco-calendário);
 * o trilho pinta de cyan até o marco corrente (progresso do certame) e o
 * corrente ganha wash + contagem regressiva. Etapas burocráticas
 * (`major: false`) começam colapsadas — só os marcos e a etapa corrente
 * aparecem; "Ver cronograma completo" expande o resto.
 */
export function VerticalTimeline({
  steps,
  keepUndated = false,
}: {
  steps: Array<TimelineStep>
  /** Mantém etapas sem data (mostradas como "A definir"). */
  keepUndated?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const all = keepUndated ? steps : steps.filter((s) => s.startIso != null)
  // A etapa corrente sempre aparece, mesmo burocrática — é o que vem aí.
  const marcos = all.filter((s) => s.major !== false || s.state === 'current')
  const visible = expanded ? all : marcos
  const hiddenCount = all.length - marcos.length
  const currentYear = new Date().getUTCFullYear()

  return (
    <>
      <ol className="mt-3 flex flex-col">
        {visible.map((step, i) => {
          const isCurrent = step.state === 'current'
          const endIso = step.endIso ?? null
          const isRange = endIso != null && endIso !== step.startIso
          const countdown = isCurrent ? countdownLabel(step.startIso, endIso) : null
          const meta =
            step.startIso == null
              ? 'A definir'
              : isRange
                ? `até ${fullDate.format(new Date(endIso))}`
                : new Date(step.startIso).getUTCFullYear() !== currentYear
                  ? fullDate.format(new Date(step.startIso))
                  : null
          /* Trilho contínuo em segmentos flex: cada linha tem meia-perna acima
           * e abaixo do bloco, que se esticam com a altura do conteúdo — assim
           * bloco e texto podem centralizar juntos sem quebrar o trilho. A
           * perna é cyan quando o conector já foi percorrido (etapa de cima
           * concluída) — o cronograma também é um indicador de progresso. */
          const legAbove =
            i > 0 && visible[i - 1].state === 'done' ? 'bg-cyan-600' : 'bg-slate-200'
          const legBelow = step.state === 'done' ? 'bg-cyan-600' : 'bg-slate-200'
          return (
            <li
              key={`${step.label}-${i}`}
              /* Wash cyan-tint marca o "você está aqui" (One Accent Rule:
                 o corrente é a única linha com o acento como fill). */
              className={`flex gap-3 ${isCurrent ? '-mx-2 rounded-xl bg-cyan-50 px-2' : ''}`}
            >
              <div className="flex w-10 shrink-0 flex-col items-center">
                <span
                  aria-hidden
                  className={`mb-1 w-0.5 flex-1 rounded-full ${
                    i === 0 ? 'invisible' : legAbove
                  }`}
                />
                <DateBlock step={step} />
                <span
                  aria-hidden
                  className={`mt-1 w-0.5 flex-1 rounded-full ${
                    i === visible.length - 1 ? 'invisible' : legBelow
                  }`}
                />
              </div>
              <div className="flex min-w-0 flex-col justify-center py-2">
                <p
                  className={`line-clamp-2 text-sm font-semibold ${
                    isCurrent
                      ? 'text-slate-900'
                      : step.state === 'done'
                        ? 'text-slate-500'
                        : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                {meta != null && <p className="text-xs text-slate-600">{meta}</p>}
                {countdown != null && (
                  <p className="mt-0.5 text-xs font-semibold text-cyan-700">
                    {countdown}
                  </p>
                )}
                {step.description != null && step.description !== '' && (
                  <p className="mt-0.5 text-xs text-slate-500">{step.description}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
      {hiddenCount > 0 && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex w-fit cursor-pointer items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          {expanded
            ? 'Mostrar só os marcos'
            : `Ver cronograma completo (${all.length} etapas)`}
          <ChevronDownIcon
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </>
  )
}
