import { useExamBaseFacade } from '@/features/examBase/hook/useExamBase.facade'
import { examBaseService } from '@/features/examBase/services/examBase.service'
import type { ExamBase } from '@/features/examBase/domain/examBase.types'
import { useExamBoardFacade } from '@/features/examBoard/hook/useExamBoard.facade'
import { ApiError } from '@/lib/api'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

function isoToDateInput(value: string) {
  // value can be ISO datetime or ISO date string; normalize for <input type="date">
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function dateInputToIso(value: string) {
  // <input type="date"> gives YYYY-MM-DD; keep it as ISO date string for backend
  return value
}

export const Route = createFileRoute('/_authenticated/exam-bases')({
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient()
  const { examBases, isLoadingExamBases } = useExamBaseFacade()
  const { examBoards, isLoadingExamBoards } = useExamBoardFacade()

  const [error, setError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createRole, setCreateRole] = useState('')
  const [createInstitution, setCreateInstitution] = useState('')
  const [createExamDate, setCreateExamDate] = useState('')
  const [createExamBoardId, setCreateExamBoardId] = useState<string>('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editExamDate, setEditExamDate] = useState('')
  const [editExamBoardId, setEditExamBoardId] = useState<string>('')

  const canCreate = useMemo(() => {
    return (
      !!createName.trim() && !!createRole.trim() && !!createExamDate.trim()
    )
  }, [createName, createRole, createExamDate])

  const canSaveEdit = useMemo(() => {
    return !!editName.trim() && !!editRole.trim() && !!editExamDate.trim()
  }, [editName, editRole, editExamDate])

  async function refetchExamBases() {
    await queryClient.invalidateQueries({ queryKey: ['examBases'] })
  }

  function resetCreate() {
    setCreateName('')
    setCreateRole('')
    setCreateInstitution('')
    setCreateExamDate('')
    setCreateExamBoardId('')
  }

  async function createExamBase() {
    setError(null)
    try {
      await examBaseService.create({
        name: createName.trim(),
        role: createRole.trim(),
        institution: createInstitution.trim() || undefined,
        examDate: dateInputToIso(createExamDate.trim()),
        examBoardId: createExamBoardId || undefined,
      })
      setCreateOpen(false)
      resetCreate()
      await refetchExamBases()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to create exam')
    }
  }

  function startEdit(row: ExamBase) {
    setEditingId(row.id)
    setEditName(row.name ?? '')
    setEditRole(row.role ?? '')
    setEditInstitution(row.institution ?? '')
    setEditExamDate(isoToDateInput(row.examDate))
    setEditExamBoardId(row.examBoardId ?? '')
    setEditOpen(true)
  }

  function cancelEdit() {
    setEditOpen(false)
    setEditingId(null)
    setEditName('')
    setEditRole('')
    setEditInstitution('')
    setEditExamDate('')
    setEditExamBoardId('')
  }

  async function saveEdit() {
    if (!editingId) return
    setError(null)
    try {
      await examBaseService.update(editingId, {
        name: editName.trim(),
        role: editRole.trim(),
        institution: editInstitution.trim() || null,
        examDate: dateInputToIso(editExamDate.trim()),
        examBoardId: editExamBoardId || null,
      })
      cancelEdit()
      await refetchExamBases()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to update exam')
    }
  }

  return (
    <Box p={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Exam Base</Typography>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Add exam
        </Button>
      </Stack>

      <Box mt={2}>
        {error ? (
          <Alert severity="error">{error}</Alert>
        ) : isLoadingExamBases || isLoadingExamBoards ? (
          <Typography>Loading...</Typography>
        ) : null}
      </Box>

      <Box mt={2}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Institution</TableCell>
              <TableCell>Exam date</TableCell>
              <TableCell>Exam board</TableCell>
              <TableCell align="right" width={80}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {examBases?.map((row) => {
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.institution ?? '—'}</TableCell>
                  <TableCell>{isoToDateInput(row.examDate) || '—'}</TableCell>
                  <TableCell>{row.examBoard?.name ?? '—'}</TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="edit" onClick={() => startEdit(row)}>
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
            {!isLoadingExamBases && (examBases?.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary">
                    No exams yet. Create one to get started.
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
        <DialogTitle>Add exam</DialogTitle>
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
              label="Role"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              placeholder="e.g. nurs"
              fullWidth
            />

            <TextField
              label="Institution"
              value={createInstitution}
              onChange={(e) => setCreateInstitution(e.target.value)}
              fullWidth
            />

            <TextField
              label="Exam date"
              type="date"
              value={createExamDate}
              onChange={(e) => setCreateExamDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="create-exam-board-label">Exam board</InputLabel>
              <Select
                labelId="create-exam-board-label"
                value={createExamBoardId}
                label="Exam board"
                onChange={(e) => setCreateExamBoardId(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {(examBoards ?? []).map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createExamBase} disabled={!canCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={cancelEdit} fullWidth maxWidth="sm">
        <DialogTitle>Edit exam</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField
              label="Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
              fullWidth
            />

            <TextField
              label="Role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              fullWidth
            />

            <TextField
              label="Institution"
              value={editInstitution}
              onChange={(e) => setEditInstitution(e.target.value)}
              fullWidth
            />

            <TextField
              label="Exam date"
              type="date"
              value={editExamDate}
              onChange={(e) => setEditExamDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel id="edit-exam-board-label">Exam board</InputLabel>
              <Select
                labelId="edit-exam-board-label"
                value={editExamBoardId}
                label="Exam board"
                onChange={(e) => setEditExamBoardId(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {(examBoards ?? []).map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEdit}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEdit}
            disabled={!canSaveEdit || !editingId}
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

