import { Link, useRouterState } from '@tanstack/react-router'
import { Fragment } from 'react'
import { TREINO_STAGES, getStagePath } from './stages.config'

export function TreinoStepper() {
  const router = useRouterState()
  const pathname = router.location.pathname

  const currentIndex = (() => {
    if (pathname === '/treino') return -1
    const segment = pathname.replace(/^\/treino\/?/, '').split('/')[0]
    const idx = TREINO_STAGES.findIndex((s) => s.slug === segment)
    return idx >= 0 ? idx : -1
  })()

  return (
    <nav
      className="flex flex-wrap items-center gap-2 sm:gap-0 sm:flex-nowrap border border-slate-300 rounded-lg bg-slate-50 p-2 mb-4"
      aria-label="Etapas do treino"
    >
      <Link
        to="/treino"
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
          currentIndex === -1
            ? 'bg-slate-200 text-slate-800 ring-1 ring-slate-400'
            : 'text-slate-600 hover:bg-slate-200'
        }`}
      >
        <span className="hidden sm:inline">Início</span>
        <span className="sm:hidden">1</span>
      </Link>
      {TREINO_STAGES.map((stage, index) => {
        const isActive = currentIndex === index
        const isPast = currentIndex > index
        const path = getStagePath(stage.slug)
        const StageIcon = stage.icon
        return (
          <Fragment key={stage.id}>
            <div
              className="hidden sm:block w-6 h-0.5 shrink-0 bg-slate-300"
              aria-hidden
            />
            <Link
              to={path}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
                isActive
                  ? `${stage.activeBg} text-white ring-1 ring-offset-1 ring-slate-400`
                  : isPast
                    ? 'text-slate-600 hover:bg-slate-200 bg-slate-100'
                    : 'text-slate-500 hover:bg-slate-200'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              <StageIcon className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline">{stage.title}</span>
              <span className="md:hidden">{stage.id}</span>
            </Link>
          </Fragment>
        )
      })}
    </nav>
  )
}
