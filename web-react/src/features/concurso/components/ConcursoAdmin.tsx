/** Aba "Admin" da página do concurso (nível 1) — só para role ADMIN.
 *  Reúne a manutenção que é DESTE concurso e não cabia na timeline de
 *  Notícias: hoje, a origem dos documentos (achar/ver o link oficial). */
import { useState } from 'react'
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { CARD } from './card'
import { enter } from './motion'
import type {
  ConcursoAiPhase,
  FindConcursoLinkResult,
  LinkSuggestion,
} from '@/features/scraper/scraper.types'
import {
  useConcursoCostsQuery,
  useFindConcursoLinkMutation,
  useSetConcursoSourceUrlMutation,
} from '@/features/scraper/scraper.queries'
import { CostBadge, formatUsd } from '@/features/scraper/CostBadge'
import { ApiError } from '@/lib/api'

const stamp = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function ConcursoAdmin({
  concursoId,
  sourceUrl,
  checkedAt,
  enterIdx = 1,
}: {
  concursoId: string
  sourceUrl: string | null
  checkedAt: string | null
  enterIdx?: number
}) {
  const find = useFindConcursoLinkMutation(concursoId)
  // O resultado recém-obtido manda; senão, o que veio no payload do concurso.
  const currentUrl = find.data?.url ?? sourceUrl

  const error =
    find.error instanceof ApiError
      ? find.error.message
      : find.error
        ? 'Não foi possível procurar o link.'
        : null

  return (
    <section
      {...enter(enterIdx)}
      aria-label="Manutenção do concurso"
      className="flex flex-col gap-4"
    >
      <div className={`${CARD} p-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900">
              Origem dos documentos
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              A página da organizadora de onde saem editais e retificações. É
              dela que a aba Notícias puxa as publicações.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !find.isPending && find.mutate()}
            disabled={find.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {find.isPending
              ? 'Procurando…'
              : currentUrl != null
                ? 'Procurar de novo'
                : 'Procurar link oficial'}
          </button>
        </div>

        {/* Estado atual do link — o dado que o admin veio conferir. */}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {currentUrl != null ? (
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-start gap-1.5 break-all text-sm font-semibold text-cyan-700 hover:underline"
            >
              {currentUrl}
              <ArrowTopRightOnSquareIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            </a>
          ) : (
            <p className="text-sm font-medium text-slate-500">
              Sem link — a aba Notícias não consegue buscar publicações novas.
            </p>
          )}
          {checkedAt != null && (
            <p className="mt-1 text-xs text-slate-400">
              Última verificação: {stamp.format(new Date(checkedAt))}
            </p>
          )}
        </div>

        {/* Saída definitiva: a busca é best-effort e algumas origens bloqueiam
         *  tudo — colar o link na mão precisa estar sempre à mão, não escondido
         *  atrás de um erro. */}
        <ManualUrl concursoId={concursoId} currentUrl={currentUrl} />

        {find.isPending && (
          <p className="mt-3 animate-pulse rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-700">
            Pesquisando na web e conferindo se a página lista documentos — leva
            alguns segundos…
          </p>
        )}

        {/* Só existe no estado de sucesso — nova chamada limpa `data`. */}
        {find.data != null && (
          <>
            <Result concursoId={concursoId} data={find.data} />
            <CostBadge cost={find.data.cost} className="mt-2" />
          </>
        )}

        {error != null && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      <PhaseCosts concursoId={concursoId} />
    </section>
  )
}

/** Nome de cada fase na tela — o enum do backend é código, não copy. */
const PHASE_LABELS: Record<ConcursoAiPhase, string> = {
  NEWS_EXTRACT: 'Fase 2 · Leitura da notícia',
  LINK_SEARCH: 'Fase 3 · Busca do link oficial',
  DOCUMENTS_CHECK: 'Fase 4 · Raspagem de documentos',
  DOCUMENT_ANALYSIS: 'Fase 5 · Análise de documentos',
}

/**
 * Quanto de IA cada fase já consumiu NESTE concurso.
 *
 * Some as repetições de propósito: a busca de link que não achou nada custou
 * igual, e é justamente o gasto invisível que estourou a conta antes. Por isso
 * cada fase mostra o número de execuções ao lado do valor.
 */
function PhaseCosts({ concursoId }: { concursoId: string }) {
  const { data, isPending } = useConcursoCostsQuery(concursoId)

  return (
    <div className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Custo de IA</h3>
        {data != null && data.byPhase.length > 0 && (
          <p className="text-sm font-semibold tabular-nums text-slate-900">
            {formatUsd(data.total)}
          </p>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-500">
        O que cada fase já consumiu neste concurso, somando todas as execuções.
      </p>

      {isPending ? (
        <p className="mt-3 text-sm text-slate-400">Carregando…</p>
      ) : !data || data.byPhase.length === 0 ? (
        // "Nunca medido" ≠ "custou zero": concursos anteriores à medição e
        // concursos que só passaram pela fase 1 (grátis) contam a mesma
        // história aqui, e nenhum dos dois merece um "US$ 0,00" enganoso.
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Nenhum gasto de IA registrado. O cadastro do concurso (fase 1) não
          usa IA; as fases seguintes passam a aparecer aqui conforme você as
          executa.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-slate-100">
          {data.byPhase.map((p) => (
            <li key={p.phase} className="py-2 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <span className="text-sm font-medium text-slate-700">
                  {PHASE_LABELS[p.phase]}
                </span>
                <span className="text-sm tabular-nums text-slate-600">
                  {formatUsd(p.usd)}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-slate-400">
                <span>
                  {p.runs} {p.runs === 1 ? 'execução' : 'execuções'}
                </span>
                {p.lastAt != null && (
                  <span>· última em {stamp.format(new Date(p.lastAt))}</span>
                )}
              </div>
              <CostBadge cost={{ usd: p.usd, entries: p.entries }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Campo para colar o link na mão. Fica sempre visível (colapsado quando já há
 * link) porque a busca automática erra e há origens que bloqueiam qualquer
 * robô — nesses casos, digitar é o único caminho.
 */
function ManualUrl({
  concursoId,
  currentUrl,
}: {
  concursoId: string
  currentUrl: string | null
}) {
  const save = useSetConcursoSourceUrlMutation(concursoId)
  const [open, setOpen] = useState(currentUrl == null)
  const [value, setValue] = useState('')

  const error =
    save.error instanceof ApiError
      ? save.error.message
      : save.error
        ? 'Não foi possível salvar o link.'
        : null

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setValue(currentUrl ?? '')
          setOpen(true)
        }}
        className="mt-2 self-start text-xs font-semibold text-slate-500 underline-offset-2 hover:text-cyan-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        Corrigir link manualmente
      </button>
    )

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label
        htmlFor="manual-source-url"
        className="text-sm font-semibold text-slate-800"
      >
        Link da página de documentos
      </label>
      <p className="mt-0.5 text-xs text-slate-500">
        Abra a página oficial no seu navegador, copie o endereço e cole aqui.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="manual-source-url"
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://banca.org.br/concursos/..."
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        />
        <button
          type="button"
          onClick={() => !save.isPending && save.mutate(value)}
          disabled={save.isPending || value.trim() === ''}
          className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {save.isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
      {currentUrl != null && (
        <button
          type="button"
          onClick={() => !save.isPending && save.mutate(null)}
          className="mt-2 text-xs font-semibold text-red-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          Remover o link salvo (volta a contar como "sem link")
        </button>
      )}
      {error != null && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {save.isSuccess && error == null && (
        <p className="mt-2 text-sm text-emerald-700">Link atualizado.</p>
      )}
    </div>
  )
}

/** Diz ao admin o que aconteceu — e, quando não deu para verificar, entrega a
 *  decisão a ele em vez de chutar. */
function Result({
  concursoId,
  data,
}: {
  concursoId: string
  data: FindConcursoLinkResult
}) {
  if (data.found)
    return (
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Link confirmado: a página foi lida e lista {data.docCount}{' '}
        {data.docCount === 1 ? 'documento' : 'documentos'}.
      </p>
    )

  if (data.suggestion != null)
    return <Suggestion concursoId={concursoId} suggestion={data.suggestion} />

  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      Não achei uma página que liste os documentos deste concurso. Pegue o link
      na mão e cole no campo acima.
    </p>
  )
}

/**
 * Candidato NÃO confirmado. Nada foi salvo: o admin abre o link e decide.
 *
 * Existe porque a decisão automática é impossível aqui — a IA compõe URLs que
 * parecem certas e dão 404, e origens atrás de Cloudflare nunca podem ser
 * verificadas. Adivinhar erra dos dois lados; um clique humano resolve.
 */
function Suggestion({
  concursoId,
  suggestion,
}: {
  concursoId: string
  suggestion: LinkSuggestion
}) {
  const save = useSetConcursoSourceUrlMutation(concursoId)
  const [dismissed, setDismissed] = useState(false)
  // Plataforma é PISTA, não resposta: salvá-la deixaria a aba Notícias apontada
  // para a home de um portal, que não lista os documentos deste concurso.
  const isPlatform = suggestion.origin === 'plataforma da organizadora'

  if (dismissed) return null
  if (save.isSuccess)
    return (
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        Link salvo.
      </p>
    )

  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-start gap-2 font-semibold">
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        {isPlatform
          ? 'Achei a plataforma da organizadora, mas não a página do concurso'
          : 'Achei um candidato, mas não consegui verificar'}
      </p>
      <p className="mt-1 text-xs text-amber-800">
        {isPlatform
          ? 'O site bloqueia leitura automática (Cloudflare), então não consigo entrar para achar este concurso. Abra a plataforma, localize o concurso e cole o endereço no campo acima.'
          : 'A origem bloqueia leitura automática, então não dá para saber daqui se a página é a certa. Abra o link e decida.'}{' '}
        <strong>Nada foi salvo.</strong> Origem: {suggestion.origin}.
      </p>
      <a
        href={suggestion.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-start gap-1.5 break-all font-semibold text-cyan-700 hover:underline"
      >
        {suggestion.url}
        <ArrowTopRightOnSquareIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      </a>
      <div className="mt-3 flex flex-wrap gap-2">
        {!isPlatform && (
          <button
            type="button"
            onClick={() => !save.isPending && save.mutate(suggestion.url)}
            disabled={save.isPending}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {save.isPending ? 'Salvando…' : 'Usar este link'}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {isPlatform ? 'Fechar' : 'Descartar'}
        </button>
      </div>
    </div>
  )
}
