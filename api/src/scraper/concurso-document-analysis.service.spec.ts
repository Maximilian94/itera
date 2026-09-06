import { ConcursoDocumentAnalysisService } from './concurso-document-analysis.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { ExamBaseAiService } from '../examBase/exam-base-ai.service';
import type { PdfOcrService } from '../pdf/pdf-ocr.service';
import type { ConcursoCostService } from './concurso-cost.service';
import { AiUsageMeter } from '../common/ai-cost';

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
  diff?: {
    changes?: unknown;
    cronograma?: unknown;
    syllabusCargos?: unknown;
    novosCargos?: unknown;
  };
  fichas?: {
    role: string;
    requirements: string | null;
    description: string | null;
  }[];
  /** Cargos que a extração determinística (extractCargosFromText) devolve. */
  fichaCargos?: Record<string, unknown>[];
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
    cargo: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'novo-1' }),
      update: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const extractFichasLiterais = jest.fn().mockResolvedValue(opts.fichas ?? []);
  const extractCargosFromText = jest
    .fn()
    .mockResolvedValue(opts.fichaCargos ?? []);
  const examBaseAi = {
    extractFichasLiterais,
    extractCargosFromText,
    extractSyllabusForCargo: jest.fn().mockResolvedValue([]),
  } as unknown as ExamBaseAiService;

  const service = new ConcursoDocumentAnalysisService(
    {} as ConfigService,
    prisma,
    examBaseAi,
    {} as PdfOcrService,
    {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as ConcursoCostService,
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

  return {
    service,
    prisma,
    extractFichasLiterais,
    extractCargosFromText,
    fetchDocumentText,
    pdfBufferToText,
  };
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

    // 3º arg: o medidor de custo da análise (a fase mede OCR + cada chamada).
    // 1 chamada POR cargo de enfermagem; o 4º arg leva TODOS os cargos do
    // concurso para o recorte distinguir cargos de nome parecido.
    expect(extractFichasLiterais).toHaveBeenCalledWith(
      expect.any(String),
      ['Enfermeiro'],
      expect.any(AiUsageMeter),
      ['Enfermeiro'],
    );
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
        {
          role: 'Enfermeiro',
          requirements: null,
          description: 'Já cadastrada.',
        },
        { role: 'Motorista', requirements: null, description: 'Dirigir.' },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    // Só o cargo de enfermagem é pedido ao extrator.
    // 3º arg: o medidor de custo da análise (a fase mede OCR + cada chamada).
    expect(extractFichasLiterais).toHaveBeenCalledWith(
      expect.any(String),
      ['Enfermeiro'],
      expect.any(AiUsageMeter),
      ['Enfermeiro', 'Motorista'],
    );
    expect(r.changes).toEqual([]);
  });

  it('dá uma chamada própria a CADA cargo de enfermagem', async () => {
    // Regressão: com os dois cargos num lote só, o modelo devolvia a ficha de
    // um e o outro ficava sem atribuições (ou herdava as do vizinho).
    const { service, extractFichasLiterais } = build({
      docKind: 'EDITAL_ABERTURA',
      cargos: [
        cargo(),
        cargo({ id: 'cargo-2', role: 'Enfermeiro Plantonista' }),
        cargo({ id: 'cargo-3', role: 'Motorista', isNursingRelevant: false }),
      ],
    });
    extractFichasLiterais.mockImplementation((_text, roles: string[]) =>
      Promise.resolve([
        {
          role: roles[0],
          requirements: null,
          description: `Atribuições de ${roles[0]}.`,
        },
      ]),
    );

    const r = await service.analyze('c1', 'doc-1');

    const allRoles = ['Enfermeiro', 'Enfermeiro Plantonista', 'Motorista'];
    expect(extractFichasLiterais).toHaveBeenCalledTimes(2);
    for (const role of ['Enfermeiro', 'Enfermeiro Plantonista']) {
      expect(extractFichasLiterais).toHaveBeenCalledWith(
        expect.any(String),
        [role],
        expect.any(AiUsageMeter),
        allRoles,
      );
    }
    // Cada cargo recebe a SUA transcrição, não a do vizinho.
    expect(r.changes).toEqual([
      expect.objectContaining({
        cargoId: 'cargo-1',
        field: 'description',
        newValue: 'Atribuições de Enfermeiro.',
      }),
      expect.objectContaining({
        cargoId: 'cargo-2',
        field: 'description',
        newValue: 'Atribuições de Enfermeiro Plantonista.',
      }),
    ]);
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
      fichas: [{ role: 'Enfermeiro', requirements: 'X', description: 'Y' }],
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(extractFichasLiterais).not.toHaveBeenCalled();
    expect(r.changes).toEqual([]);
  });
});

