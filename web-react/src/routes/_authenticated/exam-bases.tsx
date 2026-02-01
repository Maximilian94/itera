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
  const [createGovernmentScope, setCreateGovernmentScope] = useState<
    'MUNICIPAL' | 'STATE' | 'FEDERAL'
  >('FEDERAL')
  const [createState, setCreateState] = useState('')
  const [createCity, setCreateCity] = useState('')
  const [createSalaryBase, setCreateSalaryBase] = useState('')
  const [createExamDate, setCreateExamDate] = useState('')
  const [createExamBoardId, setCreateExamBoardId] = useState<string>('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editInstitution, setEditInstitution] = useState('')
  const [editGovernmentScope, setEditGovernmentScope] = useState<
    'MUNICIPAL' | 'STATE' | 'FEDERAL'
  >('FEDERAL')
  const [editState, setEditState] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editSalaryBase, setEditSalaryBase] = useState('')
  const [editExamDate, setEditExamDate] = useState('')
  const [editExamBoardId, setEditExamBoardId] = useState<string>('')

  const canCreate = useMemo(() => {
    if (!createName.trim() || !createRole.trim() || !createExamDate.trim()) return false
    if (createGovernmentScope === 'MUNICIPAL') {
      return !!createState.trim() && !!createCity.trim()
    }
    if (createGovernmentScope === 'STATE') {
      return !!createState.trim() && !createCity.trim()
    }
    return !createState.trim() && !createCity.trim()
  }, [createName, createRole, createExamDate, createGovernmentScope, createState, createCity])

  const canSaveEdit = useMemo(() => {
    if (!editName.trim() || !editRole.trim() || !editExamDate.trim()) return false
    if (editGovernmentScope === 'MUNICIPAL') {
      return !!editState.trim() && !!editCity.trim()
    }
    if (editGovernmentScope === 'STATE') {
      return !!editState.trim() && !editCity.trim()
    }
    return !editState.trim() && !editCity.trim()
  }, [editName, editRole, editExamDate, editGovernmentScope, editState, editCity])

  async function refetchExamBases() {
    await queryClient.invalidateQueries({ queryKey: ['examBases'] })
  }

  function resetCreate() {
    setCreateName('')
    setCreateRole('')
    setCreateInstitution('')
    setCreateGovernmentScope('FEDERAL')
    setCreateState('')
    setCreateCity('')
    setCreateSalaryBase('')
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
        governmentScope: createGovernmentScope,
        state: createState.trim() ? createState.trim() : null,
        city: createCity.trim() ? createCity.trim() : null,
        salaryBase: createSalaryBase.trim() ? createSalaryBase.trim() : null,
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
    setEditGovernmentScope(row.governmentScope)
    setEditState(row.state ?? '')
    setEditCity(row.city ?? '')
    setEditSalaryBase(row.salaryBase ?? '')
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
    setEditGovernmentScope('FEDERAL')
    setEditState('')
    setEditCity('')
    setEditSalaryBase('')
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
        governmentScope: editGovernmentScope,
        state: editState.trim() ? editState.trim() : null,
        city: editCity.trim() ? editCity.trim() : null,
        salaryBase: editSalaryBase.trim() ? editSalaryBase.trim() : null,
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
              <TableCell>Scope</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Salary base</TableCell>
              <TableCell>Exam date</TableCell>
              <TableCell>Exam board</TableCell>
              <TableCell align="right" width={80}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {examBases?.map((row) => {
              const location = row.governmentScope === 'MUNICIPAL'
                ? `${row.city ?? ''}/${row.state ?? ''}`.replace(/^\/|\/$/g, '')
                : row.governmentScope === 'STATE'
                  ? row.state ?? '—'
                  : '—'
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.role}</TableCell>
                  <TableCell>{row.institution ?? '—'}</TableCell>
                  <TableCell>{row.governmentScope}</TableCell>
                  <TableCell>{location || '—'}</TableCell>
                  <TableCell>{row.salaryBase ?? '—'}</TableCell>
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

            <FormControl fullWidth>
              <InputLabel id="create-scope-label">Government scope</InputLabel>
              <Select
                labelId="create-scope-label"
                value={createGovernmentScope}
                label="Government scope"
                onChange={(e) => {
                  const v = e.target.value as 'MUNICIPAL' | 'STATE' | 'FEDERAL'
                  setCreateGovernmentScope(v)
                  if (v === 'FEDERAL') {
                    setCreateState('')
                    setCreateCity('')
                  } else if (v === 'STATE') {
                    setCreateCity('')
                  }
                }}
              >
                <MenuItem value="MUNICIPAL">Municipal</MenuItem>
                <MenuItem value="STATE">State</MenuItem>
                <MenuItem value="FEDERAL">Federal</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" gap={2}>
              <TextField
                label="State"
                value={createState}
                onChange={(e) => setCreateState(e.target.value)}
                disabled={createGovernmentScope === 'FEDERAL'}
                fullWidth
              />
              <TextField
                label="City"
                value={createCity}
                onChange={(e) => setCreateCity(e.target.value)}
                disabled={createGovernmentScope !== 'MUNICIPAL'}
                fullWidth
              />
            </Stack>

            <TextField
              label="Salary base"
              type="number"
              value={createSalaryBase}
              onChange={(e) => setCreateSalaryBase(e.target.value)}
              inputProps={{ step: '0.01', min: 0 }}
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

            <FormControl fullWidth>
              <InputLabel id="edit-scope-label">Government scope</InputLabel>
              <Select
                labelId="edit-scope-label"
                value={editGovernmentScope}
                label="Government scope"
                onChange={(e) => {
                  const v = e.target.value as 'MUNICIPAL' | 'STATE' | 'FEDERAL'
                  setEditGovernmentScope(v)
                  if (v === 'FEDERAL') {
                    setEditState('')
                    setEditCity('')
                  } else if (v === 'STATE') {
                    setEditCity('')
                  }
                }}
              >
                <MenuItem value="MUNICIPAL">Municipal</MenuItem>
                <MenuItem value="STATE">State</MenuItem>
                <MenuItem value="FEDERAL">Federal</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" gap={2}>
              <TextField
                label="State"
                value={editState}
                onChange={(e) => setEditState(e.target.value)}
                disabled={editGovernmentScope === 'FEDERAL'}
                fullWidth
              />
              <TextField
                label="City"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                disabled={editGovernmentScope !== 'MUNICIPAL'}
                fullWidth
              />
            </Stack>

            <TextField
              label="Salary"
              type="number"
              value={editSalaryBase}
              onChange={(e) => setEditSalaryBase(e.target.value)}
              inputProps={{ step: '0.01', min: 0 }}
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

