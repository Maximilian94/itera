import { createFileRoute } from '@tanstack/react-router'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import { useEffect, useState } from 'react'
import { ApiError, apiFetch } from '@/lib/api'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'

type ExamBoard = {
  id: string
  name: string
  logoUrl: string
}

export const Route = createFileRoute('/_authenticated/exam-boards')({
  component: RouteComponent,
})

function RouteComponent() {
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade();
  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createLogoUrl, setCreateLogoUrl] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editLogoUrl, setEditLogoUrl] = useState('')

  async function createBoard() {
    setError(null)
    try {
      const created = await apiFetch<ExamBoard>('/exam-boards', {
        method: 'POST',
        body: JSON.stringify({ name: createName, logoUrl: createLogoUrl }),
      })
      // TODO: add the exam board to the list
      // setRows((prev) => {
      //   const next = [...prev, created]
      //   next.sort((a, b) => a.name.localeCompare(b.name))
      //   return next
      // })
      setCreateOpen(false)
      setCreateName('')
      setCreateLogoUrl('')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create exam board')
    }
  }

  function startEdit(row: ExamBoard) {
    setEditingId(row.id)
    setEditName(row.name)
    setEditLogoUrl(row.logoUrl)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditLogoUrl('')
  }

  async function saveEdit() {
    if (!editingId) return
    setError(null)
    try {
      const updated = await apiFetch<ExamBoard>(`/exam-boards/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, logoUrl: editLogoUrl }),
      })
      // TODO: update the exam board in the list
      // setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      cancelEdit()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update exam board')
    }
  }

  async function remove(row: ExamBoard) {
    setError(null)
    try {
      await apiFetch<{ ok: true }>(`/exam-boards/${row.id}`, { method: 'DELETE' })
      // TODO: remove the exam board from the list
      // setRows((prev) => prev.filter((r) => r.id !== row.id))
      if (editingId === row.id) cancelEdit()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to delete exam board')
    }
  }

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Exam Boards</Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Add exam board
        </Button>
      </Stack>

      <Box mt={2}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : isLoadingExamBoards ? (
          <Typography>Loading...</Typography>
        ) : null}
      </Box>

      <Box mt={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Logo URL</TableCell>
              <TableCell align="right" width={140}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {examBoards?.map((examBoard) => {
              const isEditing = examBoard.id === editingId
              return (
                <TableRow key={examBoard.id}>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        fullWidth
                      />
                    ) : (
                      examBoard.name
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={editLogoUrl}
                        onChange={(e) => setEditLogoUrl(e.target.value)}
                        fullWidth
                      />
                    ) : (
                      examBoard.logoUrl
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isEditing ? (
                      <>
                        <IconButton
                          aria-label="save"
                          onClick={saveEdit}
                          disabled={!editName.trim() || !editLogoUrl.trim()}
                        >
                          <SaveIcon />
                        </IconButton>
                        <IconButton aria-label="cancel" onClick={cancelEdit}>
                          <CloseIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          aria-label="edit"
                          onClick={() => startEdit(examBoard)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          onClick={() => remove(examBoard)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoadingExamBoards && examBoards?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Typography color="text.secondary">
                    No exam boards yet. Create one to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Box>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add exam board</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              autoFocus
              fullWidth
            />
            <TextField
              label="Logo URL"
              value={createLogoUrl}
              onChange={(e) => setCreateLogoUrl(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={createBoard}
            disabled={!createName.trim() || !createLogoUrl.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

