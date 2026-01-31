import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  return (
    <div className="text-center text-amber-50">
      Login Page
      <Link to="/dashboard">Dentro</Link>
    </div>
  )
}
