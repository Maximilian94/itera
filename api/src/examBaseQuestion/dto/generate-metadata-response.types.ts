/**
 * Response from the AI when generating question metadata (topic, subtopics, skills).
 * This is separate from explanation generation.
 */
export interface GenerateMetadataResponse {
  topic: string;
  subtopics: string[];
  skills: string[];
}

export const GENERATE_METADATA_RESPONSE_EXAMPLE: GenerateMetadataResponse = {
  topic: 'Prosódia',
  subtopics: ['Acentuação tónica', 'Paroxítonas e proparoxítonas'],
  skills: ['Identificar sílabas tônicas', 'Classificar palavras quanto à tonicidade'],
};