describe('ConcursoDocumentAnalysisService — ficha do cargo NOVO', () => {
  it('cargo novo de enfermagem recebe as atribuições literais', async () => {
    // Regressão (Lagoa da Prata): "Enfermeiro de Unidade Básica de Saúde" era
    // descoberto pela análise e criado SEM `description` — o snapshot foi
    // carregado antes de ele existir, então `proposeFichasFromEdital` não o
    // cobria, e `createNewCargo` não gravava o campo.
    const { service, extractFichasLiterais } = build({
      docKind: 'EDITAL_ABERTURA',
      cargos: [],
      fichaCargos: [
        {
          role: 'Enfermeiro de Unidade Básica de Saúde',
          salaryBase: '4750.00',
          isNursingRelevant: true,
        },
      ],
    });
    extractFichasLiterais.mockImplementation((_t, roles: string[]) =>
      Promise.resolve([
        {
          role: roles[0],
          requirements: 'Superior em Enfermagem e COREN.',
          description: `Atribuições de ${roles[0]}.`,
        },
      ]),
    );

    const r = await service.analyze('c1', 'doc-1');

    expect(r.newCargos).toEqual([
      expect.objectContaining({
        role: 'Enfermeiro de Unidade Básica de Saúde',
        description: 'Atribuições de Enfermeiro de Unidade Básica de Saúde.',
        requirements: 'Superior em Enfermagem e COREN.',
      }),
    ]);
  });

  it('cargo novo FORA da enfermagem não gasta chamada de ficha', async () => {
    const { service, extractFichasLiterais } = build({
      docKind: 'RETIFICACAO',
      cargos: [],
      fichaCargos: [
        { role: 'Motorista', salaryBase: '1600.00', isNursingRelevant: false },
      ],
    });

    await service.analyze('c1', 'doc-1');

    expect(extractFichasLiterais).not.toHaveBeenCalled();
  });
});

describe('ConcursoDocumentAnalysisService — cargos novos (inclusão de cargo)', () => {
  it('propõe um cargo novo que a retificação adiciona e não existe no estado atual', async () => {
    const { service } = build({
      docKind: 'RETIFICACAO',
      diff: {
        changes: [],
        cronograma: [],
        syllabusCargos: [],
        novosCargos: [
          {
            role: 'Enfermeiro do Trabalho',
            salaryBase: '4750.00',
            vacancyCount: 2,
            registrationFee: '110.00',
            minPassingGradeNonQuota: '60.00',
            workload: '40 horas semanais',
            requirements: 'Especialização em Enfermagem do Trabalho.',
            hasReserveList: true,
            isNursingRelevant: true,
            evidence: 'Fica incluído o cargo de Enfermeiro do Trabalho.',
          },
        ],
      },
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(r.newCargos).toEqual([
      expect.objectContaining({
        role: 'Enfermeiro do Trabalho',
        salaryBase: '4750.00',
        vacancyCount: 2,
        isNursingRelevant: true,
      }),
    ]);
  });

  it('extração determinística: propõe salário do anexo para cargo existente (sem linguagem de diff)', async () => {
    const { service } = build({
      docKind: 'OUTRO', // ANEXO I — Requisitos costuma cair aqui
      // O prompt de diff não achou nada; a extração de cargos é que traz o dado.
      diff: {
        changes: [],
        cronograma: [],
        syllabusCargos: [],
        novosCargos: [],
      },
      fichaCargos: [
        { role: 'Enfermeiro', salaryBase: '4750.00', isNursingRelevant: true },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(r.changes).toEqual([
      expect.objectContaining({
        id: 'cargo:cargo-1:salaryBase',
        field: 'salaryBase',
        cargoRole: 'Enfermeiro',
        currentValue: null,
        newValue: '4750.00',
      }),
    ]);
  });

  it('extração determinística: cargo de enfermagem ausente vira inclusão; não-enfermagem é ignorado', async () => {
    const { service } = build({
      docKind: 'RETIFICACAO',
      fichaCargos: [
        {
          role: 'Enfermeiro do Trabalho',
          salaryBase: '5000.00',
          vacancyCount: 1,
          isNursingRelevant: true,
        },
        { role: 'Motorista', salaryBase: '1600.00', isNursingRelevant: false },
      ],
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(r.newCargos).toEqual([
      expect.objectContaining({
        role: 'Enfermeiro do Trabalho',
        salaryBase: '5000.00',
        vacancyCount: 1,
        isNursingRelevant: true,
      }),
    ]);
  });

  it('descarta cargo novo cujo role já existe no estado atual (é diff, não inclusão)', async () => {
    const { service } = build({
      docKind: 'RETIFICACAO',
      diff: {
        changes: [],
        cronograma: [],
        syllabusCargos: [],
        // "Enfermeiro" já existe no snapshot (cargo padrão) → não é novo.
        novosCargos: [{ role: 'enfermeiro', salaryBase: '5000.00' }],
      },
    });

    const r = await service.analyze('c1', 'doc-1');

    expect(r.newCargos).toBeNull();
  });

  it('apply cria o cargo novo (idempotente por role) e conta como item aplicado', async () => {
    const { service, prisma } = build({ docKind: 'RETIFICACAO' });

    const res = await service.apply('c1', 'doc-1', [], null, null, [
      {
        role: 'Enfermeiro do Trabalho',
        salaryBase: '4750.00',
        vacancyCount: 2,
        isNursingRelevant: true,
      },
    ]);

    expect(res.appliedCount).toBe(1);
    expect(
      (prisma.cargo as unknown as { create: jest.Mock }).create,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          concursoId: 'c1',
          role: 'Enfermeiro do Trabalho',
          salaryBase: '4750.00',
          vacancyCount: 2,
          isNursingRelevant: true,
        }),
      }),
    );
  });

  it('apply NÃO recria um cargo cujo role já existe (retorna 0)', async () => {
    const { service, prisma } = build({ docKind: 'RETIFICACAO' });
    (
      prisma.cargo as unknown as { findFirst: jest.Mock }
    ).findFirst.mockResolvedValue({
      id: 'cargo-1',
    });

    const res = await service.apply('c1', 'doc-1', [], null, null, [
      { role: 'Enfermeiro' },
    ]);

    expect(res.appliedCount).toBe(0);
    expect(
      (prisma.cargo as unknown as { create: jest.Mock }).create,
    ).not.toHaveBeenCalled();
  });
});
