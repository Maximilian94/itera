export type Alternativa = 'A' | 'B' | 'C' | 'D';

export type ProfileSlug =
  | 'sobrecarregado'
  | 'esforcado_sem_direcao'
  | 'em_evolucao'
  | 'estrategico';

export type SecondaryScoreCategoria =
  | 'clarezaDirecao'
  | 'consistencia'
  | 'qualidadeMetodo'
  | 'retencao';

export interface ScoreSecundario {
  categoria: SecondaryScoreCategoria;
  score: number;
  maxScore: number;
  percentage: number;
}

export interface DiagnosticoResultado {
  totalScore: number;
  perfil: {
    slug: ProfileSlug;
    nome: string;
    mensagemPrincipal: string;
  };
  scores: ScoreSecundario[];
  pontoForte: ScoreSecundario;
  pontoAtencao: ScoreSecundario;
  proximoPasso: string;
}

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  gclid?: string;
  landingPage?: string;
  referrer?: string;
  fbp?: string;
  fbc?: string;
}

export interface DiagnosticoSubmissionPayload {
  email: string;
  name?: string;
  phone?: string;
  fonteLp: string;
  respostas: Record<string, Alternativa>;
  resultado: DiagnosticoResultado;
  attribution?: AttributionData;
  eventId: string;
  consentMarketing: boolean;
}

export type JaEnfermeiro = 'formado' | 'em_formacao' | 'nao';
export type TrabalhaSaude = 'enfermeiro' | 'outra_funcao' | 'nao';
export type EstudandoConcurso = 'ativamente' | 'pouco' | 'nao';
export type IntencaoConcurso = '3m' | '6m' | '12m' | 'nao_decidiu';

export interface QualificacaoPayload {
  jaEnfermeiro: JaEnfermeiro;
  trabalhaSaude: TrabalhaSaude;
  estudandoConcurso: EstudandoConcurso;
  intencaoConcurso: IntencaoConcurso;
}
