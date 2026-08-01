/**
 * "Há quantos dias este concurso não é verificado?" — a manutenção da timeline
 * de Notícias é majoritariamente manual (o admin clica em "Verificar novas
 * publicações" / "Atualizar concursos"), então o que interessa na listagem não
 * é a data em si, e sim o tempo que passou desde a última leitura da origem.
 */

/** A partir de quantos dias sem verificar o concurso é considerado atrasado. */
export const STALE_AFTER_DAYS = 7

export interface CheckFreshness {
  /** Dias inteiros desde a última verificação; null = nunca verificado. */
  days: number | null
  /** Rótulo pronto: "nunca verificado", "verificado hoje", "há 3 dias". */
  label: string
  /** true quando nunca foi verificado ou passou de STALE_AFTER_DAYS. */
  stale: boolean
}

/** Meia-noite local — a contagem é em dias de calendário, não em blocos de 24h. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Diferença em dias de calendário entre a última verificação e hoje. Calendário
 * (e não 24h corridas) porque "verificado ontem às 23h" deve ler "há 1 dia",
 * não "há 0 dias". `Math.round` absorve as horas de DST; relógio adiantado
 * (data futura) satura em 0 em vez de virar negativo.
 */
export function daysSinceCheck(
  checkedAt: string | null | undefined,
  now: Date = new Date(),
): number | null {
  if (checkedAt == null) return null
  const checked = new Date(checkedAt)
  if (Number.isNaN(checked.getTime())) return null
  const diff = (startOfDay(now) - startOfDay(checked)) / 86_400_000
  return Math.max(0, Math.round(diff))
}

export function checkFreshness(
  checkedAt: string | null | undefined,
  now: Date = new Date(),
): CheckFreshness {
  const days = daysSinceCheck(checkedAt, now)
  if (days == null)
    return { days: null, label: 'nunca verificado', stale: true }
  if (days === 0) return { days, label: 'verificado hoje', stale: false }
  return {
    days,
    label: `há ${days} ${days === 1 ? 'dia' : 'dias'}`,
    stale: days >= STALE_AFTER_DAYS,
  }
}
