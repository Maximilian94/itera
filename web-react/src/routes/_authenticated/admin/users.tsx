import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useAdminUsersQuery } from '@/features/admin/queries/admin.queries'
import type { AdminUser, AdminUserExamAttempt } from '@/features/admin/domain/admin.types'
import { authService } from '@/features/auth/services/auth.service'
import dayjs from 'dayjs'

export const Route = createFileRoute('/_authenticated/admin/users')({
  beforeLoad: async () => {
    const profile = await authService.getProfile()
    if (profile.user?.role !== 'ADMIN') {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: AdminUsersPage,
})

const PLAN_LABELS: Record<string, string> = {
  ESSENCIAL: 'Essencial',
  ESTRATEGICO: 'Estratégico',
  ELITE: 'Elite',
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'error',
  INCOMPLETE: 'default',
}

type SortField = 'email' | 'createdAt' | 'lastActivity' | 'examAttemptCount' | 'trainingSessionCount'
type SortDir = 'asc' | 'desc'

function AdminUsersPage() {
  const { data: users, isLoading, error } = useAdminUsersQuery()
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)

  const filtered = useMemo(() => {
    if (!users) return []
    const q = search.toLowerCase().trim()
    let result = users
    if (q) {
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q),
      )
    }
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'email':
          cmp = a.email.localeCompare(b.email)
          break
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
        case 'lastActivity':
          cmp = (a.lastActivity ?? '').localeCompare(b.lastActivity ?? '')
          break
        case 'examAttemptCount':
          cmp = a.examAttemptCount - b.examAttemptCount
          break
        case 'trainingSessionCount':
          cmp = a.trainingSessionCount - b.trainingSessionCount
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return result
  }, [users, search, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUpIcon className="size-3 inline ml-1" />
    ) : (
      <ChevronDownIcon className="size-3 inline ml-1" />
    )
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Usuários</h1>
        <p className="text-sm text-slate-500">
          Gerenciar usuários da plataforma
        </p>
      </div>

      <div className="flex items-center gap-4">
        <TextField
          size="small"
          placeholder="Buscar por email, telefone ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 360 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyingGlassIcon className="size-4 text-slate-400" />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <XMarkIcon className="size-4" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }
          }}
        />
        <span className="text-sm text-slate-500">
          {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div className="text-red-600 text-sm">Falha ao carregar usuários.</div>
      )}

      {isLoading && (
        <div className="text-slate-500 text-sm">Carregando...</div>
      )}

      {!isLoading && !error && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('email')}
                >
                  Email <SortIcon field="email" />
                </th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('examAttemptCount')}
                >
                  Provas <SortIcon field="examAttemptCount" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('trainingSessionCount')}
                >
                  Treinos <SortIcon field="trainingSessionCount" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('lastActivity')}
                >
                  Última atividade <SortIcon field="lastActivity" />
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                  onClick={() => handleSort('createdAt')}
                >
                  Cadastro <SortIcon field="createdAt" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedUser(user)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <span data-sensitive="">{user.email}</span>
                    {user.role === 'ADMIN' && (
                      <Chip label="Admin" size="small" color="info" sx={{ ml: 1, height: 20, fontSize: 11 }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600" data-sensitive="">
                    {user.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.currentSubscription
                      ? PLAN_LABELS[user.currentSubscription.plan] ?? user.currentSubscription.plan
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {user.currentSubscription ? (
                      <Chip
                        label={user.currentSubscription.status}
                        size="small"
                        color={STATUS_COLORS[user.currentSubscription.status] ?? 'default'}
                        sx={{ height: 22, fontSize: 11 }}
                      />
                    ) : (
                      <span className="text-slate-400">Sem assinatura</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{user.examAttemptCount}</td>
                  <td className="px-4 py-3 text-slate-600">{user.trainingSessionCount}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.lastActivity
                      ? dayjs(user.lastActivity).format('DD/MM/YY HH:mm')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {dayjs(user.createdAt).format('DD/MM/YY')}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User detail dialog */}
      <Dialog
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedUser && (
          <>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes do Usuário</span>
              <IconButton size="small" onClick={() => setSelectedUser(null)}>
                <XMarkIcon className="size-5" />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <UserDetail user={selectedUser} />
            </DialogContent>
          </>
        )}
      </Dialog>
    </div>
  )
}

function UserDetail({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-col gap-6">
      {/* User info */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-200 pb-1.5">
          Informações
        </h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <InfoItem label="Email" value={user.email} sensitive />
          <InfoItem label="Telefone" value={user.phone || '—'} sensitive />
          <InfoItem label="Role" value={user.role} />
          <InfoItem
            label="Cadastro"
            value={dayjs(user.createdAt).format('DD/MM/YYYY HH:mm')}
          />
        </div>
      </section>

      {/* Subscription */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-200 pb-1.5">
          Assinatura
        </h3>
        {user.currentSubscription ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            <InfoItem
              label="Plano"
              value={PLAN_LABELS[user.currentSubscription.plan] ?? user.currentSubscription.plan}
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
              <Chip
                label={user.currentSubscription.status}
                size="small"
                color={STATUS_COLORS[user.currentSubscription.status] ?? 'default'}
                sx={{ width: 'fit-content', height: 22, fontSize: 11 }}
              />
            </div>
            <InfoItem
              label="Período"
              value={`${dayjs(user.currentSubscription.currentPeriodStart).format('DD/MM/YY')} — ${dayjs(user.currentSubscription.currentPeriodEnd).format('DD/MM/YY')}`}
            />
            {user.currentSubscription.cancelAtPeriodEnd && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cancelamento</span>
                <Chip label="Cancela no fim do período" size="small" color="warning" sx={{ width: 'fit-content', height: 22, fontSize: 11 }} />
              </div>
            )}
            {user.currentSubscription.scheduledPlan && (
              <InfoItem
                label="Plano agendado"
                value={PLAN_LABELS[user.currentSubscription.scheduledPlan] ?? user.currentSubscription.scheduledPlan}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sem assinatura ativa.</p>
        )}
      </section>

      {/* Exam history */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3 border-b border-slate-200 pb-1.5">
          Histórico de Provas ({user.examAttempts.length})
        </h3>
        {user.examAttempts.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma prova realizada.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2">Prova</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Nota</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {user.examAttempts.map((a) => (
                  <ExamAttemptRow key={a.id} attempt={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function ExamAttemptRow({ attempt }: { attempt: AdminUserExamAttempt }) {
  return (
    <tr>
      <td className="px-3 py-2 text-slate-700">{attempt.examBase.name}</td>
      <td className="px-3 py-2 text-slate-600">
        {dayjs(attempt.startedAt).format('DD/MM/YY HH:mm')}
      </td>
      <td className="px-3 py-2">
        {attempt.scorePercentage != null ? (
          <span className="font-medium">{Number(attempt.scorePercentage).toFixed(1)}%</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <Chip
          label={attempt.finishedAt ? 'Finalizada' : 'Em andamento'}
          size="small"
          color={attempt.finishedAt ? 'success' : 'warning'}
          sx={{ height: 22, fontSize: 11 }}
        />
      </td>
    </tr>
  )
}

function InfoItem({
  label,
  value,
  sensitive,
}: {
  label: string
  value: string
  sensitive?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className="text-sm text-slate-700"
        {...(sensitive ? { 'data-sensitive': '' } : {})}
      >
        {value}
      </span>
    </div>
  )
}
