import { apiFetch } from "@/lib/api"
import type { ExamBoard } from "../domain/examBoard.types";

class ExamBoardService {
    private urlPath = '/exam-boards';

    async list() {
        return await apiFetch<ExamBoard[]>(`${this.urlPath}`, { method: 'GET' })
    }
}

export const examBoardService = new ExamBoardService()