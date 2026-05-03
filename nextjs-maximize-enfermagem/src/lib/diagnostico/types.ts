/**
 * Re-export dos tipos compartilhados em `domain/diagnostico/`. Front e back
 * concordam no shape do `resultado` e do payload via este módulo.
 */
export type {
  Alternativa,
  AttributionData,
  DiagnosticoResultado,
  DiagnosticoSubmissionPayload,
  EstudandoConcurso,
  IntencaoConcurso,
  JaEnfermeiro,
  ProfileSlug,
  QualificacaoPayload,
  ScoreSecundario,
  SecondaryScoreCategoria,
  TrabalhaSaude,
} from "@domain/diagnostico/diagnostico.interface";
