import { useMemo, useState } from "react"
import type { ExamBoard } from "../domain/examBoard.types"
import { useExamBoardStore } from "../stores/examBoard.store"
import { useExamBoardQueries } from "../queries/examBoard.queries"

export function useExamBoardFacade() {
    // UI State
    const { data: examBoards, isLoading: isLoadingExamBoards } = useExamBoardQueries()

    // Server State

    return useMemo(() => {
        return {
            examBoards,
            isLoadingExamBoards,
        }
    }, [examBoards, isLoadingExamBoards])
}