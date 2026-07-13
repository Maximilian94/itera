import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * A listagem /treino foi removida: o treino vive embutido na página do cargo
 * e a descoberta é pelos concursos. Bookmarks antigos caem na entrada.
 */
export const Route = createFileRoute('/_authenticated/treino/')({
  beforeLoad: () => {
    throw redirect({ to: '/concursos' })
  },
})
