import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/history')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/history"!</div>
}
