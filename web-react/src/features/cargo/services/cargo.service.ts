import { apiFetch } from '@/lib/api'
import type {
  AdminCargo,
  CreateCargoInput,
  UpdateCargoInput,
} from '../domain/cargo.types'

/** Cliente ADMIN de `/cargos` (gestão de vínculos cargo↔prova, R4.3). */
class CargoService {
  private urlPath = '/cargos'

  list(concursoId?: string) {
    const params = new URLSearchParams()
    if (concursoId) params.set('concursoId', concursoId)
    return apiFetch<Array<AdminCargo>>(
      `${this.urlPath}?${params.toString()}`,
      { method: 'GET' },
    )
  }

  create(input: CreateCargoInput) {
    return apiFetch<AdminCargo>(this.urlPath, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  update(cargoId: string, input: UpdateCargoInput) {
    return apiFetch<AdminCargo>(`${this.urlPath}/${cargoId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  remove(cargoId: string) {
    return apiFetch<{ ok: true }>(`${this.urlPath}/${cargoId}`, {
      method: 'DELETE',
    })
  }

  linkProva(
    cargoId: string,
    examBaseId: string,
    input: { provaLabel?: string | null; isOficial?: boolean } = {},
  ) {
    return apiFetch<AdminCargo>(
      `${this.urlPath}/${cargoId}/provas/${examBaseId}`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  updateProvaLink(
    cargoId: string,
    examBaseId: string,
    input: { provaLabel?: string | null; order?: number },
  ) {
    return apiFetch<AdminCargo>(
      `${this.urlPath}/${cargoId}/provas/${examBaseId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    )
  }

  unlinkProva(cargoId: string, examBaseId: string) {
    return apiFetch<AdminCargo>(
      `${this.urlPath}/${cargoId}/provas/${examBaseId}`,
      { method: 'DELETE' },
    )
  }

  setOficial(cargoId: string, examBaseId: string) {
    return apiFetch<AdminCargo>(
      `${this.urlPath}/${cargoId}/provas/${examBaseId}/oficial`,
      { method: 'POST' },
    )
  }
}

export const cargoService = new CargoService()
