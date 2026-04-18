import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type PhoneSafeAreaProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode
  top?: boolean
  bottom?: boolean
}

export function PhoneSafeArea({
  children,
  className = '',
  top = false,
  bottom = false,
  ...props
}: PhoneSafeAreaProps) {
  const topClass = top ? 'pt-[var(--safe-area-inset-top)]' : ''
  const bottomClass = bottom ? 'pb-[var(--safe-area-inset-bottom)]' : ''

  return (
    <div className={`${topClass} ${bottomClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  )
}
