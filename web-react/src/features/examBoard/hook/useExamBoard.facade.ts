import { useMemo, useState } from "react"
import { useExamBoardStore } from "../stores/examBoard.store"
import { useExamBoardQueries } from "../queries/examBoard.queries"
import type { ExamBoard } from "../domain/examBoard.types"

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