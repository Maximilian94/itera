import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Chip, TextField } from '@mui/material'
import {
  ArrowTopRightOnSquareIcon,
  DocumentMagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import type { ScrapedDocument, ScrapedDocumentKind } from '@/features/scraper/scraper.types'
import { authService } from '@/features/auth/services/auth.service'
import {
  useScrapeDocumentsFromHtmlMutation,
  useScrapeDocumentsMutation,
} from '@/features/scraper/scraper.queries'
import { stashScrape } from '@/features/scraper/scrape-stash'
import { ApiError } from '@/lib/api'

export const Route = createFileRoute('/_authenticated/admin/document-scraper')({
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: DocumentScraperPage,
})

const KIND_LABELS: Record<ScrapedDocumentKind, string | null> = {
  EDITAL_ABERTURA: 'Edital de abertura',
  RETIFICACAO: 'Retificação',
  GABARITO: 'Gabarito',
  RESULTADO: 'Resultado',
  CONVOCACAO: 'Convocação',
  COMUNICADO: 'Comunicado',
  OUTRO: null,
}

function DocumentScraperPage() {
  const [url, setUrl] = useState('')
  const [showHtmlPaste, setShowHtmlPaste] = useState(false)
  const [htmlText, setHtmlText] = useState('')
  const scrapeMutation = useScrapeDocumentsMutation()
  const htmlMutation = useScrapeDocumentsFromHtmlMutation()
  const navigate = useNavigate()

  // O resultado vem de qualquer um dos dois caminhos (URL ou HTML colado).
  const result = scrapeMutation.data ?? htmlMutation.data ?? null
  const isPending = scrapeMutation.isPending || htmlMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || isPending) return
    htmlMutation.reset()
    scrapeMutation.mutate(trimmed)
  }

  const handleSubmitHtml = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = url.trim()
    const trimmedHtml = htmlText.trim()
    if (!trimmedUrl || !trimmedHtml || isPending) return
    scrapeMutation.reset()
    htmlMutation.mutate({ html: trimmedHtml, sourceUrl: trimmedUrl })
  }

  /** Página dedicada de criação: chega com a URL do edital e extrai sozinha.
   *  Também guarda TODOS os documentos raspados (sessionStorage) para virarem a
   *  timeline de Notícias do concurso — grande demais para query params. */
  const handleUseAsEdital = (doc: ScrapedDocument) => {
    if (!doc.url) return
    if (result) {
      stashScrape({ sourceUrl: result.sourceUrl, documents: result.documents })
    }
    void navigate({
      to: '/admin/criar-concurso',
      search: { editalUrl: doc.url, editalName: doc.name },
    })
  }

  const activeError = scrapeMutation.error ?? htmlMutation.error
  const errorMessage = activeError
    ? activeError instanceof ApiError
      ? activeError.message
      : 'Erro inesperado ao raspar a página.'
    : null

  return (
    // Sem h-full/overflow próprio: o scroll é do div do layout _authenticated.
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          Scraper de Documentos
        </h1>
        <p className="text-sm text-slate-500">
          Cole a URL de uma página de concurso: a IA lista os documentos
          publicados e cria o concurso a partir do edital de abertura.
        </p>
      </div>

      {/* URL form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 flex items-center gap-3 flex-wrap"
      >
        <TextField
          size="small"
          placeholder="https://www.banca.org.br/concursos/prefeitura-x/documentos"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ flex: 1, minWidth: 320 }}
          type="url"
          disabled={isPending}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isPending || !url.trim()}
        >
          {isPending ? 'Raspando página...' : 'Buscar documentos'}
        </Button>
      </form>

      {/* Fallback p/ páginas com anti-bot forte (Cloudflare "Just a moment"):
          o admin abre a página no próprio navegador, copia o HTML e cola aqui. */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowHtmlPaste((v) => !v)}
          aria-expanded={showHtmlPaste}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          A página bloqueou (Cloudflare / “Verifique que é humano”)? Cole o HTML
          manualmente
          <span className="text-xs text-slate-400">
            {showHtmlPaste ? 'ocultar' : 'abrir'}
          </span>
        </button>
        {showHtmlPaste && (
          <form
            onSubmit={handleSubmitHtml}
            className="flex flex-col gap-3 border-t border-slate-100 p-4"
          >
            <ol className="ml-4 list-decimal text-xs text-slate-500 space-y-0.5">
              <li>Abra a página no seu navegador (passe o desafio anti-robô).</li>
              <li>
                Veja o código-fonte (Ctrl+U / Cmd+Opt+U) e copie tudo (Ctrl+A →
                Ctrl+C).
              </li>
              <li>
                Preencha a URL da página acima (para salvar a origem e resolver
                os links) e cole o HTML abaixo.
              </li>
            </ol>
            <TextField
              size="small"
              label="HTML da página"
              placeholder="<!DOCTYPE html>..."
              value={htmlText}
              onChange={(e) => setHtmlText(e.target.value)}
              multiline
              minRows={6}
              maxRows={16}
              disabled={isPending}
            />
            <div className="flex items-center justify-end gap-3">
              {!url.trim() && (
                <span className="text-xs text-amber-700">
                  Preencha a URL da página no campo acima.
                </span>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={isPending || !htmlText.trim() || !url.trim()}
              >
                {isPending ? 'Extraindo...' : 'Extrair do HTML colado'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {isPending && (
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-700 animate-pulse">
          Baixando a página e extraindo os documentos com IA — isso leva
          alguns segundos...
        </div>
      )}

      {errorMessage && !isPending && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Results */}
      {result && !isPending && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-slate-600">
              <strong>{result.documents.length}</strong>{' '}
              {result.documents.length === 1
                ? 'documento encontrado'
                : 'documentos encontrados'}{' '}
              em{' '}
              <a
                href={result.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-700 hover:underline break-all"
              >
                {result.sourceUrl}
              </a>
            </span>
            <span className="text-xs text-slate-400">
              Raspado em {dayjs(result.fetchedAt).format('DD/MM/YYYY HH:mm')}
            </span>
          </div>

          {result.documents.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <DocumentMagnifyingGlassIcon className="size-8" />
              Nenhum documento identificado nesta página.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium w-32">Publicação</th>
                  <th className="px-4 py-2 font-medium">Documento</th>
                  <th className="px-4 py-2 font-medium w-40">Tipo</th>
                  <th className="px-4 py-2 font-medium w-64">Ações</th>
                </tr>
              </thead>
              <tbody>
                {result.documents.map((doc, i) => (
                  <tr
                    key={`${doc.url ?? doc.name}-${i}`}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">
                      {doc.publishedAt
                        ? dayjs(doc.publishedAt).format('DD/MM/YYYY')
                        : '—'}
                    </td>
                    <td className="px-4 py-2 text-slate-800">{doc.name}</td>
                    <td className="px-4 py-2">
                      {KIND_LABELS[doc.kind] ? (
                        <Chip
                          label={KIND_LABELS[doc.kind]}
                          size="small"
                          color={doc.kind === 'EDITAL_ABERTURA' ? 'primary' : 'default'}
                          variant={doc.kind === 'EDITAL_ABERTURA' ? 'filled' : 'outlined'}
                        />
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-3">
                        {doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            title={doc.url}
                            aria-label={`Abrir: ${doc.name}`}
                            className="inline-flex items-center gap-1 text-cyan-700 hover:underline"
                          >
                            Abrir
                            <ArrowTopRightOnSquareIcon className="size-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                        {doc.url &&
                          (doc.kind === 'EDITAL_ABERTURA' ? (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleUseAsEdital(doc)}
                            >
                              Criar concurso
                            </Button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUseAsEdital(doc)}
                              className="text-xs text-slate-500 hover:text-slate-700 underline"
                            >
                              Usar como edital
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
