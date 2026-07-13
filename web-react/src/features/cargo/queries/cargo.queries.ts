import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cargoService } from '../services/cargo.service'
import type {
  CreateCargoInput,
  UpdateCargoInput,
} from '../domain/cargo.types'
import { concursoKeys } from '@/features/concurso/queries/concurso.queries'

export const cargoKeys = {
  all: ['cargo'] as const,
  list: (concursoId: string) => ['cargo', 'list', concursoId] as const,
}

/** Cargos de um concurso (admin). Desabilitada sem concursoId (prova órfã). */
export function useCargosQuery(concursoId: string | null) {
  return useQuery({
    queryKey: cargoKeys.list(concursoId ?? ''),
    queryFn: () => cargoService.list(concursoId!),
    enabled: concursoId != null,
  })
}

/** Invalidações comuns: a lista admin e as páginas públicas (leem o Cargo). */
function useInvalidateCargos() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: cargoKeys.all })
    queryClient.invalidateQueries({ queryKey: concursoKeys.all })
  }
}

export function useCreateCargoMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: (input: CreateCargoInput) => cargoService.create(input),
    onSuccess: invalidate,
  })
}

export function useUpdateCargoMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: ({ cargoId, input }: { cargoId: string; input: UpdateCargoInput }) =>
      cargoService.update(cargoId, input),
    onSuccess: invalidate,
  })
}

export function useLinkProvaMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: ({
      cargoId,
      examBaseId,
      provaLabel,
    }: {
      cargoId: string
      examBaseId: string
      provaLabel?: string | null
    }) => cargoService.linkProva(cargoId, examBaseId, { provaLabel }),
    onSuccess: invalidate,
  })
}

export function useUpdateProvaLinkMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: ({
      cargoId,
      examBaseId,
      provaLabel,
    }: {
      cargoId: string
      examBaseId: string
      provaLabel: string | null
    }) => cargoService.updateProvaLink(cargoId, examBaseId, { provaLabel }),
    onSuccess: invalidate,
  })
}

export function useUnlinkProvaMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: ({ cargoId, examBaseId }: { cargoId: string; examBaseId: string }) =>
      cargoService.unlinkProva(cargoId, examBaseId),
    onSuccess: invalidate,
  })
}

export function useSetOficialMutation() {
  const invalidate = useInvalidateCargos()
  return useMutation({
    mutationFn: ({ cargoId, examBaseId }: { cargoId: string; examBaseId: string }) =>
      cargoService.setOficial(cargoId, examBaseId),
    onSuccess: invalidate,
  })
}
