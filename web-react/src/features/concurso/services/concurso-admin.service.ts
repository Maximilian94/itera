import { apiFetch } from '@/lib/api'

/** Matéria do conteúdo programático / quadro de provas (espelha ConcursoSyllabusGroupDto). */
export interface ConcursoSyllabusGroupInput {
  name: string
  topics?: string | null
  questionCount?: number | null
  weight?: string | null
  maxScore?: string | null
}

/** Ficha do cargo enviada na criação do concurso (espelha CreateConcursoCargoDto). */
export interface CreateConcursoCargoInput {
  role: string
  description?: string | null
  requirements?: string | null
  salaryBase?: string | null
  workload?: string | null
  vacancyCount?: number | null
  hasReserveList?: boolean
  applicantCount?: number | null
  registrationFee?: string | null
  minPassingGradeNonQuota?: string | null
  isNursingRelevant?: boolean
  syllabusGroups?: Array<ConcursoSyllabusGroupInput>
}

/** Documento do concurso enviado na criação (espelha ConcursoDocumentDto). */
export interface CreateConcursoDocumentInput {
  title: string
  summary?: string | null
  url: string
  kind?: string | null
  publishedAt?: string | null
  sourceUrl?: string | null
}

/** Payload de POST /concursos (criação admin a partir do edital). */
export interface CreateConcursoInput {
  institution: string
  year: number
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  examBoardId?: string | null
  editalUrl?: string | null
  registrationStart?: string | null
  registrationEnd?: string | null
  examDate?: string | null
  resultDate?: string | null
  etapas?: Array<{ name: string; description?: string | null; date?: string | null }>
  documents?: Array<CreateConcursoDocumentInput>
  cargos: Array<CreateConcursoCargoInput>
}

export interface CreateConcursoResult {
  concurso: { id: string; slug: string | null; institution: string; year: number }
  cargos: Array<{ id: string; role: string; created: boolean }>
  createdCount: number
  updatedCount: number
  documentCount: number
}

/** Cargo carregado para edição (ficha completa + provaCount). */
export interface ConcursoEditCargo {
  id: string
  role: string
  description: string | null
  requirements: string | null
  salaryBase: string | null
  workload: string | null
  vacancyCount: number | null
  hasReserveList: boolean
  registrationFee: string | null
  minPassingGradeNonQuota: string | null
  isNursingRelevant: boolean
  syllabusGroups: Array<ConcursoSyllabusGroupInput>
  /** > 0 → tem prova vinculada, não pode ser removido aqui. */
  provaCount: number
}

export interface ConcursoEditData {
  concurso: {
    id: string
    institution: string
    year: number
    governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
    state: string | null
    city: string | null
    examBoardId: string | null
    editalUrl: string | null
    documentsSourceUrl: string | null
    registrationStart: string | null
    registrationEnd: string | null
    examDate: string | null
    resultDate: string | null
    etapas: Array<{ name: string; description: string | null; date: string | null }>
  }
  cargos: Array<ConcursoEditCargo>
}

/** Cargo enviado no update: `id` presente = atualizar; ausente = criar. */
export interface UpdateConcursoCargoInput extends CreateConcursoCargoInput {
  id?: string
}

export interface UpdateConcursoInput {
  institution: string
  year: number
  governmentScope: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  state?: string | null
  city?: string | null
  examBoardId?: string | null
  editalUrl?: string | null
  documentsSourceUrl?: string | null
  registrationStart?: string | null
  registrationEnd?: string | null
  examDate?: string | null
  resultDate?: string | null
  etapas?: Array<{ name: string; description?: string | null; date?: string | null }>
  cargos: Array<UpdateConcursoCargoInput>
}

export interface UpdateConcursoResult {
  concurso: { id: string }
  cargos: Array<{ id: string; role: string; created: boolean }>
  createdCount: number
  updatedCount: number
  removedCount: number
}

export const concursoAdminService = {
  createFromEdital(input: CreateConcursoInput): Promise<CreateConcursoResult> {
    return apiFetch<CreateConcursoResult>('/concursos', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  getForEdit(id: string): Promise<ConcursoEditData> {
    return apiFetch<ConcursoEditData>(`/concursos/${id}/edit`, { method: 'GET' })
  },

  update(id: string, input: UpdateConcursoInput): Promise<UpdateConcursoResult> {
    return apiFetch<UpdateConcursoResult>(`/concursos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
}
