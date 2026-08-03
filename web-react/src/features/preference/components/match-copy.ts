import type {
  ConcursoMatch,
  MatchReason,
} from '@/features/concurso/domain/concurso.types'

/** "40 min" / "1h" / "1h30" — arredonda para múltiplos de 5 min. */
function formatTravel(minutes: number): string {
  const rounded = Math.max(5, Math.round(minutes / 5) * 5)
  if (rounded < 60) return `${rounded} min`
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

const STATIC_COPY: Record<Exclude<MatchReason, 'NEARBY'>, string> = {
  CITY: 'Na sua cidade',
  STATE: 'No estado da sua busca',
  NATIONWIDE: 'Vagas em todo o Brasil',
  SALARY: 'Salário dentro do que você busca',
  REGISTRATION_OPEN: 'Inscrições abertas',
  UPCOMING: 'Prova a caminho',
}

/** Copy PT-BR dos códigos de motivo do match (backend → chips do card).
 *  NEARBY usa o tempo estimado que vem junto no payload. */
export function matchReasonLabel(
  reason: MatchReason,
  match?: Pick<ConcursoMatch, 'travelMinutes'> | null,
): string {
  if (reason === 'NEARBY') {
    const minutes = match?.travelMinutes
    return minutes != null
      ? `A ~${formatTravel(minutes)} de você`
      : 'Perto de você'
  }
  return STATIC_COPY[reason]
}
