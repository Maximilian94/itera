import { useQuery } from "@tanstack/react-query";
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