import { useEffect, useRef, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { coachContext, coachCopy } from '../domain/onboarding'
import { useOnboarding } from '../useOnboarding'
import { analytics } from '@/lib/analytics'

/**
 * Coach do Ato 1: acompanha o novo usuário (perfil já feito) até escolher a
 * primeira meta, DENTRO das telas reais de concurso → cargo. Vive no layout
 * `_authenticated`, acima do conteúdo, e some sozinho quando a meta é criada
 * (o passo vira 'done'). Ao concluir, mostra um instante de sucesso com o
 * atalho para a meta (handoff para o Ato 2). Sempre dismissível ("pular").
 */
export function OnboardingCoach() {
  const { step, isActive, isManualTour, reviewPending, dismiss, hasGoal, firstGoal } =
    useOnboarding()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // A celebração é só para a conclusão NATURAL (auto). Num tour manual
  // (refresher, aberto pela dashboard) não marcamos "esteve ativo", então
  // encerrar o tour não dispara o "meta definida" indevidamente.
  const sawActive = useRef(false)
  const [successDismissed, setSuccessDismissed] = useState(false)
  useEffect(() => {
    if (isActive && !isManualTour) sawActive.current = true
  }, [isActive, isManualTour])

  const showSuccess =
    !isActive &&
    step === 'done' &&
    hasGoal &&
    sawActive.current &&
    !successDismissed

  useEffect(() => {
    if (showSuccess) analytics.capture('onboarding_goal_set')
  }, [showSuccess])

  if (showSuccess) {
    const href =
      firstGoal != null
        ? `/concursos/${firstGoal.concurso.slug ?? firstGoal.concurso.id}/${
            firstGoal.cargo.slug ?? firstGoal.cargo.id
          }`
        : '/concursos'
    return (
      <section
        aria-label="Meta definida"
        className="mb-3 flex items-center gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white">
          <CheckBadgeIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-cyan-900">
            Meta definida! Sua Mesa já gira em torno dela.
          </p>
          <p className="mt-0.5 text-xs leading-5 text-cyan-800">
            O próximo passo é montar o treino a partir do cargo.
          </p>
        </div>
        <Link
          to={href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-bold text-white no-underline transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Ir para minha meta
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => setSuccessDismissed(true)}
          aria-label="Fechar"
          className="shrink-0 rounded-full p-1 text-cyan-500 transition-colors hover:bg-cyan-100 hover:text-cyan-700"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </section>
    )
  }

  // Ato 1 (e o refresher do tour manual): ativo, fora do gate de perfil (o Ato
  // 0 tem sua própria superfície) e depois do Passo 1 do tour manual (a revisão
  // do perfil, que toma /concursos). Cobre step 'goal' (auto) e 'done' (tour
  // manual reaberto por quem já tem meta).
  if (!isActive || step === 'profile' || reviewPending) return null

  const context = coachContext(pathname)
  // Na lista, o walkthrough progressivo (na própria página) assume o Ato 1 —
  // o banner do coach não aparece; ele só guia nos níveis concurso/cargo.
  if (context === 'list') return null
  const copy = coachCopy(context)

  return (
    <section
      aria-label="Guia dos primeiros passos"
      className="mb-3 flex items-start gap-3 rounded-xl border border-cyan-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
        <AcademicCapIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-inset ring-cyan-100">
            Passo 2 de 2
          </span>
          <p className="truncate text-sm font-bold text-slate-800">
            {copy.title}
          </p>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{copy.body}</p>
        {context === 'away' && (
          <Link
            to="/concursos"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white no-underline transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            Ver concursos
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        {isManualTour ? 'Concluir tour' : 'Pular por agora'}
      </button>
    </section>
  )
}
