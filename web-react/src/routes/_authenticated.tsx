import {
  Outlet,
  createFileRoute,
  redirect,
  useRouterState,
} from '@tanstack/react-router'
import { SideBarV2 } from '@/components/SideBarV2'
import { useIsMobile } from '@/lib/useIsMobile'
import { BottomNav } from '@/ui/mobile'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/sign-in',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const isMobile = useIsMobile()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const hideBottomNav =
    isMobile &&
    (/^\/exams\/[^/]+\/[^/]+\/[^/]+\/?$/.test(pathname) ||
      /^\/treino\/[^/]+\/prova\/?$/.test(pathname) ||
      /^\/treino\/[^/]+\/retentativa(?:\/prova)?\/?$/.test(pathname))
  const showBottomNav = isMobile && !hideBottomNav

  return (
    <div className="flex h-full bg-slate-100 p-0 md:p-2 gap-0 md:gap-2">
      {!isMobile && <SideBarV2 />}
      <div
        className={`flex-1 min-h-0 overflow-auto flex flex-col border-0 md:border md:border-solid md:border-slate-300 rounded-none md:rounded-lg bg-slate-50 p-2 ${
          showBottomNav
            ? 'pb-[calc(var(--mobile-bottom-nav-height)+var(--safe-area-inset-bottom)+0.5rem)]'
            : 'pb-2'
        } md:pb-2`}
      >
        <Outlet />
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  )
}
