import {
  ArrowPathIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

export const TREINO_STAGES = [
  {
    id: 1,
    slug: 'prova',
    title: 'Prova',
    subtitle: 'De um simulado',
    description:
      'Uma prova como é feita hoje: você responde às questões do simulado no mesmo formato que já conhece.',
    icon: ClipboardDocumentListIcon,
    color: 'bg-blue-100 text-blue-700',
    borderColor: 'border-blue-300',
    activeBg: 'bg-blue-600',
  },
  {
    id: 2,
    slug: 'diagnostico',
    title: 'Diagnóstico',
    subtitle: 'Feedback sobre a prova',
    description:
      'Aqui damos um feedback sobre como você foi na prova, assim como fazemos hoje — análise do desempenho por assunto.',
    icon: ChartBarIcon,
    color: 'bg-amber-100 text-amber-700',
    borderColor: 'border-amber-300',
    activeBg: 'bg-amber-600',
  },
  {
    id: 3,
    slug: 'estudo',
    title: 'Estudo',
    subtitle: 'Sub-etapas por assunto',
    description:
      'Para cada assunto recomendado: mini-explicação + exercícios. Você marca como "pronto" ao concluir ou pode pular para a próxima etapa.',
    icon: BookOpenIcon,
    color: 'bg-emerald-100 text-emerald-700',
    borderColor: 'border-emerald-300',
    activeBg: 'bg-emerald-600',
  },
  {
    id: 4,
    slug: 'retentativa',
    title: 'Re-tentativa',
    subtitle: 'Segunda chance',
    description:
      'Para cada alternativa errada, você terá uma segunda chance para acertar — sem ver a alternativa que marcou antes.',
    icon: ArrowPathIcon,
    color: 'bg-violet-100 text-violet-700',
    borderColor: 'border-violet-300',
    activeBg: 'bg-violet-600',
  },
  {
    id: 5,
    slug: 'final',
    title: 'Final',
    subtitle: 'Sensação de progresso',
    description:
      'Mostramos a nota inicial, a nota antes dos estudos e a nota final depois dos estudos, reforçando o progresso conquistado.',
    icon: SparklesIcon,
    color: 'bg-rose-100 text-rose-700',
    borderColor: 'border-rose-300',
    activeBg: 'bg-rose-600',
  },
] as const

export type TreinoStageSlug = (typeof TREINO_STAGES)[number]['slug']

export function getStageBySlug(slug: string) {
  return TREINO_STAGES.find((s) => s.slug === slug)
}

export function getStageById(id: number) {
  return TREINO_STAGES.find((s) => s.id === id)
}

/** Path segment for each stage (no leading slash) */
export function getStagePath(slug: TreinoStageSlug) {
  return `/treino/${slug}`
}
