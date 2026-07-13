import type { ConcursoStatus } from '../domain/concurso.types'

/**
 * Pill dos 3 estados temporais do concurso. Tom vem do status (passado →
 * slate; aberto/futuro → cyan); o texto vem pronto de fora, já que o
 * enquadramento ("encerram em N dias", "Prova em N dias", data aplicada)
 * é responsabilidade da rota. Dot pulsante só em `open`.
 */
export function StatusPill({ status, label }: { status: ConcursoStatus; label: string }) {
  if (status === 'past') {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 py-1 pl-2.5 pr-3 text-xs font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-600/10">
      <span className="relative flex h-1.5 w-1.5">
        {status === 'open' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-60 motion-reduce:hidden" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-600" />
      </span>
      {label}
    </span>
  )
}
