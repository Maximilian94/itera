import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '@/components/Card'
import { PpTooltip } from '@/components/PpTooltip'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const Route = createFileRoute('/_authenticated/evolucao-como-funciona')({
  component: EvolucaoComoFuncionaPage,
})

function EvolucaoComoFuncionaPage() {
  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="text-slate-500 hover:text-slate-700 no-underline flex items-center gap-1 text-sm"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Voltar ao dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Como são calculadas as métricas de evolução
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Entenda como as métricas dos cards &quot;Evolução da nota inicial&quot;
          e &quot;Evolução nos treinos&quot; são calculadas.
        </p>
      </div>

      <Card noElevation className="p-6 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          1. Comparação mês atual vs mês anterior
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Esta métrica mostra se sua nota média subiu ou caiu em relação ao mês
          passado.
        </p>
        <p className="text-sm text-slate-600 mb-3">
          <strong>Cálculo:</strong> calculamos a média das notas de todas as
          provas concluídas neste mês e subtraímos a média das provas do mês
          anterior.
        </p>
        <p className="text-sm text-slate-600 mb-2">
          <strong>Exemplo:</strong> se em janeiro você fez 2 provas (60% e 70%)
          e em fevereiro fez 3 provas (65%, 72% e 68%), temos:
        </p>
        <ul className="text-sm text-slate-600 list-disc list-inside space-y-1 mb-3">
          <li>Média janeiro: (60 + 70) / 2 = 65%</li>
          <li>Média fevereiro: (65 + 72 + 68) / 3 = 68,3%</li>
          <li>
            Diferença: 68,3 − 65 = +3,3 <PpTooltip /> (sua nota subiu)
          </li>
        </ul>
        <p className="text-sm text-slate-500">
          <strong>Quando aparece:</strong> apenas quando você tem provas
          concluídas em ambos os meses (atual e anterior).
        </p>
      </Card>

      <Card noElevation className="p-6 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          2. Tendência por regressão linear
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Esta métrica indica, em média, quantos pontos percentuais (
          <PpTooltip />) sua nota sobe ou desce a cada nova prova que você faz.
        </p>
        <p className="text-sm text-slate-600 mb-3">
          <strong>Cálculo:</strong> ajustamos uma reta aos seus dados usando o
          método dos mínimos quadrados. Cada ponto é uma prova: no eixo x usamos
          o índice da prova (1ª, 2ª, 3ª...) e no eixo y a nota obtida. O
          coeficiente angular (slope) da reta é o valor exibido.
        </p>
        <p className="text-sm text-slate-600 mb-2">
          <strong>Fórmula do slope:</strong>
        </p>
        <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto mb-3 font-mono text-slate-700">
          slope = (n · Σ(xy) − Σx · Σy) / (n · Σ(x²) − (Σx)²)
        </pre>
        <p className="text-sm text-slate-600 mb-3">
          Onde n é o número de provas, x é o índice (0, 1, 2, …) e y é a nota
          de cada prova.
        </p>
        <p className="text-sm text-slate-600 mb-3">
          <strong>Interpretação:</strong> slope positivo = tendência de melhora
          (sua nota está subindo ao longo das provas); slope negativo =
          tendência de piora; slope próximo de zero = sua nota está estável.
        </p>
        <p className="text-sm text-slate-500">
          <strong>Quando aparece:</strong> a partir de 2 provas concluídas.
        </p>
      </Card>

      <Card noElevation className="p-6 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          3. O gráfico da nota inicial
        </h2>
        <p className="text-sm text-slate-600">
          O gráfico mostra a evolução das suas notas ao longo do tempo. Cada
          ponto representa uma prova concluída: o eixo horizontal (X) indica a
          data em que você fez a prova, e o eixo vertical (Y) mostra a nota
          obtida em porcentagem (%). Assim você pode visualizar se suas notas
          estão subindo, caindo ou se mantendo estáveis ao longo do tempo.
        </p>
      </Card>

      <Card noElevation className="p-6 border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-3">
          4. Evolução nos treinos
        </h2>
        <p className="text-sm text-slate-600 mb-3">
          Esta métrica mostra quanto sua nota sobe (ou desce) em média do início
          ao fim de cada treino concluído.
        </p>
        <p className="text-sm text-slate-600 mb-3">
          <strong>Cálculo:</strong> para cada treino concluído, calculamos a
          diferença entre a nota final e a nota inicial (da prova). Em seguida,
          tiramos a média dessas diferenças.
        </p>
        <p className="text-sm text-slate-600 mb-2">
          <strong>Exemplo:</strong> se você concluiu 2 treinos com ganhos de +20{' '}
          <PpTooltip /> e +15 <PpTooltip />, a evolução média é (20 + 15) / 2 =
          +17,5 <PpTooltip />
        </p>
        <p className="text-sm text-slate-600 mb-3">
          <strong>O gráfico:</strong> cada ponto representa um treino concluído.
          O eixo X mostra a data de conclusão e o eixo Y mostra o ganho (ou
          perda) em pontos percentuais (<PpTooltip />) daquele treino.
        </p>
        <p className="text-sm text-slate-500">
          <strong>Quando aparece:</strong> a partir de 1 treino concluído.
        </p>
      </Card>
    </div>
  )
}
