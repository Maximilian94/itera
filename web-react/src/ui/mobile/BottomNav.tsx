import {
  AcademicCapIcon,
  ClockIcon,
  DocumentTextIcon,
  HomeIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import type { ElementType } from 'react'
import {
  AcademicCapIcon as AcademicCapIconSolid,
  ClockIcon as ClockIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid'
import {
  Link,
  useMatchRoute,
  type RegisteredRouter,
  type ToPathOption,
} from '@tanstack/react-router'
import { Route as AccountRoute } from '@/routes/_authenticated/account'
import { Route as DashboardRoute } from '@/routes/_authenticated/dashboard'
import { Route as ExamsRoute } from '@/routes/_authenticated/exams'
import { Route as HistoryRoute } from '@/routes/_authenticated/history'
import { Route as TreinoRoute } from '@/routes/_authenticated/treino'
import { PhoneSafeArea } from './PhoneSafeArea'

type BottomNavItem = {
  label: string
  to: string
  icon: ElementType
  activeIcon: ElementType
  fuzzy?: boolean
}

const items: BottomNavItem[] = [
  {
    label: 'Home',
    to: DashboardRoute.to,
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    label: 'Exams',
    to: ExamsRoute.to,
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid,
    fuzzy: true,
  },
  {
    label: 'Treino',
    to: TreinoRoute.to,
    icon: AcademicCapIcon,
    activeIcon: AcademicCapIconSolid,
    fuzzy: true,
  },
  {
    label: 'Histórico',
    to: HistoryRoute.to,
    icon: ClockIcon,
    activeIcon: ClockIconSolid,
  },
  {
    label: 'Perfil',
    to: AccountRoute.to,
    icon: UserIcon,
    activeIcon: UserIconSolid,
    fuzzy: true,
  },
]

export function BottomNav() {
  const matchRoute = useMatchRoute()

  return (
    <PhoneSafeArea
      bottom
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
    >
      <nav className="mx-auto flex h-[var(--mobile-bottom-nav-height)] max-w-md items-center justify-between px-2">
        {items.map((item) => {
          const isActive = matchRoute({
            to: item.to as ToPathOption<RegisteredRouter>,
            fuzzy: item.fuzzy ?? false,
          })
          const Icon = isActive ? item.activeIcon : item.icon

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors ${
                  isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-500'
                }`}
              >
                <Icon className="size-5" />
              </div>
              <span
                className={`text-[11px] font-semibold ${
                  isActive ? 'text-cyan-700' : 'text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </PhoneSafeArea>
  )
}
