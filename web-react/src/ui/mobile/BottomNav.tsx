import {
  DocumentTextIcon,
  HomeIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import type { ElementType } from 'react'
import {
  DocumentTextIcon as DocumentTextIconSolid,
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid'
import { Link, useMatchRoute } from '@tanstack/react-router'
import { PhoneSafeArea } from './PhoneSafeArea'

type BottomNavItem = {
  label: string
  to: '/dashboard' | '/concursos' | '/account'
  icon: ElementType
  activeIcon: ElementType
  fuzzy?: boolean
  /** Rotas extras que mantêm o item ativo (sempre fuzzy). */
  alsoMatch?: Array<'/exams'>
}

const items: BottomNavItem[] = [
  {
    label: 'Home',
    to: '/dashboard',
    icon: HomeIcon,
    activeIcon: HomeIconSolid,
  },
  {
    label: 'Concursos',
    to: '/concursos',
    icon: DocumentTextIcon,
    activeIcon: DocumentTextIconSolid,
    fuzzy: true,
    // Concursos é a porta de entrada (MAX-28); /exams mantém o item ativo.
    alsoMatch: ['/exams'],
  },
  // Navegação enxuta: o treino vive embutido na página do cargo — tudo
  // parte de Concursos ("Treinos"/"Histórico" removidos).
  {
    label: 'Perfil',
    to: '/account',
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
          const isActive = Boolean(
            matchRoute({
              to: item.to,
              fuzzy: item.fuzzy ?? false,
            }) ||
              (item.alsoMatch ?? []).some((to) =>
                matchRoute({ to, fuzzy: true }),
              ),
          )
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
