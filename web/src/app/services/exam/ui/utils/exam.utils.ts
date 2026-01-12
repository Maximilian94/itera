import { ExamInExecution } from "../adapters/exam.adapter";

export const getExamContentStatus =({examStatus, isOptionCorrect}: {examStatus: ExamInExecution["exam"]["status"], isOptionCorrect: boolean | undefined}): 'correct' | 'incorrect' | 'in_progress' => {
    if(examStatus === "in_progress") return 'in_progress';
    return isOptionCorrect ? 'correct' : 'incorrect';
}
