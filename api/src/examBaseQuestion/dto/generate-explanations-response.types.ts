/**
 * Explanation for one alternative, returned by the AI.
 */
export interface AlternativeExplanationItem {
  key: string;
  explanation: string;
}

/**
 * Typed response from the AI when generating explanations.
 * This shape is sent in the prompt so the model returns valid JSON in this format.
 */
export interface GenerateExplanationsResponse {
  topic: string;
  subtopics: string[];
  explanations: AlternativeExplanationItem[];
  /** Indica se a IA concorda com a alternativa marcada como correta na questão. */
  agreesWithCorrectAnswer: boolean;
  /** Preenchido quando agreesWithCorrectAnswer é false, com breve justificativa da discordância. */
  disagreementWarning?: string;
}

export const GENERATE_EXPLANATIONS_RESPONSE_EXAMPLE: GenerateExplanationsResponse =
  {
    topic: 'Prosódia',
    subtopics: ['Acentuação tónica', 'Paroxítonas e proparoxítonas', 'Estrangeirismos'],
    explanations: [
      {
        key: 'A',
        explanation:
          'Esta alternativa está incorreta porque... (explicação completa e de alto nível).',
      },
      {
        key: 'B',
        explanation:
          'A alternativa correta. Explicação completa e de alto nível: ...',
      },
    ],
    agreesWithCorrectAnswer: true,
  };
