import { useRef, useState } from 'react'
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpTrayIcon,
  ClipboardDocumentIcon,
  NewspaperIcon,
} from '@heroicons/react/24/outline'
import { CARD } from './card'
import { enter } from './motion'
import type { ConcursoDocument } from '@/features/concurso/domain/concurso.types'
import type {
  CheckedDocument,
  ProposedChange,
} from '@/features/scraper/scraper.types'
import {
  useAddConcursoDocumentsMutation,
  useAnalyzeDocumentMutation,
  useApplyDocumentChangesMutation,
  useCheckConcursoDocumentsMutation,
} from '@/features/scraper/scraper.queries'
import { ApiError } from '@/lib/api'

/* Datas dos documentos são date-only; formatamos em UTC para não derivar um
 * dia pelo fuso (mesma convenção do restante da página do concurso). */
const fullDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Rótulo humano do tipo de documento; OUTRO/desconhecido não ganha chip. */
const KIND_LABELS: Record<string, string | undefined> = {
  EDITAL_ABERTURA: 'Edital de abertura',
  RETIFICACAO: 'Retificação',
  GABARITO: 'Gabarito',
  RESULTADO: 'Resultado',
  CONVOCACAO: 'Convocação',
  COMUNICADO: 'Comunicado',
}

/** O ponto do edital de abertura recebe o acento da marca; os demais, neutro. */
function dotClass(kind: string): string {
  return kind === 'EDITAL_ABERTURA'
    ? 'bg-cyan-600 ring-cyan-100'
    : 'bg-slate-300 ring-slate-100'
}

/** Selo do estado de leitura de conteúdo do documento (Fase 2). */
function readState(doc: ConcursoDocument): { label: string; className: string } {
  if (doc.changesAppliedAt != null)
    return {
      label: 'Lido · aplicado',
      className: 'bg-emerald-50 text-emerald-700',
    }
  if (doc.analyzedAt != null)
    return { label: 'Lido', className: 'bg-cyan-50 text-cyan-700' }
  return { label: 'Não analisado', className: 'bg-slate-100 text-slate-500' }
}

/**
 * Timeline de Notícias do concurso (nível 1): documentos publicados — editais,
 * retificações, gabaritos, resultados, convocações — do mais recente ao mais
 * antigo. A ordenação vem pronta do backend; aqui só desenhamos. Para ADMIN,
 * a barra "verificar novas publicações" re-raspa a origem e adiciona os novos.
 */
