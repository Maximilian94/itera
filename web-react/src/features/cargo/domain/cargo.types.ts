/**
 * Tipos ADMIN da remodelagem Cargo↔Prova (R4.3). Espelham o payload de
 * GET/POST/PATCH `/cargos` (CARGO_SELECT do cargo.service da API).
 */

export type AdminCargoProvaLink = {
  examBaseId: string
  /** Rótulo desta prova DENTRO do cargo (ex.: "Tipo 1", "Amarela"). */
  provaLabel: string | null
  /** A prova que define meta/corte do cargo (ex-isPrimaryProva). */
  isOficial: boolean
  order: number
  examBase: {
    id: string
    name: string
    slug: string | null
    examDate: string
    published: boolean
    examBoard: { id: string; alias: string | null; name: string } | null
    _count: { questions: number }
  }
}

export type AdminCargo = {
  id: string
  slug: string | null
  role: string
  description: string | null
  requirements: string | null
  salaryBase: string | null
  workload: string | null
  vacancyCount: number | null
  hasReserveList: boolean
  applicantCount: number | null
  registrationFee: string | null
  minPassingGradeNonQuota: string | null
  actualCutScore: string | null
  isNursingRelevant: boolean
  concursoId: string
  provas: Array<AdminCargoProvaLink>
}

/** Ficha editável (PATCH /cargos/:id). */
export type UpdateCargoInput = Partial<{
  role: string
  slug: string | null
  description: string | null
  requirements: string | null
  salaryBase: string | null
  workload: string | null
  vacancyCount: number | null
  hasReserveList: boolean
  applicantCount: number | null
  registrationFee: string | null
  minPassingGradeNonQuota: string | null
  actualCutScore: string | null
  isNursingRelevant: boolean
}>

export type CreateCargoInput = UpdateCargoInput & {
  concursoId: string
  role: string
}
