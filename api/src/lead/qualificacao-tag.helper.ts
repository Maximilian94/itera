import type { QualificacaoPayload } from '@domain/diagnostico/diagnostico.interface';

/**
 * Deriva tags de segmentação comercial a partir do payload de qualificação.
 * Regras em §7 do doc.
 */
export function computeTagsFromQualificacao(
  qualificacao: QualificacaoPayload,
): string[] {
  const tags: string[] = [];

  switch (qualificacao.jaEnfermeiro) {
    case 'formado':
      tags.push('enfermeiro_formado');
      break;
    case 'em_formacao':
      tags.push('enfermeiro_em_formacao');
      break;
    case 'nao':
      tags.push('nao_enfermeiro');
      break;
  }

  if (qualificacao.trabalhaSaude !== 'nao') {
    tags.push('trabalha_saude');
  }

  if (qualificacao.estudandoConcurso === 'ativamente') {
    tags.push('estudando_concurso');
  }

  switch (qualificacao.intencaoConcurso) {
    case '3m':
      tags.push('intencao_concurso_3m');
      break;
    case '6m':
      tags.push('intencao_concurso_6m');
      break;
    case '12m':
      tags.push('intencao_concurso_12m');
      break;
  }

  return tags;
}
