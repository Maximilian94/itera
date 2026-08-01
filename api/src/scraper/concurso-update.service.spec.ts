import { ConcursoUpdateService } from './concurso-update.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DocumentScraperService } from './document-scraper.service';
import type { ConcursoDocumentAnalysisService } from './concurso-document-analysis.service';

/** Monta o serviço com mocks; `concurso` e `docs` parametrizam a base. */
function build(opts: {
  concurso: {
    id: string;
    institution: string;
    documentsSourceUrl: string | null;
    closedAt: Date | null;
  } | null;
  checked?: {
    name: string;
    summary: string | null;
    url: string | null;
    publishedAt: string | null;
    kind: string;
    isNew: boolean;
  }[];
  checkThrows?: string;
  docs?: { id: string; title: string }[];
  analyzeById?: Record<string, unknown>;
}) {
  const findMany = jest.fn().mockResolvedValue(opts.docs ?? []);
  const prisma = {
    concurso: { findUnique: jest.fn().mockResolvedValue(opts.concurso) },
    concursoDocument: { findMany },
  } as unknown as PrismaService;

  const checkConcursoDocuments = opts.checkThrows
    ? jest.fn().mockRejectedValue(new Error(opts.checkThrows))
    : jest.fn().mockResolvedValue({
        documents: opts.checked ?? [],
        checkedAt: '',
        sourceUrl: '',
      });
  const addConcursoDocuments = jest
    .fn()
    .mockImplementation((_id: string, docs: unknown[]) =>
      Promise.resolve({ addedCount: docs.length }),
    );
  const docScraper = {
    checkConcursoDocuments,
    addConcursoDocuments,
  } as unknown as DocumentScraperService;

  const analyze = jest.fn().mockImplementation((_c: string, docId: string) =>
    Promise.resolve(
      opts.analyzeById?.[docId] ?? {
        documentId: docId,
        analyzedAt: '',
        changes: [],
        cronograma: null,
        syllabus: null,
      },
    ),
  );
  const apply = jest.fn().mockResolvedValue({ appliedCount: 0 });
  const analysis = {
    analyze,
    apply,
  } as unknown as ConcursoDocumentAnalysisService;

  const service = new ConcursoUpdateService(prisma, docScraper, analysis);
  return {
    service,
    checkConcursoDocuments,
    addConcursoDocuments,
    analyze,
    apply,
    findMany,
  };
}

const CONCURSO = {
  id: 'c1',
  institution: 'Prefeitura de Santos',
  documentsSourceUrl: 'https://banca.org/santos',
  closedAt: null,
};

describe('ConcursoUpdateService.updateOne', () => {
  it('pula concurso encerrado (closedAt) sem raspar', async () => {
    const { service, checkConcursoDocuments } = build({
      concurso: { ...CONCURSO, closedAt: new Date('2026-07-01') },
    });
    const r = await service.updateOne('c1');
    expect(r.skipped).toBe('encerrado');
    expect(checkConcursoDocuments).not.toHaveBeenCalled();
  });

  it('pula concurso sem página de origem', async () => {
    const { service, checkConcursoDocuments } = build({
      concurso: { ...CONCURSO, documentsSourceUrl: null },
    });
    const r = await service.updateOne('c1');
    expect(r.skipped).toBe('sem-origem');
    expect(checkConcursoDocuments).not.toHaveBeenCalled();
  });

  it('adiciona só os documentos novos (isNew) e analisa os não analisados', async () => {
    const { service, addConcursoDocuments, analyze, apply } = build({
      concurso: CONCURSO,
      checked: [
        {
          name: 'Retificação 1',
          summary: null,
          url: 'https://b/r1.pdf',
          publishedAt: '2026-06-10',
          kind: 'RETIFICACAO',
          isNew: true,
        },
        {
          name: 'Edital',
          summary: null,
          url: 'https://b/e.pdf',
          publishedAt: '2026-06-01',
          kind: 'EDITAL_ABERTURA',
          isNew: false,
        },
      ],
      docs: [
        { id: 'd-old', title: 'Edital' },
        { id: 'd-new', title: 'Retificação 1' },
      ],
      analyzeById: {
        'd-new': {
          documentId: 'd-new',
          analyzedAt: '',
          changes: [
            {
              id: 'x',
              target: 'concurso',
              cargoId: null,
              cargoRole: null,
              field: 'registrationEnd',
              label: 'Fim das inscrições',
              currentValue: '2026-08-20',
              newValue: '2026-08-27',
              evidence: 'prorrogadas até 27/08',
            },
          ],
          cronograma: null,
          syllabus: null,
        },
      },
    });

    const r = await service.updateOne('c1');

    // Só 1 doc novo foi adicionado (o isNew:false não entra).
    expect(addConcursoDocuments).toHaveBeenCalledTimes(1);
    const [, addedDocs] = addConcursoDocuments.mock.calls[0] as [
      string,
      { title: string; url: string }[],
    ];
    expect(addedDocs).toHaveLength(1);
    expect(addedDocs[0]).toMatchObject({
      title: 'Retificação 1',
      url: 'https://b/r1.pdf',
    });
    expect(r.docsAdded).toBe(1);

    // Os 2 docs pendentes foram analisados; o apply recebeu as mudanças.
    expect(analyze).toHaveBeenCalledTimes(2);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(r.docsAnalyzed).toBe(2);

    // O relatório traz a mudança de campo detalhada (antigo → novo).
    expect(r.changes).toEqual([
      {
        docTitle: 'Retificação 1',
        target: 'concurso',
        cargoRole: null,
        label: 'Fim das inscrições',
        oldValue: '2026-08-20',
        newValue: '2026-08-27',
      },
    ]);
  });

  it('lê os documentos do mais antigo para o mais novo', async () => {
    const { service, findMany } = build({ concurso: CONCURSO, checked: [] });
    await service.updateOne('c1');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { concursoId: 'c1', analyzedAt: null },
        orderBy: [{ publishedAt: 'asc' }, { createdAt: 'asc' }],
      }),
    );
  });

  it('erro na Fase 1 (raspagem bloqueada) não impede a Fase 2', async () => {
    const { service, analyze, apply } = build({
      concurso: CONCURSO,
      checkThrows: 'HTTP 403',
      docs: [{ id: 'd1', title: 'Doc pendente' }],
    });
    const r = await service.updateOne('c1');
    expect(r.error).toContain('403');
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(r.docsAnalyzed).toBe(1);
  });
});
