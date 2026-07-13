import { METER_BAR } from './motion'

const SIZES = {
  /** Card de cargo no nível 1. */
  sm: { track: 'h-2 bg-slate-100', marker: 'h-3.5 bg-slate-400' },
  /** Plano de estudos no nível 2. */
  md: { track: 'h-2.5 bg-slate-200/70', marker: 'h-4 bg-slate-500' },
} as const

/**
 * Barra de prontidão: melhor nota do usuário contra a nota de corte.
 * Verde só quando passa do corte (feedback de desempenho); sem corte,
 * barra simples cyan sem marcador.
 */
export function ReadinessBar(props: {
  /** Melhor nota, % inteiro 0..100. */
  value: number
  /** Nota de corte, % inteiro 0..100; null → sem marcador. */
  cut: number | null
  /** Vem de `useMeters()`: anima a largura de 0 ao valor no mount. */
  meters: boolean
  size?: keyof typeof SIZES
  className?: string
}) {
  const { value, cut, meters, size = 'md', className = '' } = props
  const passing = cut != null && value >= cut
  return (
    <div className={`relative rounded-full ${SIZES[size].track} ${className}`}>
      <div
        className={`${METER_BAR} ${passing ? 'bg-emerald-500' : 'bg-cyan-500'}`}
        style={{ width: meters ? `${value}%` : '0%' }}
      />
      {cut != null && (
        <div
          className={`absolute top-1/2 w-0.5 -translate-y-1/2 rounded-full ${SIZES[size].marker}`}
          style={{ left: `${cut}%` }}
        />
      )}
    </div>
  )
}
