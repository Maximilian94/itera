import { Outlet, createFileRoute } from '@tanstack/react-router'
import { SideBar } from '@/components/SideBar.tsx'

export const Route = createFileRoute('/_authenticated')({
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
