import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  SparklesIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline'
import { getStageById, TREINO_STAGES } from './-stages.config'

export const Route = createFileRoute('/_authenticated/treino/final')({
  component: FinalPage,
})

// Mock: evolução das notas ao longo do treino
const MOCK_RESULTADO = {
  examTitle: 'Simulado TRT 6ª Região — Técnico Judiciário',
  etapas: {
    inicial: {
      label: 'Nota inicial',
      description: 'Resultado da prova',
      percentage: 70,
      correct: 42,
      total: 60,
    },
    antesEstudo: {
      label: 'Antes dos estudos',
      description: 'Mesmo resultado (diagnóstico)',
      percentage: 70,
      correct: 42,
      total: 60,
    },
    final: {
      label: 'Nota final',
      description: 'Depois do estudo e re-tentativa',
      percentage: 85,
      correct: 51,
      total: 60,
    },
  },
  ganhoPontos: 9,
  ganhoPercentual: 15,
  feedbackFinal: `Você concluiu todas as etapas do treino com **ótimo progresso**: saiu de **70%** para **85%** após o estudo e a re-tentativa.

**Pontos fortes:** Direito Administrativo e Raciocínio Lógico tiveram a maior melhora após a etapa de estudo. As re-tentativas mostraram que você consolidou bem os assuntos que havia errado.

**Próximos passos:** Vale manter o ritmo de simulados e repetir o ciclo de treino nos temas em que ainda há margem de crescimento (por exemplo, Regimento Interno).`,
}

function FinalPage() {
  const navigate = useNavigate()
  const stage = getStageById(5)!
  const { examTitle, etapas, ganhoPontos, ganhoPercentual, feedbackFinal } =
    MOCK_RESULTADO

  return (
    <>
      {/* <div
        className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}
          >
            <SparklesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Etapa {TREINO_STAGES.length} de {TREINO_STAGES.length}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div> */}

      <h2 className="text-lg font-semibold text-slate-800">{examTitle}</h2>

      <p className="text-slate-600 text-sm">
        Sua evolução neste treino: da nota da prova até o resultado após estudo e
        re-tentativa das questões erradas.
      </p>

      {/* Fluxo: Inicial → Antes estudos → Final */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-slate-200 bg-slate-50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <ChartBarIcon className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {etapas.inicial.label}
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            {etapas.inicial.description}
          </p>
          <p className="text-3xl font-bold text-slate-700 mt-3">
            {etapas.inicial.percentage}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {etapas.inicial.correct} de {etapas.inicial.total} questões
          </p>
        </Card>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="w-8 h-8 text-slate-300" aria-hidden />
        </div>

        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-amber-200 bg-amber-50/50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <ChartBarIcon className="w-8 h-8 text-amber-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {etapas.antesEstudo.label}
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            {etapas.antesEstudo.description}
          </p>
          <p className="text-3xl font-bold text-amber-700 mt-3">
            {etapas.antesEstudo.percentage}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {etapas.antesEstudo.correct} de {etapas.antesEstudo.total} questões
          </p>
        </Card>

        <div className="hidden md:flex items-center justify-center">
          <ArrowRightIcon className="w-8 h-8 text-emerald-400 shrink-0" aria-hidden />
        </div>

        <Card
          noElevation
          className="p-5 rounded-xl border-2 border-emerald-300 bg-emerald-50 text-center flex flex-col"
        >
          <div className="flex justify-center mb-2">
            <TrophyIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {etapas.final.label}
          </p>
          <p className="text-[0.7rem] text-slate-500 mt-0.5">
            {etapas.final.description}
          </p>
          <p className="text-3xl font-bold text-emerald-700 mt-3">
            {etapas.final.percentage}%
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {etapas.final.correct} de {etapas.final.total} questões
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-200 text-emerald-800 text-sm font-semibold">
            <span>+{ganhoPontos} questões</span>
            <span className="text-emerald-600">(+{ganhoPercentual}%)</span>
          </div>
        </Card>
      </div>

      <Card
        noElevation
        className="p-5 border-2 border-emerald-200 bg-emerald-50/80 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
          <TrophyIcon className="w-7 h-7 text-emerald-700" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Treino concluído</h3>
          <p className="text-sm text-slate-600 mt-0.5">
            Você melhorou {ganhoPercentual} pontos percentuais após o estudo e a
            re-tentativa. Continue assim nos próximos treinos.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 items-center">
        <Link to="/exams">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DocumentTextIcon className="w-5 h-5" />}
          >
            Ver as questões
          </Button>
        </Link>
        <span className="text-sm text-slate-500">
          Acesse o exame para revisar as questões deste treino.
        </span>
      </div>

      <Card noElevation className="p-5 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Feedback final</h3>
        </div>
        <div className="text-sm text-slate-700">
          <Markdown>{feedbackFinal}</Markdown>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/retentativa' })}
        >
          Voltar: Re-tentativa
        </Button>
        <Button variant="contained" color="primary" onClick={() => navigate({ to: '/treino' })}>
          Concluir e voltar ao início
        </Button>
      </div>
    </>
  )
}