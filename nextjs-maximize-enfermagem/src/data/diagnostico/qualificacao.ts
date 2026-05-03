import type {
  EstudandoConcurso,
  IntencaoConcurso,
  JaEnfermeiro,
  TrabalhaSaude,
} from "@/lib/diagnostico/types";

/**
 * Perguntas de qualificação comercial (§5.7 do doc), exibidas após a captura
 * do lead. Não alteram o score; servem para segmentar tags via backend.
 */

export type QualificacaoFieldKey =
  | "jaEnfermeiro"
  | "trabalhaSaude"
  | "estudandoConcurso"
  | "intencaoConcurso";

export type QualificacaoValue =
  | JaEnfermeiro
  | TrabalhaSaude
  | EstudandoConcurso
  | IntencaoConcurso;

export interface PerguntaQualificacaoOpcao<TValue extends QualificacaoValue> {
  value: TValue;
  texto: string;
}

export interface PerguntaQualificacao<TValue extends QualificacaoValue = QualificacaoValue> {
  field: QualificacaoFieldKey;
  ordem: number;
  enunciado: string;
  opcoes: PerguntaQualificacaoOpcao<TValue>[];
}

export const PERGUNTAS_QUALIFICACAO: PerguntaQualificacao[] = [
  {
    field: "jaEnfermeiro",
    ordem: 1,
    enunciado: "Você já é enfermeiro(a)?",
    opcoes: [
      { value: "formado", texto: "Sim, já formado(a)" },
      { value: "em_formacao", texto: "Estou em formação" },
      { value: "nao", texto: "Não" },
    ],
  } as PerguntaQualificacao<JaEnfermeiro>,
  {
    field: "trabalhaSaude",
    ordem: 2,
    enunciado: "Você já trabalha na área da saúde?",
    opcoes: [
      { value: "enfermeiro", texto: "Sim, como enfermeiro(a)" },
      { value: "outra_funcao", texto: "Sim, em outra função" },
      { value: "nao", texto: "Não" },
    ],
  } as PerguntaQualificacao<TrabalhaSaude>,
  {
    field: "estudandoConcurso",
    ordem: 3,
    enunciado: "Você está estudando para concurso público atualmente?",
    opcoes: [
      { value: "ativamente", texto: "Sim, ativamente" },
      { value: "pouco", texto: "Sim, mas pouco" },
      { value: "nao", texto: "Não" },
    ],
  } as PerguntaQualificacao<EstudandoConcurso>,
  {
    field: "intencaoConcurso",
    ordem: 4,
    enunciado: "Você pretende prestar concurso nos próximos meses?",
    opcoes: [
      { value: "3m", texto: "Nos próximos 3 meses" },
      { value: "6m", texto: "Nos próximos 6 meses" },
      { value: "12m", texto: "Nos próximos 12 meses" },
      { value: "nao_decidiu", texto: "Ainda não decidi" },
    ],
  } as PerguntaQualificacao<IntencaoConcurso>,
];
