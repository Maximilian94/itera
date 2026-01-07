export type Uuid = string;

export interface Skill {
  id: Uuid;
  name: string;
}

export interface QuestionOption {
  id: Uuid;
  text: string;
}

export interface Question {
  id: Uuid;
  statement: string;
  skillId: Uuid;
  options: QuestionOption[];
}

export interface Attempt {
  id: Uuid;
  examId: Uuid | null;
  questionId: Uuid;
  selectedOptionId: Uuid;
  isCorrect: boolean;
  createdAt: string;
}

export interface AttemptFeedback {
  isCorrect: boolean;
  correctOptionId: Uuid;
  explanationText: string;
}


