import { apiFetch } from '@/lib/api'
import type {
  CreateExamBaseInput,
  ExamBase,
  UpdateExamBaseInput,
} from '../domain/examBase.types'

class ExamBaseService {
  private urlPath = '/exam-bases'

  async list() {
    return await apiFetch<ExamBase[]>(this.urlPath, { method: 'GET' })
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
}

export const examBaseService = new ExamBaseService()

