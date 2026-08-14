import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Compat: o antigo onboarding era um slideshow à parte que criava o "treino
 * grátis" e navegava com uma href montada na mão (`/concursos/:examBaseId/
 * :examBaseId`) — o segmento de concurso nunca resolvia um examBaseId cru, então
 * caía em "Cargo não encontrado" e ainda queimava a cota grátis. O onboarding
 * agora acontece DENTRO do produto (Atos 0 e 1: gate de perfil + coach da meta
 * em /concursos), então qualquer acesso a esta rota é redirecionado para lá.
 */
export const Route = createFileRoute('/_authenticated/onboarding')({
  beforeLoad: () => {
    throw redirect({ to: '/concursos' })
  },
})
