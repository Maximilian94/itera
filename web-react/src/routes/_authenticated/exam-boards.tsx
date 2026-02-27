import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { authService } from '@/features/auth/services/auth.service'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { examBoardKeys } from '@/features/examBoard/queries/examBoard.queries'
import { Card } from '@/components/Card'
import {
  BuildingLibraryIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

type ExamBoard = {
  id: string
  name: string
  alias?: string | null
  websiteUrl?: string | null
  logoUrl: string
}

export const Route = createFileRoute('/_authenticated/exam-boards')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade()
  const { examBases } = useExamBaseFacade()
  const { data: profileData } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => authService.getProfile(),
  })

  const isAdmin = profileData?.user?.role === 'ADMIN'
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createAlias, setCreateAlias] = useState('')
  const [createWebsiteUrl, setCreateWebsiteUrl] = useState('')
  const [createLogoUrl, setCreateLogoUrl] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editAlias, setEditAlias] = useState('')
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('')
  const [editLogoUrl, setEditLogoUrl] = useState('')

  const boardCountsMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const eb of examBases ?? []) {
      if (eb.examBoardId) {
        map.set(eb.examBoardId, (map.get(eb.examBoardId) ?? 0) + 1)
      }
    }
    return map
  }, [examBases])

  async function refetchBoards() {
    await queryClient.invalidateQueries({ queryKey: examBoardKeys.examBoards })
  }

  async function createBoard() {
    setError(null)
    try {
      await apiFetch<ExamBoard>('/exam-boards', {
        method: 'POST',
        body: JSON.stringify({
          name: createName,
          alias: createAlias.trim() || undefined,
          websiteUrl: createWebsiteUrl.trim() || undefined,
          logoUrl: createLogoUrl,
        }),
      })
      setCreateOpen(false)
      setCreateName('')
      setCreateAlias('')
      setCreateWebsiteUrl('')
      setCreateLogoUrl('')
      await refetchBoards()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao criar banca')
    }
  }

  function startEdit(row: ExamBoard) {
    setEditingId(row.id)
    setEditName(row.name)
    setEditAlias(row.alias ?? '')
    setEditWebsiteUrl(row.websiteUrl ?? '')
    setEditLogoUrl(row.logoUrl)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditAlias('')
    setEditWebsiteUrl('')
    setEditLogoUrl('')
  }

  async function saveEdit() {
    if (!editingId) return
    setError(null)
    try {
      await apiFetch<ExamBoard>(`/exam-boards/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          alias: editAlias.trim() || undefined,
          websiteUrl: editWebsiteUrl.trim() || undefined,
          logoUrl: editLogoUrl,
        }),
      })
      cancelEdit()
      await refetchBoards()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao atualizar banca')
    }
  }

  async function remove(row: ExamBoard) {
    setError(null)
    try {
      await apiFetch<{ ok: true }>(`/exam-boards/${row.id}`, {
        method: 'DELETE',
      })
      if (editingId === row.id) cancelEdit()
      await refetchBoards()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao excluir banca')
    }
  }

  const totalBoards = examBoards?.length ?? 0
  const totalExams = (examBases ?? []).length

  return (
    <div className="flex flex-col gap-6 pb-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center">
        <ol className="flex items-center gap-1.5 text-sm">
          <li>
            <Link
              to="/exams"
              search={{ board: undefined }}
              className="text-slate-500 hover:text-violet-600 font-medium transition-colors no-underline"
            >
              Exames
            </Link>
          </li>
          <li className="flex items-center gap-1.5 text-slate-400 min-w-0">
            <ChevronRightIcon className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="text-slate-900 font-semibold">Bancas</span>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bancas</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isLoadingExamBoards
              ? 'Carregando…'
              : `${totalBoards} ${totalBoards === 1 ? 'banca' : 'bancas'} · ${totalExams} ${totalExams === 1 ? 'prova' : 'provas'} no total`}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors cursor-pointer shadow-sm shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Nova banca
          </button>
        )}
      </div>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Board cards */}
      {isLoadingExamBoards ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-slate-200/60" />
          ))}
        </div>
      ) : !examBoards?.length ? (
        <Card
          noElevation
          className="p-12 border border-slate-200 text-center"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <BuildingLibraryIcon className="w-7 h-7 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">
                Nenhuma banca cadastrada
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isAdmin
                  ? 'Clique em "Nova banca" para adicionar.'
                  : 'Aguarde o cadastro de bancas.'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {examBoards.map((board) => {
            const count = boardCountsMap.get(board.id) ?? 0
            const isEditing = board.id === editingId

            return (
              <Card
                key={board.id}
                noElevation
                className="p-5 border border-slate-200 hover:border-slate-300 transition-all duration-200 overflow-hidden"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-4">
                    <TextField
                      label="Nome"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label="Alias"
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="Ex: CESPE, FGV"
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label="URL do site"
                      value={editWebsiteUrl}
                      onChange={(e) => setEditWebsiteUrl(e.target.value)}
                      placeholder="https://..."
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <TextField
                      label="URL do logo"
                      value={editLogoUrl}
                      onChange={(e) => setEditLogoUrl(e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={cancelEdit}
                        sx={{ textTransform: 'none', borderRadius: 2 }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={saveEdit}
                        disabled={!editName.trim() || !editLogoUrl.trim()}
                        sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-4">
                      {board.logoUrl && (
                        <img
                          src={board.logoUrl}
                          alt={board.alias ?? board.name}
                          className="w-12 h-12 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Tooltip title={board.name}>
                          <h3 className="text-base font-semibold text-slate-900 truncate cursor-default">
                            {board.alias ?? board.name}
                          </h3>
                        </Tooltip>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {count} {count === 1 ? 'prova' : 'provas'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
                      <Link
                        to="/exams"
                        search={{ board: board.id }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 no-underline"
                      >
                        <DocumentTextIcon className="w-4 h-4" />
                        Ver exames
                        <ChevronRightIcon className="w-3.5 h-3.5" />
                      </Link>
                      {isAdmin && (
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => startEdit(board)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            aria-label="Editar"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(board)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            aria-label="Excluir"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nova banca</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Nome"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Alias"
              value={createAlias}
              onChange={(e) => setCreateAlias(e.target.value)}
              placeholder="Ex: CESPE, FGV"
              fullWidth
            />
            <TextField
              label="URL do site"
              value={createWebsiteUrl}
              onChange={(e) => setCreateWebsiteUrl(e.target.value)}
              placeholder="https://..."
              fullWidth
            />
            <TextField
              label="URL do logo"
              value={createLogoUrl}
              onChange={(e) => setCreateLogoUrl(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={createBoard}
            disabled={!createName.trim() || !createLogoUrl.trim()}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
