import type {
  ConcursoProvasResponse,
  CreateExamBaseInput,
  ExamBase,
  ExamSyllabusGroup,
  ExtractedExamMetadata,
  UpdateExamBaseInput,
} from '../domain/examBase.types'
import { apiFetch } from '@/lib/api'

class ExamBaseService {
  private urlPath = '/exam-bases'

  async list(input?: { examBoardId?: string }) {
    const params = new URLSearchParams()
    if (input?.examBoardId) {
      params.set('examBoardId', input.examBoardId)
    }
    return await apiFetch<Array<ExamBase>>(`${this.urlPath}?${params.toString()}`, { method: 'GET' })
  }

  async getOne(id: string) {
    return await apiFetch<ExamBase>(`${this.urlPath}/${id}`, { method: 'GET' })
  }

  async getConcursoProvas(id: string) {
    return await apiFetch<ConcursoProvasResponse>(
      `${this.urlPath}/${id}/concurso`,
      { method: 'GET' },
    )
  }

  async create(input: CreateExamBaseInput) {
    return await apiFetch<ExamBase>(this.urlPath, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async update(id: string, input: UpdateExamBaseInput) {
    return await apiFetch<ExamBase>(`${this.urlPath}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }

  async setPublished(id: string, published: boolean) {
    return await apiFetch<Pick<ExamBase, 'id' | 'name' | 'published'>>(
      `${this.urlPath}/${id}/publish`,
      {
        method: 'PATCH',
        body: JSON.stringify({ published }),
      },
    )
  }

  async generateSlug(id: string) {
    return await apiFetch<{ slug: string }>(
      `${this.urlPath}/${id}/generate-slug`,
      { method: 'POST' },
    )
  }

  async createDraft(): Promise<{ id: string }> {
    return await apiFetch<{ id: string }>(`${this.urlPath}/draft`, { method: 'POST' })
  }

  async remove(id: string) {
    return await apiFetch<{ ok: true }>(`${this.urlPath}/${id}`, { method: 'DELETE' })
  }

  // ── Conteúdo programático (syllabus groups) ───────────────────────────────

  async createSyllabusGroup(
    examBaseId: string,
    input: { name: string; topics: string; order?: number },
  ) {
    return await apiFetch<ExamSyllabusGroup>(
      `${this.urlPath}/${examBaseId}/syllabus-groups`,
      { method: 'POST', body: JSON.stringify(input) },
    )
  }

  async updateSyllabusGroup(
    examBaseId: string,
    groupId: string,
    input: { name?: string; topics?: string; order?: number },
  ) {
    return await apiFetch<ExamSyllabusGroup>(
      `${this.urlPath}/${examBaseId}/syllabus-groups/${groupId}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    )
  }

  /** Reordena todos os grupos: `ids` deve conter todos os grupos da prova, na nova ordem. */
  async reorderSyllabusGroups(examBaseId: string, ids: string[]) {
    return await apiFetch<ExamSyllabusGroup[]>(
      `${this.urlPath}/${examBaseId}/syllabus-groups/order`,
      { method: 'PATCH', body: JSON.stringify({ ids }) },
    )
  }

  async deleteSyllabusGroup(examBaseId: string, groupId: string) {
    return await apiFetch<{ ok: true }>(
      `${this.urlPath}/${examBaseId}/syllabus-groups/${groupId}`,
      { method: 'DELETE' },
    )
  }

  async extractMetadata(input: { url?: string; role?: string; pdfFile?: File }): Promise<ExtractedExamMetadata> {
    const formData = new FormData()
    if (input.url) formData.append('url', input.url)
    if (input.role) formData.append('role', input.role)
    if (input.pdfFile) formData.append('pdfFile', input.pdfFile)
    return await apiFetch<ExtractedExamMetadata>(`${this.urlPath}/extract-metadata`, {
      method: 'POST',
      body: formData,
    })
  }
}

export const examBaseService = new ExamBaseService()

