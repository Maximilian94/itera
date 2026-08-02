import { ConcursoDocumentAnalysisService } from './concurso-document-analysis.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { ExamBaseAiService } from '../examBase/exam-base-ai.service';
import type { PdfOcrService } from '../pdf/pdf-ocr.service';

/** Cargo mínimo do snapshot (shape do select de loadSnapshot). */
function cargo(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cargo-1',
    role: 'Enfermeiro',
    vacancyCount: null,
    salaryBase: null,
    registrationFee: null,
    minPassingGradeNonQuota: null,
    workload: null,
    requirements: null,
    description: null,
    hasReserveList: false,
    isNursingRelevant: true,
    syllabusGroups: [],
    ...over,
  };
}

/** Monta o serviço com mocks; rede (PDF + OpenAI de diff) é stubada. */
function build(opts: {
  docKind: string;
  cargos?: ReturnType<typeof cargo>[];
  diff?: { changes?: unknown; cronograma?: unknown; syllabusCargos?: unknown };
  fichas?: {
    role: string;
    requirements: string | null;
    description: string | null;
  }[];
}) {
  const prisma = {
    concursoDocument: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'doc-1',
        url: 'https://banca.org/edital.pdf',
        title: 'Edital de abertura',
        kind: opts.docKind,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
    concurso: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'c1',
        year: 2026,
        registrationStart: null,
        registrationEnd: null,
        examDate: null,
        resultDate: null,
        editalUrl: null,
        etapas: [],
        cargos: opts.cargos ?? [cargo()],
      }),
    },
  } as unknown as PrismaService;

  const extractFichasLiterais = jest.fn().mockResolvedValue(opts.fichas ?? []);
  const examBaseAi = {
    extractFichasLiterais,
    extractSyllabusForCargo: jest.fn().mockResolvedValue([]),
  } as unknown as ExamBaseAiService;

  const service = new ConcursoDocumentAnalysisService(
    {} as ConfigService,
    prisma,
    examBaseAi,
    {} as PdfOcrService,
  );
  const fetchDocumentText = jest
    .spyOn(
      service as unknown as { fetchDocumentText: () => Promise<string> },
      'fetchDocumentText',
    )
    .mockResolvedValue('EDITAL Nº 1/2026 ...');
  const pdfBufferToText = jest
    .spyOn(
      service as unknown as { pdfBufferToText: () => Promise<string> },
      'pdfBufferToText',
    )
    .mockResolvedValue('EDITAL Nº 1/2026 (upload) ...');
  jest
    .spyOn(
      service as unknown as { callOpenAI: () => Promise<unknown> },
      'callOpenAI',
    )
    .mockResolvedValue(
      opts.diff ?? { changes: [], cronograma: [], syllabusCargos: [] },
    );

  return { service, extractFichasLiterais, fetchDocumentText, pdfBufferToText };
}

describe('ConcursoDocumentAnalysisService.analyze — ficha do edital de abertura', () => {
  it('EDITAL_ABERTURA transcreve a ficha e propõe requisitos/atribuições', async () => {
    const { service, extractFichasLiterais } = build({
      docKind: 'EDITAL_ABERTURA',
      fichas: [
        {
          role: 'Enfermeiro',
          requirements: 'Graduação em Enfermagem e registro no COREN.',
          description: 'Prestar assistência de enfermagem...',
        },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(extractFichasLiterais).toHaveBeenCalledWith(expect.any(String), [
      'Enfermeiro',
    ]);
    expect(r.changes).toEqual([
      expect.objectContaining({
        id: 'cargo:cargo-1:requirements',
        field: 'requirements',
        cargoRole: 'Enfermeiro',
        currentValue: null,
        newValue: 'Graduação em Enfermagem e registro no COREN.',
      }),
      expect.objectContaining({
        id: 'cargo:cargo-1:description',
        field: 'description',
        newValue: 'Prestar assistência de enfermagem...',
      }),
    ]);
  });

  it('a transcrição literal SUBSTITUI a mudança do prompt de diff no mesmo campo', async () => {
    const { service } = build({
      docKind: 'EDITAL_ABERTURA',
      diff: {
        changes: [
          {
            target: 'cargo',
            cargoRole: 'Enfermeiro',
            field: 'description',
            newValue: 'Resumo inventado pelo diff.',
            evidence: 'x',
          },
        ],
        cronograma: [],
        syllabusCargos: [],
      },
      fichas: [
        {
          role: 'Enfermeiro',
          requirements: null,
          description: 'Atribuições literais do anexo.',
        },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    const descChanges = r.changes.filter((c) => c.field === 'description');
    expect(descChanges).toHaveLength(1);
    expect(descChanges[0].newValue).toBe('Atribuições literais do anexo.');
  });

  it('não propõe quando o valor transcrito é igual ao atual e ignora cargo fora da enfermagem', async () => {
    const { service, extractFichasLiterais } = build({
      docKind: 'EDITAL_ABERTURA',
      cargos: [
        cargo({ description: 'Já cadastrada.' }),
        cargo({
          id: 'cargo-2',
          role: 'Motorista',
          isNursingRelevant: false,
        }),
      ],
      fichas: [
        { role: 'Enfermeiro', requirements: null, description: 'Já cadastrada.' },
        { role: 'Motorista', requirements: null, description: 'Dirigir.' },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    // Só o cargo de enfermagem é pedido ao extrator.
    expect(extractFichasLiterais).toHaveBeenCalledWith(expect.any(String), [
      'Enfermeiro',
    ]);
    expect(r.changes).toEqual([]);
  });

  it('PDF enviado por upload é analisado sem baixar da URL', async () => {
    const { service, fetchDocumentText, pdfBufferToText } = build({
      docKind: 'RETIFICACAO',
    });

    const r = await service.analyze(
      'c1',
      'doc-1',
      Buffer.from('%PDF-1.7 conteúdo'),
    );

    expect(fetchDocumentText).not.toHaveBeenCalled();
    expect(pdfBufferToText).toHaveBeenCalledTimes(1);
    expect(r.documentId).toBe('doc-1');
  });

  it('upload que não é PDF é rejeitado', async () => {
    const { service, pdfBufferToText } = build({ docKind: 'RETIFICACAO' });

    await expect(
      service.analyze('c1', 'doc-1', Buffer.from('<html>não é pdf</html>')),
    ).rejects.toThrow('não parece ser um PDF');
    expect(pdfBufferToText).not.toHaveBeenCalled();
  });

  it('documento que não é edital de abertura não roda a transcrição', async () => {
    const { service, extractFichasLiterais } = build({
      docKind: 'RETIFICACAO',
      fichas: [
        { role: 'Enfermeiro', requirements: 'X', description: 'Y' },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(extractFichasLiterais).not.toHaveBeenCalled();
    expect(r.changes).toEqual([]);
  });
});
