import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type MobileCardProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode
}

export function MobileCard({
  children,
  className = '',
  ...props
}: MobileCardProps) {
  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
