import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTrainingQuery } from '@/features/training/queries/training.queries'
import { getTrainingHref } from '@/features/training/domain/stages.config'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Compat de deep links: as rotas /treino/:trainingId/* foram substituídas
 * pelo treino embutido na página do cargo. Bookmarks/histórico antigos
 * resolvem a sessão e caem no cargo (que retoma o treino sozinho); qualquer
 * coisa irreconhecível cai na entrada de concursos.
 */
export const Route = createFileRoute('/_authenticated/treino/$')({
  component: TreinoDeepLinkRedirect,
})

function TreinoDeepLinkRedirect() {
  const { _splat } = Route.useParams()
  const navigate = useNavigate()
  const trainingId = (_splat ?? '').split('/')[0]
  const isUuid = UUID_RE.test(trainingId)
  const trainingQuery = useTrainingQuery(isUuid ? trainingId : undefined)

  useEffect(() => {
    if (!isUuid || trainingQuery.isError) {
      void navigate({ to: '/concursos', replace: true })
      return
    }
    if (trainingQuery.data != null) {
      void navigate({
        href: getTrainingHref({ examBaseId: trainingQuery.data.examBaseId }),
        replace: true,
      })
    }
  }, [isUuid, trainingQuery.isError, trainingQuery.data, navigate])

  return (
    <div className="flex flex-col gap-4 p-2" aria-busy>
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
    </div>
  )
}
