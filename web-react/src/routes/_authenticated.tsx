import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SideBar } from '@/components/SideBar'

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
  return (
    <div className="flex h-full">
      <SideBar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}
