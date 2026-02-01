import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { SideBar } from '@/components/SideBar.tsx'
import { getAuthToken } from '@/lib/auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = getAuthToken()
    if (!token) {
      throw redirect({ to: '/' })
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
