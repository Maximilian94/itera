import { Card } from '@/components/Card'
import { Markdown } from '@/components/Markdown'
import { Button } from '@mui/material'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  BookOpenIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  AcademicCapIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { useState } from 'react'
import { getStageById, TREINO_STAGES } from './-stages.config'

export const Route = createFileRoute('/_authenticated/treino/estudo')({
  component: EstudoPage,
})

// Mock: assuntos recomendados com explicação e exercícios
const MOCK_ASSUNTOS = [
  {
    id: '1',
    name: 'Direito Administrativo — Ato administrativo',
    explanation:
      '**Ato administrativo** é a manifestação de vontade do Estado no exercício de sua função. Elementos: competência, forma, motivo, objeto e finalidade. Pode ser invalidado por ilegalidade (anulável) ou por vício mais grave (nulo).',
    exercisesCount: 5,
  },
  {
    id: '2',
    name: 'Direito Constitucional — Controle de constitucionalidade',
    explanation:
      'O **controle de constitucionalidade** verifica se uma norma está em conformidade com a CF. Pode ser difuso (qualquer juízo) ou concentrado (STF). ADI e ADC são ações de controle abstrato; a ADPF protege direitos fundamentais.',
    exercisesCount: 4,
  },
  {
    id: '3',
    name: 'Raciocínio Lógico — Probabilidade',
    explanation:
      '**Probabilidade** mede a chance de um evento ocorrer: P = casos favoráveis / casos possíveis. Probabilidade condicional: P(A|B) = P(A e B) / P(B). Eventos independentes: P(A e B) = P(A) × P(B).',
    exercisesCount: 6,
  },
  {
    id: '4',
    name: 'Português — Crase',
    explanation:
      'A **crase** é a fusão da preposição *a* com o artigo *a(s)*. Usa-se antes de palavras femininas, em expressões de lugar e em locuções. Não se usa antes de masculino, verbos, pronomes pessoais e nomes de cidade sem artigo.',
    exercisesCount: 5,
  },
  {
    id: '5',
    name: 'Regimento Interno — Competências',
    explanation:
      'O **Regimento Interno** do TRT disciplina a organização e o funcionamento do Tribunal. As competências da Presidência, das Turmas e das Câmaras estão definidas nos primeiros capítulos. Recomenda-se ler os artigos sobre recurso ordinário e agravo.',
    exercisesCount: 3,
  },
]

function EstudoPage() {
  const navigate = useNavigate()
  const stage = getStageById(3)!
  const [prontoIds, setProntoIds] = useState<Set<string>>(new Set())

  const togglePronto = (id: string) => {
    setProntoIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const total = MOCK_ASSUNTOS.length
  const concluidos = prontoIds.size
  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0

  return (
    <>
      <div
        className={`rounded-lg border-l-4 ${stage.borderColor} ${stage.color} bg-opacity-20 p-4`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${stage.color}`}
          >
            <BookOpenIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">
              Etapa 3 de {TREINO_STAGES.length}
            </p>
            <h1 className="text-xl font-bold text-slate-900">{stage.title}</h1>
            <p className="text-sm text-slate-600 mt-0.5">{stage.subtitle}</p>
          </div>
        </div>
      </div>

      <p className="text-slate-600 text-sm">
        Estude cada assunto recomendado pelo diagnóstico: leia a explicação
        e faça os exercícios. Marque como &quot;pronto&quot; quando terminar ou pule
        para a próxima etapa quando quiser.
      </p>

      {/* Progresso */}
      <Card noElevation className="p-4 bg-slate-50 border border-slate-200">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-700">
              {concluidos} de {total} assuntos concluídos
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500 w-8">
              {progresso}%
            </span>
          </div>
        </div>
      </Card>

      {/* Lista de assuntos */}
      <div className="flex flex-col gap-4">
        {MOCK_ASSUNTOS.map((assunto) => {
          const isPronto = prontoIds.has(assunto.id)
          return (
            <Card
              key={assunto.id}
              noElevation
              className={`overflow-hidden border-2 transition-colors ${
                isPronto
                  ? 'border-emerald-300 bg-emerald-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {isPronto ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center shrink-0">
                        <CheckCircleIcon className="w-6 h-6 text-emerald-700" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <AcademicCapIcon className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                    <h3 className="text-base font-semibold text-slate-800">
                      {assunto.name}
                    </h3>
                  </div>
                  <Button
                    size="small"
                    variant={isPronto ? 'outlined' : 'contained'}
                    color={isPronto ? 'success' : 'primary'}
                    startIcon={
                      isPronto ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <CheckIcon className="w-4 h-4" />
                      )
                    }
                    onClick={() => togglePronto(assunto.id)}
                  >
                    {isPronto ? 'Pronto' : 'Marcar pronto'}
                  </Button>
                </div>

                <div className="mt-4 pl-[52px] min-w-0 sm:pl-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Explicação
                  </p>
                  <div className="text-sm text-slate-700">
                    <Markdown>{assunto.explanation}</Markdown>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200 pl-[52px] sm:pl-0">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <PencilSquareIcon className="w-4 h-4" />
                    Exercícios ({assunto.exercisesCount})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: Math.min(3, assunto.exercisesCount) }).map(
                      (_, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm border border-slate-200"
                        >
                          Questão {i + 1} (placeholder)
                        </div>
                      )
                    )}
                    {assunto.exercisesCount > 3 && (
                      <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-sm">
                        +{assunto.exercisesCount - 3} questões
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Em breve: abrir exercícios e registrar respostas.
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card noElevation className="p-4 border-dashed border-2 border-slate-300 bg-slate-50/50">
        <p className="text-sm text-slate-600">
          Você pode seguir para a <strong>Re-tentativa</strong> mesmo sem ter
          concluído todos os assuntos. O que já foi marcado como pronto fica
          registrado.
        </p>
      </Card>

      <div className="flex flex-wrap gap-3 justify-between">
        <Button
          variant="outlined"
          startIcon={<ArrowLeftIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/diagnostico' })}
        >
          Voltar: Diagnóstico
        </Button>
        <Button
          variant="contained"
          color="primary"
          endIcon={<ArrowRightIcon className="w-5 h-5" />}
          onClick={() => navigate({ to: '/treino/retentativa' })}
        >
          Próxima: Re-tentativa
        </Button>
      </div>
    </>
  )
}
