import { apiFetch } from "@/lib/api"
import type { ExamBoard } from "../domain/examBoard.types";

class ExamBoardService {
    private urlPath = '/exam-boards';

    async list() {
        return await apiFetch<ExamBoard[]>(`${this.urlPath}`, { method: 'GET' })
    }

    async create(input: { name: string; alias?: string; websiteUrl?: string; logoUrl?: string }): Promise<ExamBoard> {
        return await apiFetch<ExamBoard>(this.urlPath, {
            method: 'POST',
            body: JSON.stringify(input),
        })
    }
}

export const examBoardService = new ExamBoardService()