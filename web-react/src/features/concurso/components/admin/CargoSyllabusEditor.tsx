import { Button, IconButton, TextField } from '@mui/material'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { ConcursoSyllabusGroupInput } from '@/features/concurso/services/concurso-admin.service'

/** Linha do editor (tudo string — é estado de formulário). */
export type SyllabusRow = {
  name: string
  topics: string
  questionCount: string
  weight: string
  maxScore: string
}

export const EMPTY_SYLLABUS_ROW: SyllabusRow = {
  name: '',
  topics: '',
  questionCount: '',
  weight: '',
  maxScore: '',
}

/** Payload extraído/salvo → linhas do formulário. */
export function toSyllabusRows(
  groups: Array<ConcursoSyllabusGroupInput> | undefined,
): Array<SyllabusRow> {
  return (groups ?? []).map((g) => ({
    name: g.name,
    topics: g.topics ?? '',
    questionCount: g.questionCount != null ? String(g.questionCount) : '',
    weight: g.weight ?? '',
    maxScore: g.maxScore ?? '',
  }))
}

/** Linhas do formulário → payload da API (descarta matérias sem nome). */
export function toSyllabusInput(
  rows: Array<SyllabusRow>,
): Array<ConcursoSyllabusGroupInput> {
  return rows
    .filter((r) => r.name.trim() !== '')
    .map((r) => ({
      name: r.name.trim(),
      topics: r.topics.trim() || null,
      questionCount: r.questionCount.trim()
        ? parseInt(r.questionCount, 10)
        : null,
      weight: r.weight.trim() || null,
      maxScore: r.maxScore.trim() || null,
    }))
}

/** Soma "N questões · M pts" do quadro, para o cabeçalho. */
function summarize(rows: Array<SyllabusRow>): string | null {
  const q = rows.reduce((acc, r) => acc + (parseInt(r.questionCount, 10) || 0), 0)
  const p = rows.reduce((acc, r) => acc + (parseFloat(r.maxScore) || 0), 0)
  const parts = [
    q > 0 ? `${q} ${q === 1 ? 'questão' : 'questões'}` : null,
    p > 0 ? `${p.toLocaleString('pt-BR')} pts` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

/**
 * Editor do conteúdo programático + quadro de provas de um cargo: matérias com
 * tópicos e os números do edital (nº de questões, peso, pontuação máxima).
 * Controlado — o form dono guarda as linhas.
 */
export function CargoSyllabusEditor({
  rows,
  onChange,
}: {
  rows: Array<SyllabusRow>
  onChange: (rows: Array<SyllabusRow>) => void
}) {
  const total = summarize(rows)

  function setRow<TKey extends keyof SyllabusRow>(
    idx: number,
    key: TKey,
    value: SyllabusRow[TKey],
  ) {
    onChange(rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)))
  }
  function removeRow(idx: number) {
    onChange(rows.filter((_, i) => i !== idx))
  }
  function addRow() {
    onChange([...rows, EMPTY_SYLLABUS_ROW])
  }

  return (
    <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Conteúdo programático · quadro de matérias
          </span>
          {total && (
            <span className="text-xs text-slate-400">({total})</span>
          )}
        </div>
        <Button
          size="small"
          startIcon={<PlusIcon className="size-4" />}
          onClick={addRow}
        >
          Adicionar matéria
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-slate-400">
          Nenhuma matéria. Adicione as disciplinas da prova com o nº de questões,
          o peso e a pontuação máxima (a nota de corte fica no campo “Nota
          mínima” acima).
        </p>
      )}

      {rows.map((row, idx) => (
        <div
          key={idx}
          className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
        >
          <div className="flex items-start gap-2">
            <TextField
              size="small"
              label="Matéria"
              value={row.name}
              onChange={(e) => setRow(idx, 'name', e.target.value)}
              sx={{ flex: 1, minWidth: 160 }}
            />
            <TextField
              size="small"
              label="Nº questões"
              value={row.questionCount}
              onChange={(e) => setRow(idx, 'questionCount', e.target.value)}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              sx={{ width: 96 }}
            />
            <TextField
              size="small"
              label="Peso"
              value={row.weight}
              onChange={(e) => setRow(idx, 'weight', e.target.value)}
              placeholder="1"
              sx={{ width: 80 }}
            />
            <TextField
              size="small"
              label="Pont. máx."
              value={row.maxScore}
              onChange={(e) => setRow(idx, 'maxScore', e.target.value)}
              placeholder="10.00"
              sx={{ width: 100 }}
            />
            <IconButton
              size="small"
              aria-label={`Remover matéria: ${row.name || 'nova matéria'}`}
              onClick={() => removeRow(idx)}
              sx={{ mt: 0.5 }}
            >
              <TrashIcon className="size-4 text-slate-400" />
            </IconButton>
          </div>
          <TextField
            size="small"
            label="Tópicos (conteúdo programático)"
            value={row.topics}
            onChange={(e) => setRow(idx, 'topics', e.target.value)}
            multiline
            minRows={2}
          />
        </div>
      ))}
    </div>
  )
}
