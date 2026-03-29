import type {
  CreateExamBaseInput,
  ExamBase,
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

