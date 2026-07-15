import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Chip, IconButton, TextField, Tooltip } from '@mui/material'
import {
  ArrowTopRightOnSquareIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import dayjs from 'dayjs'
import { authService } from '@/features/auth/services/auth.service'
import { useExtractPdfsMutation } from '@/features/scraper/scraper.queries'
import type { ExtractedPdfLink } from '@/features/scraper/scraper.types'

export const Route = createFileRoute('/_authenticated/admin/pdf-extractor')({
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: PdfExtractorPage,
})

const SOURCE_LABELS: Record<ExtractedPdfLink['source'], string> = {
  anchor: 'Link',
  embed: 'Embutido',
  network: 'Rede',
}

const SOURCE_COLORS: Record<
  ExtractedPdfLink['source'],
  'info' | 'warning' | 'default'
> = {
  anchor: 'info',
  embed: 'warning',
  network: 'default',
}

function PdfExtractorPage() {
  const [url, setUrl] = useState('')
  const extractMutation = useExtractPdfsMutation()
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  const result = extractMutation.data
  const isPending = extractMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || isPending) return
    extractMutation.mutate(trimmed)
  }

  const handleCopy = async (link: string) => {
    await navigator.clipboard.writeText(link)
    setCopiedUrl(link)
    setTimeout(() => setCopiedUrl((v) => (v === link ? null : v)), 1500)
  }

  const handleCopyAll = async () => {
    if (!result) return
    await navigator.clipboard.writeText(
      result.pdfLinks.map((l) => l.url).join('\n'),
    )
    setCopiedUrl('__all__')
    setTimeout(() => setCopiedUrl((v) => (v === '__all__' ? null : v)), 1500)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold text-slate-800">
        Extrator de PDFs — Webscraping
      </h1>
      <p className="text-sm text-slate-500 -mt-2">
        Cole a URL de uma página (edital, concurso, etc.) e o scraper abre a
        página num browser headless e lista todos os PDFs encontrados.
      </p>

      {/* Input panel */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 flex items-center gap-3 flex-wrap"
      >
        <TextField
          size="small"
          type="url"
          placeholder="https://exemplo.gov.br/concursos/edital-2026"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ flex: 1, minWidth: 320 }}
          disabled={isPending}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={isPending || !url.trim()}
        >
          {isPending ? 'Extraindo...' : 'Extrair PDFs'}
        </Button>
      </form>

      {isPending && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-cyan-600 animate-pulse">
            Abrindo a página no browser headless e procurando PDFs — isso pode
            levar até ~30s...
          </p>
        </div>
      )}

      {extractMutation.isError && !isPending && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Erro ao extrair PDFs
          </p>
          <p className="text-sm text-red-600 mt-1">
            {extractMutation.error.message}
          </p>
        </div>
      )}

      {result && !isPending && (
        <div className="flex flex-col gap-4">
          {/* Summary panel */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1 min-w-0">
              <span className="text-sm font-medium text-slate-800 truncate">
                {result.pageTitle || '(página sem título)'}
              </span>
              <a
                href={result.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-600 hover:underline truncate"
              >
                {result.finalUrl}
              </a>
              <span className="text-xs text-slate-400">
                Extraído em{' '}
                {dayjs(result.extractedAt).format('DD/MM/YYYY HH:mm:ss')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Chip
                label={`${result.pdfLinks.length} PDF${result.pdfLinks.length === 1 ? '' : 's'}`}
                color={result.pdfLinks.length > 0 ? 'success' : 'default'}
                size="small"
              />
              {result.pdfLinks.length > 0 && (
                <Button size="small" variant="outlined" onClick={handleCopyAll}>
                  {copiedUrl === '__all__' ? 'Copiado!' : 'Copiar todas as URLs'}
                </Button>
              )}
            </div>
          </div>

          {/* Results */}
          {result.pdfLinks.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <DocumentTextIcon className="size-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                Nenhum PDF encontrado nesta página.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="flex bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div className="px-3 py-2 w-[90px]">Origem</div>
                <div className="px-3 py-2 w-[240px]">Rótulo</div>
                <div className="px-3 py-2 flex-1 min-w-[200px]">URL do PDF</div>
                <div className="px-3 py-2 w-[90px]">Ações</div>
              </div>
              {result.pdfLinks.map((link) => (
                <div
                  key={link.url}
                  className="flex items-center border-b border-slate-100 last:border-b-0 text-sm hover:bg-slate-50"
                >
                  <div className="px-3 py-2 w-[90px]">
                    <Chip
                      label={SOURCE_LABELS[link.source]}
                      size="small"
                      color={SOURCE_COLORS[link.source]}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  </div>
                  <div
                    className="px-3 py-2 w-[240px] truncate text-slate-800"
                    title={link.label ?? undefined}
                  >
                    {link.label || <span className="text-slate-400">—</span>}
                  </div>
                  <div className="px-3 py-2 flex-1 min-w-[200px] truncate">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:underline font-mono text-xs"
                      title={link.url}
                    >
                      {link.url}
                    </a>
                  </div>
                  <div className="px-3 py-2 w-[90px] flex items-center gap-1">
                    <Tooltip
                      title={copiedUrl === link.url ? 'Copiado!' : 'Copiar URL'}
                      arrow
                    >
                      <IconButton size="small" onClick={() => handleCopy(link.url)}>
                        <ClipboardDocumentIcon className="size-4" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Abrir PDF em nova aba" arrow>
                      <IconButton
                        size="small"
                        component="a"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ArrowTopRightOnSquareIcon className="size-4" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
