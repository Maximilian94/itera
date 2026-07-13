import { ChevronLeftIcon } from '@heroicons/react/24/outline'

/**
 * Botão de voltar que ocupa o lugar da `InstitutionMark` no header dos níveis
 * internos (cargo → treino → ponto de estudo): o subtítulo acima do h1 diz o
 * nível pai, e este botão volta a ele — sem linha de breadcrumb. Carrega o
 * `view-transition-name: institution-mark` para a marca do nível anterior
 * morfar até aqui.
 */
export const BACK_SQUARE =
  'flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-[0_1px_3px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.06)] transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:h-14 sm:w-14'

export function BackSquare(props: { 'aria-label': string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={props['aria-label']}
      onClick={props.onClick}
      style={{ viewTransitionName: 'institution-mark' }}
      className={BACK_SQUARE}
    >
      <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  )
}
