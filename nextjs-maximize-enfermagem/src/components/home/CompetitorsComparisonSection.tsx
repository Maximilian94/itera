import {
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type SupportLevel = 'yes' | 'no' | 'partial'

interface ComparisonRow {
  feature: string
  qconcursos: SupportLevel
  aprova: SupportLevel
  estrategia: SupportLevel
  itera: SupportLevel
  partialNotes?: Partial<Record<'qconcursos' | 'aprova' | 'estrategia' | 'itera', string>>
}

const COMPARISON_DATA: ComparisonRow[] = [
  { feature: 'Provas de concursos reais', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Explicações das alternativas', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Estatísticas de desempenho', qconcursos: 'yes', aprova: 'yes', estrategia: 'yes', itera: 'yes' },
  { feature: 'Diagnóstico automático após prova', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
  {
    feature: 'Identificação inteligente de pontos fracos',
    qconcursos: 'partial', aprova: 'partial', estrategia: 'partial', itera: 'yes',
    partialNotes: { qconcursos: 'Básico (por matéria)', aprova: 'Básico', estrategia: 'Manual' },
  },
  { feature: 'Plano de estudo personalizado', qconcursos: 'no', aprova: 'no', estrategia: 'partial', itera: 'yes', partialNotes: { estrategia: 'Manual (via trilhas/cursos)' } },
  { feature: 'Exercícios baseados nos seus erros', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
  { feature: 'Ciclo de reavaliação inteligente', qconcursos: 'no', aprova: 'no', estrategia: 'no', itera: 'yes' },
]

function SupportIcon({ level, note }: { level: SupportLevel; note?: string }) {
  if (level === 'yes') return <CheckIcon className="w-5 h-5 text-green-500 mx-auto" />
  if (level === 'partial') {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
        {note && <span className="text-[10px] text-amber-600 leading-tight text-center">{note}</span>}
      </div>
    )
  }
  return <XMarkIcon className="w-5 h-5 text-slate-300 mx-auto" />
}

export function CompetitorsComparisonSection() {
  const competitors = ['qconcursos', 'aprova', 'estrategia', 'itera'] as const
  const headers: Record<(typeof competitors)[number], string> = {
    qconcursos: 'QConcursos',
    aprova: 'Aprova Concursos',
    estrategia: 'Estratégia Concursos',
    itera: 'Maximize Enfermagem',
  }

  return (
    <section className="overflow-hidden py-24 px-6 bg-slate-50">
      <div className="mx-auto max-w-7xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Compare
          </p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
            Por que Maximize Enfermagem?
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Compare as funcionalidades com as principais plataformas do mercado.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-w-5xl mx-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-700 min-w-[200px]">Funcionalidade</th>
                {competitors.map((c) => (
                  <th
                    key={c}
                    className={`px-3 py-3 font-semibold text-center min-w-[110px] ${
                      c === 'itera' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                    }`}
                  >
                    {headers[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={i} className={`border-t border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="px-4 py-3 text-slate-700 font-medium">{row.feature}</td>
                  {competitors.map((c) => (
                    <td key={c} className={`px-3 py-3 ${c === 'itera' ? 'bg-blue-50/50' : ''}`}>
                      <SupportIcon level={row[c]} note={row.partialNotes?.[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
