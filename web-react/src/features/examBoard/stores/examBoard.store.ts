import { create } from 'zustand'
import type { ExamBoard } from '../domain/examBoard.types'

type ExamBoardStore = {
    examBoards: ExamBoard[]
    setExamBoards: (examBoards: ExamBoard[]) => void
}

export const useExamBoardStore = create<ExamBoardStore>((set) => ({
    examBoards: [],
    setExamBoards: (examBoards) => set({ examBoards }),
}))