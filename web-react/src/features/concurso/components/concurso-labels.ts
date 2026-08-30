/**
 * Rótulos compartilhados do card de concurso (nível 0).
 *
 * Extraídos da rota `/concursos` quando o mapa passou a precisar dos mesmos
 * textos: a pílula no mapa e a linha da lista têm que dizer a MESMA coisa sobre
 * o mesmo concurso. Duas cópias divergiriam na primeira mudança de copy.
 *
 * Datas do edital são date-only; formatamos em UTC (mesma convenção do nível 1)
 * para não derivar um dia pelo fuso.
 */
import type {
  ConcursoListItem,
  ConcursoStatus,
} from '../domain/concurso.types'

const monthYear = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayMonth = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

/** Dias de hoje (local) até a data UTC do edital; negativo = passado. */
export function daysUntil(iso: string | null): number | null {
  if (iso == null) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  const ms =
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      target.getUTCDate(),
    ) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round(ms / 86_400_000)
}

const dias = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`

/**
 * Linha temporal do card, específica do estado (a "Data" vive aqui):
 * - aberto  → prazo de inscrição (+ data da prova); `urgent` quando ≤7 dias;
 * - futuro  → contagem para a prova;
 * - passado → mês/ano de aplicação.
 */
export function temporalText(item: ConcursoListItem): {
  text: string
  urgent: boolean
} {
  const { timeline: t } = item
  if (item.status === 'open') {
    const exam =
      t.examDate != null ? ` · prova ${dayMonth.format(new Date(t.examDate))}` : ''
    const left = daysUntil(t.registrationEnd)
    if (left == null || left < 0)
      return { text: `Inscrições abertas${exam}`, urgent: false }
    if (left === 0)
      return { text: `Inscrições encerram hoje${exam}`, urgent: true }
    return {
      text: `Inscrições encerram em ${dias(left)}${exam}`,
      urgent: left <= 7,
    }
  }
  if (item.status === 'future') {
    const exam =
      t.examDate != null ? ` · ${dayMonth.format(new Date(t.examDate))}` : ''
    const left = daysUntil(t.examDate)
    if (left == null || left < 0) return { text: 'Prova em breve', urgent: false }
    if (left === 0) return { text: 'Prova hoje', urgent: true }
    return { text: `Prova em ${dias(left)}${exam}`, urgent: false }
  }
  const applied =
    t.examDate != null ? monthYear.format(new Date(t.examDate)) : null
  return {
    text: applied != null ? `Aplicada em ${applied}` : 'Prova aplicada',
    urgent: false,
  }
}

/* Salário sem centavos, e a faixa larga sem repetir "R$" no segundo número:
 * "R$ 4.800 – 8.500" lê mais limpo que dois valores completos. */
const compactCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function salaryRange(
  min: string | null,
  max: string | null,
): string | null {
  if (min == null || max == null) return null
  if (min === max) return compactCurrency.format(Number(min))
  const top = compactCurrency.format(Number(max)).replace(/^R\$\s?/, '')
  return `${compactCurrency.format(Number(min))} – ${top}`
}

export function locationLabel(item: ConcursoListItem): string | null {
  if (item.city != null) {
    return `${item.city}${item.state != null ? `/${item.state}` : ''}`
  }
  return item.state
}

/** Cor da linha temporal: cyan p/ aberto (ação), âmbar na urgência de prazo
 *  (regra "tempo acabando" do DESIGN), slate p/ futuro, slate apagado p/ passado. */
export function temporalClass(
  status: ConcursoStatus,
  urgent: boolean,
): string {
  if (status === 'open') {
    return urgent
      ? 'font-semibold text-amber-700'
      : 'font-semibold text-cyan-700'
  }
  if (status === 'future') return 'font-medium text-slate-600'
  return 'text-slate-500'
}

/* ── Rótulos curtos, exclusivos do mapa ─────────────────────────────────────
 * A pílula do mapa tem ~180px: não cabe "Inscrições encerram em 12 dias".
 * Estes são a versão telegráfica dos mesmos fatos. */

/**
 * O prazo que importa, em telegrama. Não é sempre a prova: com inscrição
 * aberta, o relógio que corre é o da INSCRIÇÃO — e boa parte dos editais
 * abertos ainda não tem data de prova marcada (aí "prova em —" não diz nada).
 * Então o estado escolhe qual prazo mostrar, e o rótulo diz qual é.
 */
export function shortCountdown(item: ConcursoListItem): string {
  const { timeline: t } = item

  if (item.status === 'open') {
    const left = daysUntil(t.registrationEnd)
    if (left == null || left < 0) return 'inscrições abertas'
    return left === 0 ? 'inscr. encerra hoje' : `inscr. ${left}d`
  }

  if (item.status === 'future') {
    const left = daysUntil(t.examDate)
    if (left == null || left < 0) return 'prova a definir'
    if (left === 0) return 'prova hoje'
    if (left < 30) return `prova ${left}d`
    const months = Math.round(left / 30)
    return `prova ${months} ${months === 1 ? 'mês' : 'meses'}`
  }

  return t.examDate != null
    ? monthYear.format(new Date(t.examDate))
    : 'aplicada'
}

/** Salário só com o teto, para caber na pílula: "até R$ 8.500". */
export function shortSalary(item: ConcursoListItem): string | null {
  if (item.salaryMax == null) return null
  return `até ${compactCurrency.format(Number(item.salaryMax))}`
}
