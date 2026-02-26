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
  /** Texto de referência da prova (ex.: texto base usado por várias questões). Opcional. */
  referenceText?: string;
  alternatives: ParsedQuestionAlternative[];
}

/** Example used in the AI prompt so the model returns this shape. */
export const PARSED_QUESTION_EXAMPLE: ParsedQuestionItem[] = [
  {
    subject: 'Matemática',
    statement: 'Quanto é 2+2?',
    topic: 'Aritmética',
    alternatives: [
      { key: 'A', text: '3' },
      { key: 'B', text: '4' },
    ],
  },
  {
    subject: 'Língua Portuguesa',
    statement: 'De acordo com o texto, a principal crítica do autor é:',
    topic: 'Interpretação',
    referenceText: 'O Brasil enfrenta desafios históricos na área de educação. A qualidade do ensino varia muito entre regiões.',
    alternatives: [
      { key: 'A', text: 'a desigualdade regional.' },
      { key: 'B', text: 'a falta de investimento.' },
    ],
  },
  {
    subject: 'História',
    statement: 'Em qual ano ocorreu a Independência do Brasil?',
    topic: 'Brasil Colônia',
    alternatives: [
      { key: 'A', text: '1822' },
      { key: 'B', text: '1821' },
      { key: 'C', text: '1823' },
    ],
  },
];
