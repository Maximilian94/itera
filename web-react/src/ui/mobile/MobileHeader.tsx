import type { ReactNode } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { PhoneSafeArea } from './PhoneSafeArea'

interface MobileHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  actions?: ReactNode
  bottom?: ReactNode
}

export function MobileHeader({
  title,
  subtitle,
  onBack,
  actions,
  bottom,
}: MobileHeaderProps) {
  return (
    <PhoneSafeArea
      top
      className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-700"
            aria-label="Voltar"
          >
            <ArrowLeftIcon className="size-5" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-slate-900">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {bottom ? <div className="px-4 pb-3">{bottom}</div> : null}
    </PhoneSafeArea>
  )
}
