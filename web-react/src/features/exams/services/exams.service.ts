import { apiFetch } from '@/lib/api'
import type { ListExamsResponse } from '../domain/exams.types'

class ExamsService {
  private urlPath = '/exams'

  async list(input?: { examBoardId?: string }) {
    const qs =
      input?.examBoardId != null && input.examBoardId !== ''
        ? `?examBoardId=${encodeURIComponent(input.examBoardId)}`
        : ''
    return await apiFetch<ListExamsResponse>(`${this.urlPath}${qs}`, {
      method: 'GET',
    })
  }
}

export const examsService = new ExamsService()

