import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ChartBarIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrophyIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { getStageById, TREINO_STAGES } from './stages.config'

export const Route = createFileRoute('/_authenticated/treino/diagnostico')({
  component: DiagnosticoPage,
})

// --- Mock data (espelhando a estrutura do feedback real) ---
const MOCK_DIAGNOSTICO = {
  examTitle: 'Simulado TRT 6ª Região — Técnico Judiciário',
  minPassingGradeNonQuota: 60,
  passed: false,
  overall: {
    correct: 42,
    total: 60,
    percentage: 70,
  },
  subjectStats: [
    { subject: 'Português', correct: 8, total: 10, percentage: 80 },
    { subject: 'Raciocínio Lógico', correct: 6, total: 10, percentage: 60 },
    { subject: 'Direito Constitucional', correct: 7, total: 10, percentage: 70 },
    { subject: 'Direito Administrativo', correct: 5, total: 10, percentage: 50 },
    { subject: 'Informática', correct: 10, total: 10, percentage: 100 },
    { subject: 'Regimento Interno', correct: 6, total: 10, percentage: 60 },
  ],
  subjectFeedback: {
    'Português': {
      evaluation:
        'Seu desempenho em Português está **acima da média**. Você demonstra boa compreensão de interpretação de texto e regência. Vale reforçar pontuação e crase em casos menos óbvios.',
      recommendations:
        '- Revisar uso de vírgula em orações subordinadas.\n- Fazer exercícios de crase (casos facultativos).\n- Ler um texto jurídico por semana para manter o ritmo.',
    },
    'Raciocínio Lógico': {
      evaluation:
        'Você está **no limite** do que seria desejável para aprovação. Os erros concentram-se em sequências e probabilidade.',
      recommendations:
        '1. Refazer as questões erradas do simulado.\n2. Estudar princípios de contagem e probabilidade condicional.\n3. Praticar sequências numéricas e lógicas (15 min/dia).',
    },
    'Direito Constitucional': {
      evaluation:
        'Bom domínio dos **direitos fundamentais** e da estrutura do Estado. Os erros aparecem em controle de constitucionalidade e processo legislativo.',
      recommendations:
        '- Assistir a uma videoaula sobre ADI e ADC.\n- Revisar o art. 59 da CF e as espécies normativas.\n- Fazer 10 questões por dia de controle de constitucionalidade.',
    },
    'Direito Administrativo': {
      evaluation:
        'Esta matéria foi a que mais pesou na nota. Conceitos de **ato administrativo**, **licitações** e **serviços públicos** precisam ser consolidados.',
      recommendations:
        '1. **Prioridade alta**: ato administrativo (elementos, espécies, invalidação).\n2. Lei 8.666/93: modalidades e dispensas.\n3. Serviços públicos: concessão e permissão. Fazer um resumo à mão e depois 20 questões.',
    },
    'Informática': {
      evaluation:
        'Desempenho **excelente**. Você acertou todas as questões. Mantenha revisões leves para não enferrujar.',
      recommendations:
        '- Revisar planilhas (fórmulas e funções) uma vez por semana.\n- Manter-se atualizado sobre LGPD e segurança da informação.',
    },
    'Regimento Interno': {
      evaluation:
        'Acertos e erros **equilibrados**. O conteúdo é extenso e específico; o foco deve ser nos tópicos que mais caem na banca.',
      recommendations:
        '- Baixar o regimento do TRT da 6ª e marcar os artigos já cobrados em provas anteriores.\n- Fazer 5 questões por dia só de regimento até a prova.',
    },
  },
} as const

function getSubjectBarColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'bg-green-500'
  if (percentage >= minPassing - 15) return 'bg-amber-500'
  return 'bg-red-500'
}

function getSubjectTextColor(percentage: number, minPassing: number): string {
  if (percentage >= minPassing) return 'text-green-700'
  if (percentage >= minPassing - 15) return 'text-amber-700'
  return 'text-red-700'
}

function DiagnosticoPage() {
  const navigate = useNavigate()
  const stage = getStageById(2)!
  const data = MOCK_DIAGNOSTICO
  const {
    examTitle,
    minPassingGradeNonQuota,
    overall,
    passed,
    subjectStats,
    subjectFeedback,
  } = data

  return (
    <>
      <div
        className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}
          >
            <ChartBarIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Etapa 2 de {TREINO_STAGES.length}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-800">{examTitle}</h2>

      {/* Resultado geral + Desempenho por matéria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          noElevation
          className={`p-6 ${
            passed
              ? 'border-green-300 bg-green-50'
              : 'border-red-300 bg-red-50'
          }`}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {passed ? (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-200">
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-200">
                  <XCircleIcon className="w-8 h-8 text-red-600" />
                </div>
              )}
              <div>
                <p
                  className={`text-lg font-semibold ${
                    passed ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {passed ? 'Aprovado' : 'Reprovado'}
                </p>
                <p className="text-sm text-slate-600">
                  {overall.correct} de {overall.total} questões corretas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-8 h-8 text-slate-400" />
              <span className="text-3xl font-bold text-slate-800">
                {overall.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200/80">
            Nota mínima para aprovação (ampla concorrência):{' '}
            {minPassingGradeNonQuota}%
          </p>
        </Card>

        <Card noElevation className="p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">
            Desempenho por matéria
          </h3>
          <div className="flex flex-col gap-4">
            {subjectStats.map((stat) => (
              <div key={stat.subject}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm font-medium text-slate-700">
                    {stat.subject}
                  </span>
                  <span
                    className={`text-sm font-semibold ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-400 ease-out ${getSubjectBarColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                    style={{
                      width: `${Math.min(100, stat.percentage)}%`,
                      minWidth: stat.percentage > 0 ? 8 : 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Feedback e recomendações por matéria */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <SparklesIcon className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            Feedback e recomendações por matéria
          </h3>
        </div>
        <div className="flex flex-col gap-3">
          {subjectStats.map((stat) => {
            const feedback = subjectFeedback[stat.subject as keyof typeof subjectFeedback]
            if (!feedback) return null
            const isGreen = stat.percentage >= minPassingGradeNonQuota
            const isRed = stat.percentage < minPassingGradeNonQuota - 15
            const cardBorder = isGreen
              ? 'border-green-200'
              : isRed
                ? 'border-red-200'
                : 'border-amber-200'
            const cardBg = isGreen
              ? 'bg-green-50/50'
              : isRed
                ? 'bg-red-50/50'
                : 'bg-amber-50/50'
            return (
              <Card
                key={stat.subject}
                noElevation
                className={`p-5 border-2 ${cardBorder} ${cardBg} overflow-hidden rounded-lg`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h4 className="text-sm font-semibold text-slate-800">
                    {stat.subject}
                  </h4>
                  <span
                    className={`text-sm font-semibold ${getSubjectTextColor(
                      stat.percentage,
                      minPassingGradeNonQuota,
                    )}`}
                  >
                    {stat.percentage.toFixed(0)}% acertos
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Avaliação
                    </p>
                    <div className="text-sm text-slate-700">
                      <Markdown>{feedback.evaluation}</Markdown>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Recomendações de estudo
                    </p>
                    <div className="text-sm text-slate-700">
                      <Markdown>{feedback.recommendations}</Markdown>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/prova' })}
        >
          Voltar: Prova
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/estudo' })}
        >
          Próxima: Estudo
        </Button>
      </div>
    </>
  )
}
