import { Tooltip } from '@mui/material'

const PP_TOOLTIP =
  'Pontos percentuais (p.p.): é a diferença direta entre as notas (ex.: 60% → 70% = +10 p.p.). Usamos p.p. em vez de % para evitar confusão com variação percentual relativa.'

interface PpTooltipProps {
  /** Optional custom className for the span */
  className?: string
}

/** Renders "p.p." with a tooltip explaining the term. */
export function PpTooltip({ className = '' }: PpTooltipProps) {
  return (
    <Tooltip title={PP_TOOLTIP} placement="top" arrow enterDelay={300}>
      <span
        className={`cursor-help border-b border-dotted border-slate-400 ${className}`}
      >
        p.p.
      </span>
    </Tooltip>
  )
}