export function ConcursoNews({
  documents,
  isAdmin = false,
  concursoId,
  sourceUrl = null,
  checkedAt = null,
  enterIdx = 1,
}: {
  documents: Array<ConcursoDocument>
  isAdmin?: boolean
  concursoId: string
  sourceUrl?: string | null
  checkedAt?: string | null
  enterIdx?: number
}) {
  const e = enter(enterIdx)
  return (
    <div style={e.style} className={`${e.className} flex flex-col gap-4`}>
      {isAdmin && (
        <NewsAdminBar
          concursoId={concursoId}
          sourceUrl={sourceUrl}
          checkedAt={checkedAt}
        />
      )}

      {documents.length === 0 ? (
        <section
          className={`${CARD} flex flex-col items-center gap-3 p-8 text-center sm:p-10`}
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-inset ring-slate-200/60">
            <NewspaperIcon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Nenhuma publicação ainda
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              Os documentos oficiais deste concurso (edital, retificações,
              gabaritos e resultados) aparecem aqui assim que forem publicados.
            </p>
          </div>
        </section>
      ) : (
        <section aria-label="Publicações do concurso" className={`${CARD} p-5 sm:p-6`}>
          <h2 className="text-base font-bold text-slate-900">
            Notícias do concurso
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Documentos oficiais publicados, do mais recente ao mais antigo
          </p>

          <ol className="mt-5 flex flex-col">
            {documents.map((doc, i) => {
              const last = i === documents.length - 1
              const kindLabel = KIND_LABELS[doc.kind] ?? null
              return (
                <li key={doc.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute left-[5px] top-4 bottom-0 w-px bg-slate-200"
                    />
                  )}
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${dotClass(doc.kind)}`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <time className="text-xs font-semibold tabular-nums text-slate-500">
                        {doc.publishedAt != null
                          ? fullDate.format(new Date(doc.publishedAt))
                          : 'Sem data'}
                      </time>
                      {kindLabel != null && (
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                            doc.kind === 'EDITAL_ABERTURA'
                              ? 'bg-cyan-50 text-cyan-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {kindLabel}
                        </span>
                      )}
                      {/* Estado de leitura de conteúdo — só para admin (é o
                          workflow de manutenção do concurso). */}
                      {isAdmin &&
                        (() => {
                          const s = readState(doc)
                          return (
                            <span
                              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${s.className}`}
                            >
                              {s.label}
                            </span>
                          )
                        })()}
                    </div>

                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group mt-1 inline-flex items-start gap-1.5 text-sm font-bold text-slate-900 no-underline hover:text-cyan-700"
                    >
                      <span className="min-w-0">{doc.title}</span>
                      <ArrowTopRightOnSquareIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-cyan-700" />
                    </a>

                    {doc.summary != null && doc.summary.trim() !== '' && (
                      <p className="mt-1 max-w-prose text-sm leading-6 text-slate-600">
                        {doc.summary}
                      </p>
                    )}

                    {isAdmin && (
                      <DocAnalysis concursoId={concursoId} document={doc} />
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Barra de admin: verificar novas publicações + adicionar            */
/* ------------------------------------------------------------------ */

const shortDate = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

/* Data-hora local da última verificação (não é date-only → sem UTC forçado). */
const checkStamp = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function NewsAdminBar({
  concursoId,
  sourceUrl,
  checkedAt,
}: {
  concursoId: string
  sourceUrl: string | null
  checkedAt: string | null
}) {
  const check = useCheckConcursoDocumentsMutation(concursoId)
  const add = useAddConcursoDocumentsMutation(concursoId)
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [showPaste, setShowPaste] = useState(false)
  const [html, setHtml] = useState('')

  // Última verificação: a recém-feita (resposta) tem prioridade sobre a do payload.
  const lastCheck = check.data?.checkedAt ?? checkedAt

  const busy = check.isPending || add.isPending
  const newDocs: Array<CheckedDocument> =
    check.data?.documents.filter((d) => d.isNew && d.url != null) ?? []
  const selected = newDocs.filter((d) => !deselected.has(d.url as string))

  const runCheck = (body: { html?: string } = {}) => {
    if (busy) return
    setDeselected(new Set())
    add.reset()
    check.mutate(body)
  }

  const toggle = (url: string) =>
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })

  const handleAdd = () => {
    if (busy || selected.length === 0) return
    add.mutate(
      selected.map((d) => ({
        title: d.name,
        summary: d.summary,
        url: d.url as string,
        kind: d.kind,
        publishedAt: d.publishedAt,
      })),
      { onSuccess: () => check.reset() },
    )
  }

  const checkError =
    check.error instanceof ApiError
      ? check.error.message
      : check.error
        ? 'Não foi possível verificar as publicações.'
        : null

  return (
    <section className={`${CARD} p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">Manutenção (admin)</h3>
          <p className="text-xs text-slate-500">
            Verifica a página de origem e traz publicações novas para a timeline.
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {lastCheck != null
              ? `Última verificação: ${checkStamp.format(new Date(lastCheck))}`
              : 'Nunca verificado.'}
          </p>
        </div>
        {/* Dois caminhos sempre à mão: raspar a origem (padrão) ou colar o HTML.
         *  Sites com Cloudflare barram a raspagem — o admin que já sabe disso
         *  pula direto a cascata anti-bot em vez de esperar ela falhar. */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPaste((v) => !v)}
            aria-expanded={showPaste}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            Colar HTML
          </button>
          <button
            type="button"
            onClick={() => runCheck()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
          >
            <ArrowPathIcon
              className={`h-4 w-4 ${check.isPending ? 'animate-spin' : ''}`}
            />
            {check.isPending ? 'Verificando…' : 'Verificar novas publicações'}
          </button>
        </div>
      </div>

      {/* Caminho alternativo permanente: a IA extrai do HTML colado igual. */}
      {showPaste && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">
            Verificar pelo HTML da página
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Use quando o site bloqueia o acesso automático (Cloudflare e afins).
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <ol className="ml-4 list-decimal space-y-0.5 text-xs text-slate-600">
              <li>
                Abra a página oficial da organizadora e passe o desafio
                anti-robô.
              </li>
              <li>Veja o código-fonte (Ctrl+U / Cmd+Opt+U) e copie tudo.</li>
              <li>Cole abaixo e verifique.</li>
            </ol>
            {sourceUrl != null && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 no-underline hover:bg-slate-100"
              >
                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                Abrir página oficial em nova aba
              </a>
            )}
            <textarea
              value={html}
              onChange={(ev) => setHtml(ev.target.value)}
              placeholder="Cole aqui o código-fonte da página (Ctrl+U → Ctrl+A → Ctrl+C)"
              rows={5}
              className="w-full rounded-lg border border-slate-300 p-2 font-mono text-xs text-slate-700 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => runCheck({ html })}
              disabled={busy || html.trim() === ''}
              className="self-end rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
            >
              Verificar pelo HTML colado
            </button>
          </div>
        </div>
      )}

      {/* Sucesso ao adicionar */}
      {add.isSuccess && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {add.data.addedCount}{' '}
          {add.data.addedCount === 1
            ? 'publicação adicionada'
            : 'publicações adicionadas'}{' '}
          à timeline.
        </p>
      )}

      {/* Erro na verificação → aponta para o painel de colar HTML (Cloudflare) */}
      {checkError != null && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm text-amber-800">{checkError}</p>
          {!showPaste && (
            <button
              type="button"
              onClick={() => setShowPaste(true)}
              className="mt-1 text-xs font-semibold text-amber-900 underline"
            >
              A página bloqueou? Cole o HTML manualmente
            </button>
          )}
        </div>
      )}

      {/* Resultado da verificação */}
      {check.isSuccess && (
        <div className="mt-3">
          {newDocs.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhuma publicação nova — a timeline já está atualizada.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {newDocs.length}{' '}
                {newDocs.length === 1
                  ? 'nova publicação encontrada'
                  : 'novas publicações encontradas'}
              </p>
              <ul className="mt-2 flex flex-col divide-y divide-slate-100 rounded-lg border border-slate-200">
                {newDocs.map((d) => {
                  const url = d.url as string
                  const checked = !deselected.has(url)
                  const kindLabel = KIND_LABELS[d.kind] ?? null
                  return (
                    <li key={url} className="flex items-start gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(url)}
                        aria-label={`Adicionar: ${d.name}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-cyan-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold tabular-nums text-slate-500">
                            {d.publishedAt != null
                              ? shortDate.format(new Date(d.publishedAt))
                              : 'sem data'}
                          </span>
                          {kindLabel != null && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                              {kindLabel}
                            </span>
                          )}
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-cyan-700 hover:underline"
                          >
                            abrir
                          </a>
                        </div>
                        <p className="mt-0.5 text-sm font-medium text-slate-800">
                          {d.name}
                        </p>
                        {d.summary != null && d.summary.trim() !== '' && (
                          <p className="text-xs text-slate-500">{d.summary}</p>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-2 flex items-center justify-end gap-3">
                {add.isError && (
                  <span className="text-xs text-rose-600">
                    Erro ao adicionar. Tente novamente.
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={busy || selected.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
                >
                  {add.isPending
                    ? 'Adicionando…'
                    : `Adicionar ${selected.length} à timeline`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Análise de um documento (Fase 2): ler PDF → diff → revisar → aplicar */
/* ------------------------------------------------------------------ */

/** Formata o valor de uma mudança: datas ISO → DD/MM/AAAA; texto longo trunca. */
function fmtChange(value: string | null): string {
  if (value == null || value === '') return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-')
    return `${d}/${m}/${y}`
  }
  return value.length > 90 ? `${value.slice(0, 90)}…` : value
}

/** "10 questões · peso 1 · 10 pts" a partir dos números de uma matéria. */
function quadroGroupLine(g: {
  questionCount: number | null
  weight: string | null
  maxScore: string | null
}): string | null {
  const parts = [
    g.questionCount != null
      ? `${g.questionCount} ${g.questionCount === 1 ? 'questão' : 'questões'}`
      : null,
    g.weight != null ? `peso ${g.weight}` : null,
    g.maxScore != null ? `${g.maxScore} pts` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

function DocAnalysis({
  concursoId,
  document,
}: {
  concursoId: string
  document: ConcursoDocument
}) {
  const analyze = useAnalyzeDocumentMutation(concursoId)
  const apply = useApplyDocumentChangesMutation(concursoId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [includeCronograma, setIncludeCronograma] = useState(true)
  const [deselectedCargos, setDeselectedCargos] = useState<Set<string>>(
    new Set(),
  )

  const changes: Array<ProposedChange> = analyze.data?.changes ?? []
  const selected = changes.filter((c) => !deselected.has(c.id))
  const cronograma = analyze.data?.cronograma ?? null
  const applyCronograma = cronograma != null && includeCronograma
  const syllabus = analyze.data?.syllabus ?? null
  const selectedSyllabus =
    syllabus?.filter((s) => !deselectedCargos.has(s.cargoId)) ?? []
  const totalToApply =
    selected.length + (applyCronograma ? 1 : 0) + selectedSyllabus.length
  const applied = document.changesAppliedAt != null

  const runAnalyze = (file?: File) => {
    if (analyze.isPending) return
    setDeselected(new Set())
    setIncludeCronograma(true)
    setDeselectedCargos(new Set())
    apply.reset()
    analyze.mutate({ documentId: document.id, file })
  }

  const toggle = (id: string) =>
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleCargo = (cargoId: string) =>
    setDeselectedCargos((prev) => {
      const next = new Set(prev)
      if (next.has(cargoId)) next.delete(cargoId)
      else next.add(cargoId)
      return next
    })

  const runApply = () => {
    if (apply.isPending || totalToApply === 0) return
    apply.mutate({
      documentId: document.id,
      changes: selected,
      cronograma: applyCronograma ? cronograma : null,
      syllabus: selectedSyllabus.length > 0 ? selectedSyllabus : null,
    })
  }

  const analyzeError =
    analyze.error instanceof ApiError
      ? analyze.error.message
      : analyze.error
        ? 'Falha ao analisar o documento.'
        : null

  return (
    <div className="mt-2">
      {/* Dois caminhos sempre à mão (como no colar-HTML): analisar baixando da
       *  URL (padrão) ou enviar o PDF baixado à mão — sites com WAF/Cloudflare
       *  devolvem 403 ao download automático do PDF. */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => runAnalyze()}
          disabled={analyze.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
        >
          {analyze.isPending
            ? 'Lendo o documento…'
            : analyze.isSuccess || applied
              ? 'Analisar novamente'
              : 'Analisar alterações'}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={analyze.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
        >
          <ArrowUpTrayIcon className="h-3.5 w-3.5" />
          Analisar de um PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          aria-label={`Enviar PDF para analisar: ${document.title}`}
          onChange={(ev) => {
            const file = ev.target.files?.[0]
            // Permite reescolher o mesmo arquivo depois de um erro.
            ev.target.value = ''
            if (file != null) runAnalyze(file)
          }}
        />
      </div>

      {analyzeError != null && (
        <p className="mt-1 text-xs text-rose-600">
          {analyzeError}{' '}
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-cyan-700 underline"
          >
            Baixe o PDF no navegador
          </a>{' '}
          e use “Analisar de um PDF”.
        </p>
      )}

      {apply.isSuccess && (
        <p className="mt-1 text-xs font-semibold text-emerald-700">
          {apply.data.appliedCount}{' '}
          {apply.data.appliedCount === 1
            ? 'alteração aplicada'
            : 'alterações aplicadas'}{' '}
          ao concurso.
        </p>
      )}

      {analyze.isSuccess && !apply.isSuccess && (
        <div className="mt-2">
          {changes.length === 0 && cronograma == null && syllabus == null ? (
            <p className="text-xs text-slate-500">
              Nenhuma alteração detectada neste documento.
            </p>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              {changes.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-700">
                    {changes.length}{' '}
                    {changes.length === 1
                      ? 'alteração proposta'
                      : 'alterações propostas'}{' '}
                    — revise antes de aplicar
                  </p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {changes.map((c) => {
                      const checked = !deselected.has(c.id)
                      return (
                        <li key={c.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(c.id)}
                            aria-label={`Aplicar: ${c.label}`}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-600"
                          />
                          <div className="min-w-0 flex-1 text-xs">
                            <p className="font-semibold text-slate-800">
                              {c.label}
                              {c.cargoRole != null ? ` — ${c.cargoRole}` : ''}{' '}
                              <span className="font-normal text-slate-400">
                                ({c.target === 'cargo' ? 'cargo' : 'concurso'})
                              </span>
                            </p>
                            <p className="text-slate-600">
                              <span className="text-slate-400 line-through">
                                {fmtChange(c.currentValue)}
                              </span>{' '}
                              →{' '}
                              <span className="font-semibold">
                                {fmtChange(c.newValue)}
                              </span>
                            </p>
                            {c.evidence != null && c.evidence !== '' && (
                              <p className="mt-0.5 italic text-slate-400">
                                “{c.evidence}”
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}

              {/* Cronograma proposto (etapas datadas extraídas do PDF) */}
              {cronograma != null && (
                <div
                  className={
                    changes.length > 0
                      ? 'mt-3 border-t border-slate-200 pt-3'
                      : ''
                  }
                >
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={includeCronograma}
                      onChange={() => setIncludeCronograma((v) => !v)}
                      aria-label="Aplicar cronograma proposto"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-600"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      Cronograma proposto ({cronograma.length}{' '}
                      {cronograma.length === 1 ? 'etapa' : 'etapas'}) — substitui
                      o atual
                    </span>
                  </label>
                  <ol className="mt-2 ml-6 flex flex-col gap-1">
                    {cronograma.map((e, i) => (
                      <li key={`${e.name}-${i}`} className="text-xs">
                        <span className="font-semibold tabular-nums text-slate-500">
                          {fmtChange(e.date)}
                        </span>{' '}
                        <span className="font-medium text-slate-800">
                          {e.name}
                        </span>
                        {e.description != null && e.description !== '' && (
                          <span className="text-slate-400"> — {e.description}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Quadros de matérias propostos (conteúdo programático + números) */}
              {syllabus != null &&
                syllabus.map((cargo) => {
                  const included = !deselectedCargos.has(cargo.cargoId)
                  return (
                    <div
                      key={cargo.cargoId}
                      className={
                        changes.length > 0 || cronograma != null
                          ? 'mt-3 border-t border-slate-200 pt-3'
                          : ''
                      }
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={included}
                          onChange={() => toggleCargo(cargo.cargoId)}
                          aria-label={`Aplicar quadro de matérias: ${cargo.cargoRole}`}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-600"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Quadro de matérias — {cargo.cargoRole} (
                          {cargo.groups.length}{' '}
                          {cargo.groups.length === 1 ? 'matéria' : 'matérias'}) —
                          substitui o atual
                        </span>
                      </label>
                      <ul className="mt-2 ml-6 flex flex-col gap-1">
                        {cargo.groups.map((g, i) => {
                          const numbers = quadroGroupLine(g)
                          return (
                            <li key={`${g.name}-${i}`} className="text-xs">
                              <span className="font-medium text-slate-800">
                                {g.name}
                              </span>
                              {numbers != null && (
                                <span className="text-slate-500">
                                  {' '}
                                  · {numbers}
                                </span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}

              <div className="mt-2 flex items-center justify-end gap-3">
                {apply.isError && (
                  <span className="text-xs text-rose-600">Erro ao aplicar.</span>
                )}
                <button
                  type="button"
                  onClick={runApply}
                  disabled={apply.isPending || totalToApply === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
                >
                  {apply.isPending
                    ? 'Aplicando…'
                    : `Aplicar ${totalToApply} ${totalToApply === 1 ? 'item' : 'itens'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
