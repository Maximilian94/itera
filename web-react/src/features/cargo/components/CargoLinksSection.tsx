import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import StarIcon from '@mui/icons-material/Star'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  useCargosQuery,
  useCreateCargoMutation,
  useLinkProvaMutation,
  useSetOficialMutation,
  useUnlinkProvaMutation,
  useUpdateProvaLinkMutation,
} from '../queries/cargo.queries'
import { CargoFichaDialog } from './CargoFichaDialog'
import type { AdminCargo } from '../domain/cargo.types'

const NEW_CARGO = '__new__'

/**
 * Gestão de vínculos cargo↔prova no form da prova (R4.3) — substitui a seção
 * legada de `cargoGroupId`. Mostra a quais cargos ESTA prova pertence (com a
 * eleição da prova oficial e o rótulo do vínculo) e permite compartilhá-la
 * com outro cargo do MESMO concurso — inclusive um cargo novo, criado na hora
 * (o caso Recife: "Enfermeiro Pediatra" sem prova própria).
 */
export function CargoLinksSection(props: {
  examBaseId: string
  concursoId: string | null
}) {
  const { examBaseId, concursoId } = props
  const cargosQuery = useCargosQuery(concursoId)
  const linkProva = useLinkProvaMutation()
  const unlinkProva = useUnlinkProvaMutation()
  const setOficial = useSetOficialMutation()
  const updateLink = useUpdateProvaLinkMutation()
  const createCargo = useCreateCargoMutation()

  const [shareTarget, setShareTarget] = useState('')
  const [shareLabel, setShareLabel] = useState('')
  const [newRole, setNewRole] = useState('')
  const [fichaCargo, setFichaCargo] = useState<AdminCargo | null>(null)

  const legendStyle = { fontSize: 12, color: '#64748b', padding: '0 4px' }
  const fieldsetStyle = {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: 12,
  }

  if (concursoId == null) {
    return (
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Cargos desta prova</legend>
        <Typography variant="body2" color="text.secondary">
          Salve a prova com <strong>instituição</strong> preenchida: o concurso
          é criado junto e esta prova ganha o cargo padrão automaticamente.
        </Typography>
      </fieldset>
    )
  }

  const cargos = cargosQuery.data ?? []
  const linked = cargos.filter((c) =>
    c.provas.some((p) => p.examBaseId === examBaseId),
  )
  const others = cargos.filter(
    (c) => !c.provas.some((p) => p.examBaseId === examBaseId),
  )

  const actionError =
    (linkProva.error ??
      unlinkProva.error ??
      setOficial.error ??
      createCargo.error)

  const handleShare = async () => {
    if (shareTarget === NEW_CARGO) {
      if (!newRole.trim()) return
      const novo = await createCargo.mutateAsync({
        concursoId,
        role: newRole.trim(),
      })
      await linkProva.mutateAsync({
        cargoId: novo.id,
        examBaseId,
        provaLabel: shareLabel.trim() || null,
      })
    } else {
      await linkProva.mutateAsync({
        cargoId: shareTarget,
        examBaseId,
        provaLabel: shareLabel.trim() || null,
      })
    }
    setShareTarget('')
    setShareLabel('')
    setNewRole('')
  }

  return (
    <fieldset style={fieldsetStyle}>
      <legend style={legendStyle}>Cargos desta prova</legend>

      {cargosQuery.isPending ? (
        <div className="flex items-center gap-2 py-1">
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Carregando cargos do concurso…
          </Typography>
        </div>
      ) : cargosQuery.isError ? (
        <Alert severity="error" sx={{ py: 0.5 }}>
          Não foi possível carregar os cargos.{' '}
          <Button size="small" onClick={() => cargosQuery.refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      ) : (
        <>
          {linked.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Esta prova ainda não pertence a nenhum cargo — salve a prova para
              criar o cargo padrão, ou vincule-a a um cargo existente abaixo.
            </Typography>
          )}

          {linked.map((cargo) => {
            const link = cargo.provas.find((p) => p.examBaseId === examBaseId)!
            const provaCount = cargo.provas.length
            return (
              <div
                key={cargo.id}
                className="flex flex-wrap items-center gap-2 border-b border-slate-100 py-2 last:border-b-0"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {cargo.role}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {provaCount} {provaCount === 1 ? 'prova' : 'provas'}
                    {cargo.salaryBase != null && ` · R$ ${cargo.salaryBase}`}
                  </Typography>
                </div>

                {link.isOficial ? (
                  <Chip
                    icon={<StarIcon />}
                    label="Prova oficial"
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ) : (
                  <Tooltip title="Tornar esta a prova oficial do cargo (define meta e corte)">
                    <Button
                      size="small"
                      startIcon={<StarOutlineIcon />}
                      disabled={setOficial.isPending}
                      onClick={() =>
                        setOficial.mutate({ cargoId: cargo.id, examBaseId })
                      }
                    >
                      Tornar oficial
                    </Button>
                  </Tooltip>
                )}

                <TextField
                  label="Rótulo"
                  size="small"
                  sx={{ width: 130 }}
                  defaultValue={link.provaLabel ?? ''}
                  placeholder='"Tipo 1"'
                  onBlur={(e) => {
                    const value = e.target.value.trim() || null
                    if (value !== link.provaLabel) {
                      updateLink.mutate({
                        cargoId: cargo.id,
                        examBaseId,
                        provaLabel: value,
                      })
                    }
                  }}
                />

                <Tooltip title="Editar a ficha do cargo (salário, vagas, requisitos, cortes)">
                  <IconButton size="small" onClick={() => setFichaCargo(cargo)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>

                <Tooltip
                  title={
                    link.isOficial
                      ? 'A prova oficial não pode ser desvinculada — eleja outra antes'
                      : 'Desvincular esta prova do cargo'
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      disabled={link.isOficial || unlinkProva.isPending}
                      onClick={() =>
                        unlinkProva.mutate({ cargoId: cargo.id, examBaseId })
                      }
                    >
                      <LinkOffIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            )
          })}

          <Divider sx={{ my: 1.5 }} />

          {/* Compartilhar: o caso Recife em 2 cliques. */}
          <div className="flex flex-wrap items-start gap-2">
            <TextField
              select
              label="Compartilhar com outro cargo"
              size="small"
              sx={{ minWidth: 230 }}
              value={shareTarget}
              onChange={(e) => setShareTarget(e.target.value)}
            >
              {others.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.role}
                  {c.provas.length === 0 && ' (sem prova)'}
                </MenuItem>
              ))}
              <MenuItem value={NEW_CARGO}>
                <AddIcon fontSize="small" sx={{ mr: 0.5 }} /> Novo cargo…
              </MenuItem>
            </TextField>
            {shareTarget === NEW_CARGO && (
              <TextField
                label="Nome do novo cargo *"
                size="small"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="Enfermeiro Pediatra"
              />
            )}
            {shareTarget !== '' && (
              <TextField
                label="Rótulo (opcional)"
                size="small"
                sx={{ width: 140 }}
                value={shareLabel}
                onChange={(e) => setShareLabel(e.target.value)}
                placeholder='"Prova comum"'
              />
            )}
            <Button
              variant="outlined"
              size="small"
              sx={{ mt: 0.25 }}
              disabled={
                shareTarget === '' ||
                (shareTarget === NEW_CARGO && !newRole.trim()) ||
                linkProva.isPending ||
                createCargo.isPending
              }
              onClick={handleShare}
            >
              {linkProva.isPending || createCargo.isPending
                ? 'Vinculando…'
                : 'Vincular'}
            </Button>
          </div>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mt: 1 }}
          >
            A mesma prova pode servir a vários cargos do MESMO concurso; cada
            cargo mantém sua ficha. O conteúdo programático editado nesta prova
            pertence ao cargo onde ela é a <strong>oficial</strong>.
          </Typography>

          {actionError != null && (
            <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
              {actionError.message ?? 'Erro ao atualizar os vínculos'}
            </Alert>
          )}
        </>
      )}

      <CargoFichaDialog cargo={fichaCargo} onClose={() => setFichaCargo(null)} />
    </fieldset>
  )
}
