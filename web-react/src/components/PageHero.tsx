interface PageHeroProps {
  /** Optional label above the title (e.g. greeting) */
  greeting?: string
  /** Main heading */
  title: string
  /** Optional description paragraph */
  description?: string
  /** Optional content rendered below the text (e.g. stats, actions) */
  children?: React.ReactNode
  /** Animation style. Default: fade-in-down 0.5s ease-out both */
  animation?: string
  /** Gradient/color: full Tailwind class (e.g. "bg-linear-to-br from-rose-600 to-pink-500"). Overrides variant when provided. */
  gradient?: string
  /** Gradient variant. Used when gradient is not provided. Default: blue */
  variant?: 'blue' | 'emerald' | 'violet' | 'indigo' | 'rose' | 'slate'
  /** Rounded corners. Default: rounded-lg (dashboard style) */
  rounded?: string
  /** Padding. Default: px-6 py-6 (dashboard style) */
  padding?: string
}

const variantClasses: Record<NonNullable<PageHeroProps['variant']>, string> = {
  blue: 'bg-linear-to-br from-blue-600 via-blue-900 to-blue-950',
  emerald: 'bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600',
  violet: 'bg-linear-to-br from-violet-700 via-violet-600 to-indigo-600',
  indigo: 'bg-linear-to-br from-indigo-600 via-indigo-500 to-violet-500',
  rose: 'bg-linear-to-br from-rose-600 via-rose-500 to-pink-500',
  slate: 'bg-linear-to-br from-slate-600 via-slate-500 to-slate-400',
}

const descriptionOpacityClasses: Record<NonNullable<PageHeroProps['variant']>, string> = {
  blue: 'text-white/50',
  emerald: 'text-emerald-100/80',
  violet: 'text-violet-200/80',
  indigo: 'text-indigo-100/80',
  rose: 'text-white/70',
  slate: 'text-white/70',
}

export function PageHero({
  greeting,
  title,
  description,
  children,
  gradient,
  variant = 'blue',
}: PageHeroProps) {
  const animation = 'fade-in-down 0.5s ease-out both'
  const gradientClass = gradient ?? variantClasses[variant]
  const descClass = gradient
    ? 'text-white/70'
    : descriptionOpacityClasses[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-lg px-6 py-6 -m-2 ${gradientClass}`}
      style={{ animation }}
    >
      {/* decorative shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-white/3" />
      </div>

      <div
        className={`relative z-10 flex flex-col ${children ? 'md:flex-row md:items-center md:justify-between gap-6' : 'gap-4'}`}
      >
        <div>
          {greeting && (
            <p className="text-white/60 text-sm font-medium">{greeting}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-1 tracking-tight">
            {title}
          </h1>
          {description != null && (
            <p className={`text-sm mt-2 max-w-lg ${descClass}`}>
              {description}
            </p>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
