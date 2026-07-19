import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, TEST_USER_HEADER } from './create-app';
import {
  createExamBase,
  createExamBoard,
  createUser,
  truncateAll,
} from './factories';

/**
 * E2E do POST /concursos (criação admin a partir do edital — fluxo do scraper
 * de documentos): o concurso nasce SEM prova, com Cargo de ficha completa, e
 * precisa aparecer na listagem (nível 0) e na página do concurso (nível 1)
 * mesmo sem nenhuma ExamBase.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('POST /concursos — criação a partir do edital (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;

  let user: { id: string };
  let admin: { id: string };
  let board: { id: string; alias: string | null };

  const asUser = (req: request.Test) => req.set(TEST_USER_HEADER, user.id);
  const asAdmin = (req: request.Test) => req.set(TEST_USER_HEADER, admin.id);

  const payload = () => ({
    institution: 'Prefeitura de Itaguai',
    year: new Date().getUTCFullYear(),
    governmentScope: 'MUNICIPAL',
    state: 'RJ',
    city: 'Itaguai',
    examBoardId: board.id,
    editalUrl: 'https://banca.example.com/itaguai/edital-01.pdf',
    // Janela cobrindo hoje → o concurso deve listar como "open".
    registrationStart: iso(daysFromNow(-2)),
    registrationEnd: iso(daysFromNow(20)),
    // Data da prova do próprio concurso (sem prova cadastrada ainda).
    examDate: iso(daysFromNow(60)),
    resultDate: iso(daysFromNow(90)),
    etapas: [
      {
        name: 'Prova Objetiva',
        description: 'Caráter eliminatório e classificatório.',
        date: iso(daysFromNow(60)),
      },
      { name: 'Prova de Títulos', description: null },
    ],
    documents: [
      {
        title: 'Edital de Abertura nº 01',
        summary: 'Edital com cargos, vagas e cronograma.',
        url: 'https://banca.example.com/itaguai/edital-01.pdf',
        kind: 'EDITAL_ABERTURA',
        publishedAt: iso(daysFromNow(-10)),
        sourceUrl: 'https://banca.example.com/itaguai/documentos',
      },
      {
        title: 'Retificação nº 01 — cronograma',
        summary: 'Prorroga as inscrições.',
        url: 'https://banca.example.com/itaguai/retificacao-01.pdf',
        kind: 'RETIFICACAO',
        publishedAt: iso(daysFromNow(-2)),
      },
      {
        // Sem data → vai para o fim da timeline.
        title: 'Comunicado sem data',
        url: 'https://banca.example.com/itaguai/comunicado.pdf',
        kind: 'COMUNICADO',
      },
    ],
    cargos: [
      {
        role: 'Enfermeiro',
        description: 'Prestar assistência de enfermagem.',
        requirements: 'Superior em Enfermagem + COREN',
        salaryBase: '6450.00',
        workload: '40h semanais',
        vacancyCount: 12,
        hasReserveList: true,
        registrationFee: '95.00',
        minPassingGradeNonQuota: '60.00',
        isNursingRelevant: true,
        syllabusGroups: [
          {
            name: 'Conhecimentos Específicos',
            topics: 'SUS; PNAB; SAE.',
            questionCount: 30,
            weight: '2',
            maxScore: '60.00',
          },
          {
            name: 'Língua Portuguesa',
            questionCount: 10,
            weight: '1',
            maxScore: '10.00',
          },
        ],
      },
      {
        role: 'Motorista',
        requirements: 'Fundamental completo + CNH D',
        salaryBase: '1600.00',
        vacancyCount: 5,
        hasReserveList: true,
        registrationFee: '90.00',
        isNursingRelevant: false,
      },
    ],
  });

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);

    board = await createExamBoard(prisma);
    user = await createUser(prisma);
    admin = await createUser(prisma, { role: 'ADMIN' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige ADMIN (usuário comum → 403)', async () => {
    await asUser(request(http).post('/concursos').send(payload())).expect(403);
  });

  let createdSlug: string;
  let createdConcursoId: string;
  let createdCargoId: string;

  it('cria Concurso + todos os cargos sem nenhuma prova', async () => {
    const res = await asAdmin(
      request(http).post('/concursos').send(payload()),
    ).expect(201);

    expect(res.body.concurso.slug).toBeTruthy();
    expect(res.body.cargos).toHaveLength(2);
    expect(res.body.createdCount).toBe(2);
    expect(res.body.documentCount).toBe(3);
    createdSlug = res.body.concurso.slug;
    createdConcursoId = res.body.concurso.id;
    createdCargoId = res.body.cargos.find(
      (c: { role: string }) => c.role === 'Enfermeiro',
    ).id;

    const concurso = await prisma.concurso.findUnique({
      where: { id: createdConcursoId },
      include: { cargos: true, examBases: true },
    });
    expect(concurso?.editalUrl).toBe(payload().editalUrl);
    expect(concurso?.registrationStart).not.toBeNull();
    expect(concurso?.resultDate).not.toBeNull();
    expect(concurso?.examBases).toHaveLength(0);
    expect(concurso?.cargos).toHaveLength(2);
    const enf = concurso?.cargos.find((c) => c.role === 'Enfermeiro');
    expect(enf?.requirements).toBe('Superior em Enfermagem + COREN');
    expect(enf?.hasReserveList).toBe(true);
    expect(enf?.isNursingRelevant).toBe(true);
    const motorista = concurso?.cargos.find((c) => c.role === 'Motorista');
    expect(motorista?.isNursingRelevant).toBe(false);
  });

  it('lista o concurso sem prova no nível 0 (status open, agregados só dos cargos de enfermagem)', async () => {
    const res = await request(http).get('/concursos').expect(200);
    const item = res.body.concursos.find(
      (c: { slug: string }) => c.slug === createdSlug,
    );
    expect(item).toBeDefined();
    expect(item.status).toBe('open');
    // Regra de produto: só cargos isNursingRelevant entram nos agregados —
    // o Motorista fica de fora do card.
    expect(item.cargoCount).toBe(1);
    expect(item.vacancyTotal).toBe(12);
    expect(item.hasCR).toBe(true);
    expect(Number(item.salaryMax)).toBe(6450);
    expect(item.questionCount).toBe(0);
    // Data da prova do concurso aparece mesmo sem prova cadastrada.
    expect(item.timeline.examDate).toBe(
      new Date(iso(daysFromNow(60))).toISOString(),
    );
  });

  it('página do concurso (nível 1) mostra o cargo com provaCount 0', async () => {
    const res = await request(http)
      .get(`/concursos/${createdSlug}`)
      .expect(200);
    expect(res.body.concurso.status).toBe('open');
    expect(res.body.concurso.editalUrl).toBe(payload().editalUrl);
    expect(res.body.concurso.timeline.registrationEnd).not.toBeNull();
    // examDate do próprio concurso (sem prova) preenche a timeline do nível 1.
    expect(res.body.concurso.timeline.examDate).toBe(
      new Date(iso(daysFromNow(60))).toISOString(),
    );

    // Etapas do certame (cronograma) no payload do nível 1, na ordem enviada,
    // com a data (date-only) preservada.
    expect(res.body.concurso.etapas).toEqual([
      {
        name: 'Prova Objetiva',
        description: 'Caráter eliminatório e classificatório.',
        date: iso(daysFromNow(60)),
      },
      { name: 'Prova de Títulos', description: null, date: null },
    ]);

    expect(res.body.cargos).toHaveLength(1);
    const cargo = res.body.cargos[0];
    expect(cargo.role).toBe('Enfermeiro');
    expect(cargo.provaCount).toBe(0);
    expect(cargo.questionCount).toBe(0);
    expect(Number(cargo.salaryBase)).toBe(6450);
    // Sem prova oficial, o id do card cai no id do próprio Cargo.
    expect(cargo.id).toBe(createdCargoId);
  });

  it('página do concurso (nível 1) traz a timeline de Notícias, mais recente primeiro', async () => {
    const res = await request(http)
      .get(`/concursos/${createdSlug}`)
      .expect(200);

    expect(res.body.documents).toHaveLength(3);
    // Ordenação: retificação (-2d) → edital (-10d) → sem data por último.
    expect(res.body.documents.map((d: { title: string }) => d.title)).toEqual([
      'Retificação nº 01 — cronograma',
      'Edital de Abertura nº 01',
      'Comunicado sem data',
    ]);
    const edital = res.body.documents[1];
    expect(edital.kind).toBe('EDITAL_ABERTURA');
    expect(edital.summary).toBe('Edital com cargos, vagas e cronograma.');
    expect(edital.url).toBe('https://banca.example.com/itaguai/edital-01.pdf');
    expect(edital.publishedAt).not.toBeNull();
    const semData = res.body.documents[2];
    expect(semData.publishedAt).toBeNull();
  });

  it('é idempotente: repetir a criação atualiza as fichas em vez de duplicar', async () => {
    const base = payload();
    const res = await asAdmin(
      request(http)
        .post('/concursos')
        .send({
          ...base,
          cargos: base.cargos.map((c) =>
            c.role === 'Enfermeiro' ? { ...c, salaryBase: '7000.00' } : c,
          ),
        }),
    ).expect(201);

    expect(res.body.concurso.id).toBe(createdConcursoId);
    expect(res.body.createdCount).toBe(0);
    expect(res.body.updatedCount).toBe(2);
    const enf = res.body.cargos.find(
      (c: { role: string }) => c.role === 'Enfermeiro',
    );
    expect(enf.id).toBe(createdCargoId);
    expect(enf.created).toBe(false);

    const cargos = await prisma.cargo.findMany({
      where: { concursoId: createdConcursoId },
    });
    expect(cargos).toHaveLength(2);
    expect(
      Number(cargos.find((c) => c.role === 'Enfermeiro')?.salaryBase),
    ).toBe(7000);

    // Documentos: upsert por (concursoId, url) — reenviar não duplica.
    const docs = await prisma.concursoDocument.findMany({
      where: { concursoId: createdConcursoId },
    });
    expect(docs).toHaveLength(3);
  });

  it('página do cargo (nível 2) funciona SEM prova — ficha para estudar', async () => {
    const res = await request(http)
      .get(`/concursos/${createdSlug}/cargos/${createdCargoId}`)
      .expect(200);

    expect(res.body.cargo.role).toBe('Enfermeiro');
    // Ficha completa do edital, mesmo sem prova.
    expect(res.body.cargo.description).toBe(
      'Prestar assistência de enfermagem.',
    );
    expect(res.body.cargo.requirements).toBe('Superior em Enfermagem + COREN');
    expect(Number(res.body.cargo.salaryBase)).toBe(7000);
    // Sem prova: examDate null, zero questões, nenhum vínculo.
    expect(res.body.cargo.examDate).toBeNull();
    expect(res.body.cargo.questionCount).toBe(0);
    expect(res.body.provas).toEqual([]);
    // Plano de estudos zerado (anônimo), mas presente — a página renderiza.
    expect(res.body.studyPlan.currentStep).toBe('diagnostico');

    // Conteúdo programático + quadro de provas do edital (matérias com números).
    expect(res.body.syllabusGroups).toHaveLength(2);
    const [especificos, portugues] = res.body.syllabusGroups;
    expect(especificos.name).toBe('Conhecimentos Específicos');
    expect(especificos.topics).toBe('SUS; PNAB; SAE.');
    expect(especificos.questionCount).toBe(30);
    expect(Number(especificos.weight)).toBe(2);
    expect(Number(especificos.maxScore)).toBe(60);
    // Matéria sem tópicos: topics vira '' (não quebra), números preservados.
    expect(portugues.name).toBe('Língua Portuguesa');
    expect(portugues.topics).toBe('');
    expect(portugues.questionCount).toBe(10);
  });

  it('/edit devolve o quadro de matérias e o PATCH o substitui', async () => {
    const editRes = await asAdmin(
      request(http).get(`/concursos/${createdConcursoId}/edit`),
    ).expect(200);
    const enfEdit = editRes.body.cargos.find(
      (c: { role: string }) => c.role === 'Enfermeiro',
    );
    expect(enfEdit.syllabusGroups).toHaveLength(2);
    expect(enfEdit.syllabusGroups[0].name).toBe('Conhecimentos Específicos');
    expect(enfEdit.syllabusGroups[0].questionCount).toBe(30);

    // PATCH com uma matéria só → replace total do quadro do cargo. Mantém
    // TODOS os cargos (id de volta) para não remover o Motorista sem prova.
    // `documents` não faz parte do UpdateConcursoDto → fica de fora.
    const base = payload();
    await asAdmin(
      request(http)
        .patch(`/concursos/${createdConcursoId}`)
        .send({
          institution: base.institution,
          year: base.year,
          governmentScope: base.governmentScope,
          state: base.state,
          city: base.city,
          examBoardId: base.examBoardId,
          editalUrl: base.editalUrl,
          registrationStart: base.registrationStart,
          registrationEnd: base.registrationEnd,
          examDate: base.examDate,
          resultDate: base.resultDate,
          etapas: base.etapas,
          cargos: (editRes.body.cargos as Array<Record<string, unknown>>).map(
            (c) => {
              const { syllabusGroups, provaCount, ...ficha } = c;
              void syllabusGroups;
              void provaCount;
              return ficha.role === 'Enfermeiro'
                ? {
                    ...ficha,
                    syllabusGroups: [
                      {
                        name: 'Legislação do SUS',
                        questionCount: 40,
                        weight: '1',
                      },
                    ],
                  }
                : ficha;
            },
          ),
        }),
    ).expect(200);

    const groups = await prisma.examSyllabusGroup.findMany({
      where: { cargoId: createdCargoId },
      orderBy: { order: 'asc' },
    });
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Legislação do SUS');
    expect(groups[0].questionCount).toBe(40);
  });

  it('prova criada depois liga-se ao cargo existente (sem duplicar)', async () => {
    // Mesma tupla (institution + banca + ano) e mesmo role do cargo do painel.
    const prova = await createExamBase(prisma, {
      institution: payload().institution,
      examBoardId: board.id,
      role: 'Enfermeiro',
      slug: 'itaguai-enfermeiro-2026',
      examDate: daysFromNow(60),
    });

    // A leitura do detalhe roda o self-heal (ensureDefaultCargo) na prova nova.
    const res = await asAdmin(
      request(http).get(`/concursos/${createdSlug}`),
    ).expect(200);

    expect(res.body.cargos).toHaveLength(1);
    const cargo = res.body.cargos[0];
    expect(cargo.provaCount).toBe(1);
    // Com prova oficial, o id do card volta a ser o id da PROVA (contrato).
    expect(cargo.id).toBe(prova.id);
    // A ficha continua a do cargo criado pelo painel (edital), não a da prova.
    expect(Number(cargo.salaryBase)).toBe(7000);

    const enfCargo = await prisma.cargo.findUnique({
      where: { id: createdCargoId },
      include: { provas: true },
    });
    expect(enfCargo?.provas).toHaveLength(1);
    expect(enfCargo?.provas[0].isOficial).toBe(true);
    expect(enfCargo?.slug).toBe('itaguai-enfermeiro-2026');
    // O Motorista (sem prova) continua único — nada duplicou.
    const all = await prisma.cargo.findMany({
      where: { concursoId: createdConcursoId },
    });
    expect(all).toHaveLength(2);
  });

  it('valida o payload (400 sem institution/cargos)', async () => {
    await asAdmin(
      request(http)
        .post('/concursos')
        .send({ year: 2026, governmentScope: 'MUNICIPAL', cargos: [] }),
    ).expect(400);
  });
});
