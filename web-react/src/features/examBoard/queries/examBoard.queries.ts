import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { examBoardService } from "../services/examBoard.service";

export const examBoardKeys = {
    examBoards: ["examBoards"] as const,
  };

export function useExamBoardQueries() {
    return useQuery({
        queryKey: examBoardKeys.examBoards,
        queryFn: () => examBoardService.list(),
    })
}

export function useCreateExamBoardMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: Parameters<typeof examBoardService.create>[0]) =>
            examBoardService.create(input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: examBoardKeys.examBoards })
        },
    })
}