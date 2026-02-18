import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '@mui/material'
import {
  AcademicCapIcon,
  ChartBarIcon,
  RocketLaunchIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { useAccessState } from '@/features/stripe/hooks/useAccessState'
import { getStagePath } from './treino/stages.config'
import { useCreateTrainingMutation } from '@/features/training/queries/training.queries'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { useState } from 'react'
import { Card } from '@/components/Card'

export const Route = createFileRoute('/_authenticated/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const { access, isLoading } = useAccessState()
  const createMutation = useCreateTrainingMutation()
  const { examBases } = useExamBaseFacade()
  const [selectedExamBaseId, setSelectedExamBaseId] = useState<string | null>(
    null,
  )

  const canDoFreeTraining =
    access.status === 'inactive' && (access.canDoFreeTraining ?? false)

  // Redirect to dashboard if user doesn't need onboarding
  useEffect(() => {
    if (isLoading) return
    if (!canDoFreeTraining) {
      navigate({ to: '/dashboard' })
    }
  }, [canDoFreeTraining, isLoading, navigate])

  const firstExamBase = examBases?.[0]
  const selectedExam = (examBases ?? []).find((e) => e.id === selectedExamBaseId)
  const examToUse = selectedExam ?? firstExamBase

  const handleStartFreeTraining = () => {
    if (!examToUse?.id) return
    createMutation.mutate(examToUse.id, {
      onSuccess: (res) => {
        navigate({ to: getStagePath('prova', res.trainingId) })
      },
    })
  }

  if (isLoading || !canDoFreeTraining) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-slate-400 text-sm">
          Carregando...
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-6 max-w-2xl mx-auto">
      {/* Hero */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-10 md:px-8 md:py-12 bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600"
        style={{ animation: 'scale-in 0.45s ease-out both' }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-14 -right-14 w-48 h-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/10" />
        </div>

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
            <RocketLaunchIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Bem-vindo ao Itera
          </h1>
          <p className="text-emerald-100/90 text-sm mt-3 max-w-md mx-auto">
            Você ganhou <strong>1 treino grátis</strong> para experimentar. Faça
            uma prova, receba diagnóstico da IA e estude de forma inteligente.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Como funciona
        </h2>
        <div className="grid gap-3">
          <StepCard
            icon={AcademicCapIcon}
            step={1}
            title="Faça a prova"
            description="Responda as questões do concurso escolhido."
          />
          <StepCard
            icon={ChartBarIcon}
            step={2}
            title="Diagnóstico"
            description="A IA analisa seus erros e identifica pontos de melhoria."
          />
          <StepCard
            icon={SparklesIcon}
            step={3}
            title="Estudo personalizado"
            description="Receba exercícios focados nos seus erros e refaça as questões."
          />
        </div>
      </div>

      {/* Exam selection (simplified) */}
      {examBases && examBases.length > 1 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-800">
            Escolha um concurso
          </h2>
          <div className="flex flex-wrap gap-2">
            {examBases.slice(0, 6).map((exam) => (
              <button
                key={exam.id}
                type="button"
                onClick={() =>
                  setSelectedExamBaseId(
                    selectedExamBaseId === exam.id ? null : exam.id,
                  )
                }
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  selectedExamBaseId === exam.id
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {exam.institution ?? exam.name}
                {!(exam.published ?? true) && (
                  <span className="ml-1 text-amber-600">(Rascunho)</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col gap-4 pt-2">
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          startIcon={
            createMutation.isPending ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RocketLaunchIcon className="w-5 h-5" />
            )
          }
          onClick={handleStartFreeTraining}
          disabled={!examToUse || createMutation.isPending}
          sx={{ py: 1.5, fontSize: '1rem' }}
        >
          {createMutation.isPending
            ? 'Criando treino...'
            : 'Fazer meu primeiro treino'}
        </Button>

        <Link to="/planos" className="no-underline">
          <Button variant="text" color="inherit" fullWidth size="medium">
            Ver planos e assinar depois
          </Button>
        </Link>
      </div>
    </div>
  )
}

function StepCard({
  icon: Icon,
  step,
  title,
  description,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  step: number
  title: string
  description: string
}) {
  return (
    <div
      style={{ animation: `fade-in-up 0.5s ease-out ${step * 80}ms both` }}
    >
      <Card
        noElevation
        className="p-4 border border-slate-200 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </Card>
    </div>
  )
}
