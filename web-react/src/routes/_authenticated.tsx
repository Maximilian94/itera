import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SideBar } from '@/components/SideBar'
import { SideBarV2 } from '@/components/SideBarV2'

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
    <div className="flex h-full bg-white p-2 gap-2">
      {/* <SideBar /> */}
      <SideBarV2 />
      <div className="flex-1 border border-solid border-slate-300 rounded-lg bg-slate-50">
        <Outlet />
      </div>
    </div>
  )
}
