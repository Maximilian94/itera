export interface ParsedQuestionFromPdfAlternative {
  key: string;
  text: string;
  explanation: string;
}

export interface ParsedQuestionFromPdf {
  number: number;
  subject: string;
  topic: string;
  subtopics: string[];
  statement: string;
  referenceText: string | null;
  /** true quando o enunciado referencia imagem/figura/gráfico não textual */
  hasImage: boolean;
  alternatives: ParsedQuestionFromPdfAlternative[];
  correctAlternative: string | null;
  /** true quando Claude discorda da resposta do gabarito */
  answerDoubt: boolean;
  doubtReason: string | null;
}

export const PARSED_QUESTION_FROM_PDF_EXAMPLE: ParsedQuestionFromPdf = {
  number: 1,
  subject: 'Saúde do Adulto',
  topic: 'Hipertensão Arterial',
  subtopics: ['Tratamento não farmacológico'],
  statement: 'Sobre o tratamento da hipertensão arterial, assinale a alternativa **correta**:',
  referenceText: null,
  hasImage: false,
  alternatives: [
    { key: 'A', text: 'Reduzir o consumo de sódio para menos de 2g/dia.', explanation: 'Correta. A restrição de sódio é uma medida não farmacológica reconhecida para controle da pressão arterial.' },
    { key: 'B', text: 'Aumentar o consumo de gorduras saturadas.', explanation: 'Incorreta. Gorduras saturadas contribuem para dislipidemia e piora do quadro cardiovascular.' },
  ],
  correctAlternative: 'A',
  answerDoubt: false,
  doubtReason: null,
};
