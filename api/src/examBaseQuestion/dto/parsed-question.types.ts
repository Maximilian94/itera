/**
 * Alternative extracted from markdown by AI.
 * Used in parse-from-markdown response.
 */
export interface ParsedQuestionAlternative {
  key: string;
  text: string;
}

/**
 * Question extracted from markdown by AI.
 * Used in parse-from-markdown response.
 */
export interface ParsedQuestionItem {
  subject: string;
  statement: string;
  topic?: string;
  alternatives: ParsedQuestionAlternative[];
}

/** Example used in the AI prompt so the model returns this shape. */
export const PARSED_QUESTION_EXAMPLE: ParsedQuestionItem[] = [
  {
    subject: 'Math',
    statement: 'What is 2+2?',
    topic: 'Arithmetic',
    alternatives: [
      { key: 'A', text: '3' },
      { key: 'B', text: '4' },
    ],
  },
];
