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

/** Path for each stage. When trainingId is provided, use /treino/:trainingId/:slug */
export function getStagePath(slug: TreinoStageSlug, trainingId?: string) {
  if (trainingId) return `/treino/${trainingId}/${slug}`
  return `/treino/${slug}`
}

/** Order of stages from the API (TrainingStage). Index = allowed up to that stage. */
export const TRAINING_STAGE_ORDER = [
  'EXAM',
  'DIAGNOSIS',
  'STUDY',
  'RETRY',
  'FINAL',
] as const

export type TrainingStageFromOrder = (typeof TRAINING_STAGE_ORDER)[number]

/** Index of the current stage (0 = EXAM, 4 = FINAL). Stages with index <= this are allowed. */
export function getAllowedStageIndex(
  currentStage: TrainingStageFromOrder,
): number {
  const idx = TRAINING_STAGE_ORDER.indexOf(currentStage)
  return idx >= 0 ? idx : 0
}

/** Slug for each API stage (for redirects and links). */
export const TRAINING_STAGE_TO_SLUG: Record<TrainingStageFromOrder, TreinoStageSlug> = {
  EXAM: 'prova',
  DIAGNOSIS: 'diagnostico',
  STUDY: 'estudo',
  RETRY: 'retentativa',
  FINAL: 'final',
}
