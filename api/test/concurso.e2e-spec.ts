import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, TEST_USER_HEADER } from './create-app';
import {
  addQuestions,
  createExamBase,
  createExamBoard,
  createFinishedAttempt,
  createSyllabusGroups,
  createUser,
  truncateAll,
  SeededQuestion,
} from './factories';

/**
 * E2E dos 4 endpoints de concurso (MAX-19) contra Postgres real, com o seed
 * dedicado do ticket:
 *
 * - Concurso PASSADO (2024): Enfermeiro (com questões e tentativa do usuário),
 *   Técnico (sem salário/janela/taxa — casos de dado ausente), Médico
 *   (irrelevante p/ enfermagem) e Auxiliar (não publicado, só admin);
 * - 1 edição ANTERIOR de Enfermeiro (2021, com dados de concorrência);
 * - Concurso FUTURO (datas relativas a hoje, inscrições abertas) com syllabus
 *   e sem questões — distribuição vira "historical" sobre 2024+2021.
 *
 * A ordem dos testes importa num ponto: o vínculo lazy (beforeAll) roda como
 * usuário comum, então o Auxiliar não publicado só ganha concursoId depois
 * que algum teste autenticado como ADMIN lê o concurso.
 */

const INSTITUTION = 'Prefeitura de Itera';
const PAST_SLUG = 'prefeitura-de-itera-2024-cebraspe';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS);

describe('Concurso endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;

  let user: { id: string };
  let admin: { id: string };
  let enf2024: { id: string; slug: string | null };
  let tec2024: { id: string; slug: string | null };
  let med2024: { id: string; slug: string | null };
  let aux2024: { id: string; slug: string | null };
  let enf2021: { id: string; slug: string | null };
  let enfFuturo: { id: string; slug: string | null };
  let futureSlug: string;

  const asUser = (req: request.Test) => req.set(TEST_USER_HEADER, user.id);
  const asAdmin = (req: request.Test) => req.set(TEST_USER_HEADER, admin.id);

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);

    const board = await createExamBoard(prisma);
    user = await createUser(prisma);
    admin = await createUser(prisma, { role: 'ADMIN' });

    // ── Concurso passado (2024) ────────────────────────────────────────────
    const shared = { institution: INSTITUTION, examBoardId: board.id };
    enf2024 = await createExamBase(prisma, {
      ...shared,
      role: 'Enfermeiro',
      slug: 'pref-itera-2024-enfermeiro',
      salaryBase: 8500,
      vacancyCount: 20,
      registrationFee: 90,
      minPassingGradeNonQuota: 60,
      workload: '40h semanais',
      requirements: 'Superior em Enfermagem + COREN',
      examDate: new Date('2024-06-02T00:00:00.000Z'),
      registrationStart: new Date('2024-03-01T00:00:00.000Z'),
      registrationEnd: new Date('2024-03-31T00:00:00.000Z'),
      resultDate: new Date('2024-08-01T00:00:00.000Z'),
    });
    // Syllabus numa prova passada NÃO deve aparecer no payload do cargo.
    await createSyllabusGroups(prisma, enf2024.id, [
      { name: 'SUS', topics: 'Lei 8.080; Lei 8.142' },
    ]);
    // 2 questões sem matéria = 10% do total > 5% → balde "Outros".
    const enf2024Questions = await addQuestions(prisma, enf2024.id, [
      { subject: 'Saúde Coletiva / SUS', count: 10 },
      { subject: 'Fundamentos de Enfermagem', count: 8 },
      { subject: null, count: 2 },
    ]);

    // Casos de dado ausente: sem salário, sem janela de inscrição, sem taxa.
    tec2024 = await createExamBase(prisma, {
      ...shared,
      role: 'Técnico de Enfermagem',
      slug: 'pref-itera-2024-tecnico',
      vacancyCount: 50,
      examDate: new Date('2024-06-02T00:00:00.000Z'),
    });
    med2024 = await createExamBase(prisma, {
      ...shared,
      role: 'Médico Clínico',
      slug: 'pref-itera-2024-medico',
      isNursingRelevant: false,
      salaryBase: 15000,
      vacancyCount: 100,
      examDate: new Date('2024-06-02T00:00:00.000Z'),
    });
    aux2024 = await createExamBase(prisma, {
      ...shared,
      role: 'Auxiliar de Enfermagem',
      slug: 'pref-itera-2024-auxiliar',
      published: false,
      vacancyCount: 5,
      examDate: new Date('2024-06-02T00:00:00.000Z'),
    });

    // ── Edição anterior de Enfermeiro (2021), com dados de concorrência ───
    enf2021 = await createExamBase(prisma, {
      ...shared,
      role: 'Enfermeiro',
      slug: 'pref-itera-2021-enfermeiro',
      examDate: new Date('2021-05-16T00:00:00.000Z'),
      applicantCount: 1786,
      vacancyCount: 20,
      minPassingGradeNonQuota: 60,
    });
    await addQuestions(prisma, enf2021.id, [
      { subject: 'Saúde Coletiva / SUS', count: 6 },
      { subject: 'Ética Profissional', count: 4 },
    ]);

    // ── Concurso futuro: inscrições abertas hoje, prova daqui a 60 dias ───
    enfFuturo = await createExamBase(prisma, {
      ...shared,
      role: 'Enfermeiro',
      slug: 'pref-itera-futuro-enfermeiro',
      salaryBase: 9000,
      vacancyCount: 10,
      registrationFee: 100,
      examDate: daysFromNow(60),
      registrationStart: daysFromNow(-5),
      registrationEnd: daysFromNow(10),
    });
    await createSyllabusGroups(prisma, enfFuturo.id, [
      { name: 'Saúde Coletiva e SUS', topics: 'Lei 8.080; Política Nacional' },
      {
        name: 'Fundamentos de Enfermagem',
        topics: 'Semiologia; Biossegurança',
      },
    ]);

    // ── Tentativa finalizada do usuário na prova de 2024 ──────────────────
    // SUS: 5 respondidas / 3 certas (60%); Fundamentos: só 4 (abaixo do
    // mínimo de 5 → acurácia oculta). Score 40 < corte 60 → treino_dirigido.
    const bySubject = new Map<string | null, SeededQuestion[]>();
    for (const q of enf2024Questions) {
      bySubject.set(q.subject, [...(bySubject.get(q.subject) ?? []), q]);
    }
    const sus = bySubject.get('Saúde Coletiva / SUS')!;
    const fundamentos = bySubject.get('Fundamentos de Enfermagem')!;
    await createFinishedAttempt(prisma, {
      userId: user.id,
      examBaseId: enf2024.id,
      scorePercentage: 40,
      answers: [
        ...sus.slice(0, 3).map((question) => ({ question, correct: true })),
        ...sus.slice(3, 5).map((question) => ({ question, correct: false })),
        ...fundamentos
          .slice(0, 4)
          .map((question) => ({ question, correct: true })),
      ],
    });

    // O vínculo Concurso ↔ ExamBase nasce preguiçosamente na leitura: estas
    // duas chamadas criam os dois concursos e definem os slugs usados abaixo.
    const past = await asUser(
      request(http).get(`/exam-bases/${enf2024.id}/concurso`),
    ).expect(200);
    expect(past.body.concurso.slug).toBe(PAST_SLUG);

    const future = await asUser(
      request(http).get(`/exam-bases/${enfFuturo.id}/concurso`),
    ).expect(200);
    futureSlug = future.body.concurso.slug as string;
    expect(futureSlug).toMatch(/^prefeitura-de-itera-\d{4}-cebraspe$/);
    expect(futureSlug).not.toBe(PAST_SLUG);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /exam-bases/:id/concurso (lazy-link)', () => {
    it('exige autenticação (rota sem @OptionalAuth) → 401', async () => {
      await request(http).get(`/exam-bases/${enf2024.id}/concurso`).expect(401);
    });

    it('lista só as provas relevantes/publicadas, em ordem de role', async () => {
      const res = await asUser(
        request(http).get(`/exam-bases/${enf2024.id}/concurso`),
      ).expect(200);

      expect(res.body.provas.map((p: { role: string }) => p.role)).toEqual([
        'Enfermeiro',
        'Técnico de Enfermagem',
      ]);
    });

    it('self-healing: vincula concursoId até nas provas fora do payload (Médico); a não publicada fica para a leitura de admin', async () => {
      const medico = await prisma.examBase.findUniqueOrThrow({
        where: { id: med2024.id },
        select: { concursoId: true },
      });
      expect(medico.concursoId).not.toBeNull();

      // Usuário comum não enxerga a prova não publicada → ela ainda não foi
      // vinculada (só será quando um ADMIN ler o concurso).
      const auxiliar = await prisma.examBase.findUniqueOrThrow({
        where: { id: aux2024.id },
        select: { concursoId: true },
      });
      expect(auxiliar.concursoId).toBeNull();
    });
  });

  describe('GET /concursos/:slug (nível 1)', () => {
    it('404 para slug inexistente', async () => {
      await request(http).get('/concursos/nao-existe').expect(404);
    });

    it('anônimo: 2 cargos (Médico e Auxiliar fora), summary e timeline corretos, status past', async () => {
      const res = await request(http)
        .get(`/concursos/${PAST_SLUG}`)
        .expect(200);

      expect(res.body.concurso.status).toBe('past');
      expect(res.body.concurso.summary).toEqual({
        vacancyTotal: 70,
        hasCR: false,
        salaryMin: '8500',
        salaryMax: '8500',
        registrationFee: '90',
        cargoCount: 2,
      });
      expect(res.body.concurso.timeline).toEqual({
        registrationStart: '2024-03-01T00:00:00.000Z',
        registrationEnd: '2024-03-31T00:00:00.000Z',
        examDate: '2024-06-02T00:00:00.000Z',
        resultDate: '2024-08-01T00:00:00.000Z',
      });
      // Salário desc, sem salário (Técnico) por último; stats zeradas.
      expect(res.body.cargos.map((c: { role: string }) => c.role)).toEqual([
        'Enfermeiro',
        'Técnico de Enfermagem',
      ]);
      expect(res.body.cargos[1]).toMatchObject({
        salaryBase: null,
        userStats: { attemptCount: 0, bestScore: null },
      });
    });

    it('usuário logado: stats da tentativa aparecem no cargo', async () => {
      const res = await asUser(
        request(http).get(`/concursos/${PAST_SLUG}`),
      ).expect(200);

      const enfermeiro = res.body.cargos.find(
        (c: { id: string }) => c.id === enf2024.id,
      );
      expect(enfermeiro.userStats).toEqual({ attemptCount: 1, bestScore: 40 });
    });

    it('ADMIN enxerga também a prova não publicada', async () => {
      const res = await asAdmin(
        request(http).get(`/concursos/${PAST_SLUG}`),
      ).expect(200);

      expect(res.body.concurso.summary.cargoCount).toBe(3);
      const auxiliar = res.body.cargos.find(
        (c: { id: string }) => c.id === aux2024.id,
      );
      expect(auxiliar).toMatchObject({ published: false });
    });

    it('concurso futuro: inscrições abertas hoje → status open', async () => {
      const res = await request(http)
        .get(`/concursos/${futureSlug}`)
        .expect(200);

      expect(res.body.concurso.status).toBe('open');
      expect(res.body.concurso.summary).toMatchObject({
        cargoCount: 1,
        vacancyTotal: 10,
        salaryMax: '9000',
        registrationFee: '100',
      });
    });
  });

  // Listagem/descoberta (MAX-28): agrega ExamBase por instituição+banca+ano.
  // Roda antes do describe de fallback, então só existe o seed do beforeAll:
  // 3 concursos da Prefeitura de Itera (futuro/open, 2024/past, 2021/past).
  describe('GET /concursos (listagem MAX-28)', () => {
    it('anônimo: um card por concurso, ordenados open→past, sem Médico/Auxiliar', async () => {
      const res = await request(http).get('/concursos').expect(200);

      // Médico (irrelevante) e Auxiliar (não publicado) não contam nos cargos.
      expect(res.body.concursos.map((c: { status: string }) => c.status)).toEqual(
        ['open', 'past', 'past'],
      );
      // Dentro de past, examDate desc: 2024 antes de 2021.
      const years = res.body.concursos.map((c: { year: number }) => c.year);
      expect(years[1]).toBe(2024);
      expect(years[2]).toBe(2021);

      const c2024 = res.body.concursos.find(
        (c: { year: number }) => c.year === 2024,
      );
      expect(c2024).toMatchObject({
        slug: PAST_SLUG,
        institution: INSTITUTION,
        cargoCount: 2, // Enfermeiro + Técnico
        vacancyTotal: 70,
        salaryMin: '8500',
        salaryMax: '8500',
        userStats: { attemptedCargos: 0, bestScore: null },
      });

      const open = res.body.concursos.find(
        (c: { status: string }) => c.status === 'open',
      );
      expect(open).toMatchObject({ slug: futureSlug, cargoCount: 1 });
    });

    it('ADMIN enxerga a prova não publicada no cargoCount', async () => {
      const res = await asAdmin(request(http).get('/concursos')).expect(200);
      const c2024 = res.body.concursos.find(
        (c: { year: number }) => c.year === 2024,
      );
      expect(c2024.cargoCount).toBe(3); // + Auxiliar não publicado
    });

    it('usuário logado: userStats agregado do concurso (tentativa de 2024)', async () => {
      const res = await asUser(request(http).get('/concursos')).expect(200);
      const c2024 = res.body.concursos.find(
        (c: { year: number }) => c.year === 2024,
      );
      expect(c2024.userStats).toEqual({ attemptedCargos: 1, bestScore: 40 });
    });

    it('filtro status=open retorna só o concurso futuro', async () => {
      const res = await request(http).get('/concursos?status=open').expect(200);
      expect(res.body.concursos).toHaveLength(1);
      expect(res.body.concursos[0].slug).toBe(futureSlug);
    });

    it('busca q filtra por instituição (e zera sem match)', async () => {
      const hit = await request(http).get('/concursos?q=itera').expect(200);
      expect(hit.body.concursos.length).toBeGreaterThanOrEqual(3);

      const miss = await request(http)
        .get('/concursos?q=instituicao-inexistente')
        .expect(200);
      expect(miss.body.concursos).toHaveLength(0);
    });
  });

  // Entrada 1-clique do /exams (MAX-25): um UUID de prova também resolve a
  // página do concurso, criando o vínculo lazy na hora se preciso.
  describe('GET /concursos/:id — fallback por id de prova (MAX-25)', () => {
    it('UUID de prova com concurso já criado resolve para o mesmo payload do slug', async () => {
      const res = await request(http)
        .get(`/concursos/${enf2024.id}`)
        .expect(200);
      expect(res.body.concurso.slug).toBe(PAST_SLUG);
    });

    it('UUID de prova ainda sem concurso cria o vínculo na leitura', async () => {
      const nova = await createExamBase(prisma, {
        institution: 'Hospital Alfa',
        role: 'Enfermeiro',
        slug: 'hospital-alfa-2024-enfermeiro',
        examDate: new Date('2024-09-01T00:00:00.000Z'),
      });

      const res = await request(http)
        .get(`/concursos/${nova.id}`)
        .expect(200);
      expect(res.body.concurso.institution).toBe('Hospital Alfa');
      expect(
        res.body.cargos.map((c: { id: string }) => c.id),
      ).toContain(nova.id);

      const linked = await prisma.examBase.findUniqueOrThrow({
        where: { id: nova.id },
        select: { concursoId: true },
      });
      expect(linked.concursoId).toBe(res.body.concurso.id);
    });

    it('prova sem instituição → 404 (não há chave de agrupamento)', async () => {
      const semInstituicao = await createExamBase(prisma, {
        role: 'Enfermeiro',
        slug: 'sem-instituicao-2024-enfermeiro',
      });
      await request(http).get(`/concursos/${semInstituicao.id}`).expect(404);
    });

    it('prova não publicada: 404 anônimo, 200 para ADMIN', async () => {
      await request(http).get(`/concursos/${aux2024.id}`).expect(404);

      const res = await asAdmin(
        request(http).get(`/concursos/${aux2024.id}`),
      ).expect(200);
      expect(res.body.concurso.slug).toBe(PAST_SLUG);
    });
  });

  describe('GET /concursos/:slug/cargos/:cargoSlug (nível 2)', () => {
    it('cargo passado: ficha completa, syllabus oculto, previousExams com 1 item', async () => {
      const res = await request(http)
        .get(`/concursos/${PAST_SLUG}/cargos/pref-itera-2024-enfermeiro`)
        .expect(200);

      expect(res.body.cargo).toMatchObject({
        id: enf2024.id,
        role: 'Enfermeiro',
        salaryBase: '8500',
        workload: '40h semanais',
        requirements: 'Superior em Enfermagem + COREN',
        registrationFee: '90',
        minPassingGrade: '60',
        questionCount: 20,
      });
      // Prova já aplicada → conteúdo programático some, mesmo cadastrado.
      expect(res.body.syllabusGroups).toEqual([]);
      expect(res.body.previousExams).toEqual([
        {
          examBaseId: enf2021.id,
          slug: 'pref-itera-2021-enfermeiro',
          year: 2021,
          questionCount: 10,
          userStats: { attemptCount: 0, bestScore: null },
        },
      ]);
      // Anônimo → plano zerado em diagnóstico.
      expect(res.body.studyPlan).toEqual({
        currentStep: 'diagnostico',
        attemptCount: 0,
        bestScore: null,
        scoreDelta: null,
        weakSubjects: [],
      });
    });

    it('usuário logado: studyPlan sobre a própria prova, abaixo do corte → treino_dirigido + weakSubjects com mínimo de respostas', async () => {
      const res = await asUser(
        request(http).get(
          `/concursos/${PAST_SLUG}/cargos/pref-itera-2024-enfermeiro`,
        ),
      ).expect(200);

      expect(res.body.studyPlan).toEqual({
        currentStep: 'treino_dirigido',
        attemptCount: 1,
        bestScore: 40,
        scoreDelta: 0,
        // Fundamentos teve só 4 respostas (< 5) → fica fora da lista.
        weakSubjects: [{ subject: 'Saúde Coletiva / SUS', accuracy: 60 }],
      });
    });

    it('cargo futuro: syllabus visível e ordenado, previousExams = edições 2024 e 2021, plano computado sobre elas', async () => {
      const res = await asUser(
        request(http).get(
          `/concursos/${futureSlug}/cargos/pref-itera-futuro-enfermeiro`,
        ),
      ).expect(200);

      expect(res.body.concurso.status).toBe('open');
      expect(res.body.syllabusGroups).toEqual([
        {
          name: 'Saúde Coletiva e SUS',
          topics: 'Lei 8.080; Política Nacional',
          order: 0,
        },
        {
          name: 'Fundamentos de Enfermagem',
          topics: 'Semiologia; Biossegurança',
          order: 1,
        },
      ]);
      expect(
        res.body.previousExams.map((p: { year: number }) => p.year),
      ).toEqual([2024, 2021]);
      // Prova futura sem questões → plano sobre as edições anteriores, onde
      // o usuário tem a tentativa de score 40 (corte default 60).
      expect(res.body.studyPlan).toMatchObject({
        currentStep: 'treino_dirigido',
        attemptCount: 1,
        bestScore: 40,
      });
    });

    it('cargo irrelevante para enfermagem (Médico) → 404 mesmo publicado', async () => {
      await request(http)
        .get(`/concursos/${PAST_SLUG}/cargos/pref-itera-2024-medico`)
        .expect(404);
    });

    it('cargo não publicado: 404 para usuário comum, 200 para ADMIN', async () => {
      await asUser(
        request(http).get(
          `/concursos/${PAST_SLUG}/cargos/pref-itera-2024-auxiliar`,
        ),
      ).expect(404);

      const res = await asAdmin(
        request(http).get(
          `/concursos/${PAST_SLUG}/cargos/pref-itera-2024-auxiliar`,
        ),
      ).expect(200);
      expect(res.body.cargo).toMatchObject({
        id: aux2024.id,
        published: false,
      });
    });
  });

  describe('GET /exam-bases/:id/subject-distribution', () => {
    it('prova passada → mode actual; sem matéria >5% vira "Outros"; soma = total', async () => {
      const res = await request(http)
        .get(`/exam-bases/${enf2024.id}/subject-distribution`)
        .expect(200);

      expect(res.body.mode).toBe('actual');
      expect(res.body.sourceExams).toEqual([
        { examBaseId: enf2024.id, year: 2024 },
      ]);
      expect(res.body.totalQuestions).toBe(20);
      expect(res.body.subjects).toEqual([
        {
          subject: 'Saúde Coletiva / SUS',
          count: 10,
          share: 0.5,
          userAccuracy: null,
        },
        {
          subject: 'Fundamentos de Enfermagem',
          count: 8,
          share: 0.4,
          userAccuracy: null,
        },
        { subject: 'Outros', count: 2, share: 0.1, userAccuracy: null },
      ]);
      expect(res.body.insight).toEqual({
        topSubjects: ['Saúde Coletiva / SUS'],
        topShare: 0.5,
        weakestRelevant: null,
      });
    });

    it('usuário logado: acurácia por matéria com mínimo de 5 respostas; weakestRelevant', async () => {
      const res = await asUser(
        request(http).get(`/exam-bases/${enf2024.id}/subject-distribution`),
      ).expect(200);

      const bySubject = new Map(
        res.body.subjects.map(
          (s: { subject: string; userAccuracy: number | null }) => [
            s.subject,
            s.userAccuracy,
          ],
        ),
      );
      expect(bySubject.get('Saúde Coletiva / SUS')).toBeCloseTo(0.6);
      expect(bySubject.get('Fundamentos de Enfermagem')).toBeNull();
      expect(res.body.insight.weakestRelevant).toEqual({
        subject: 'Saúde Coletiva / SUS',
        accuracy: 0.6,
      });
    });

    it('prova futura → mode historical: união das edições 2024+2021', async () => {
      const res = await request(http)
        .get(`/exam-bases/${enfFuturo.id}/subject-distribution`)
        .expect(200);

      expect(res.body.mode).toBe('historical');
      expect(res.body.sourceExams).toEqual([
        { examBaseId: enf2024.id, year: 2024 },
        { examBaseId: enf2021.id, year: 2021 },
      ]);
      // 16 SUS + 8 Fundamentos + 4 Ética + 2 sem matéria (6,7% > 5% → Outros).
      expect(res.body.totalQuestions).toBe(30);
      expect(
        res.body.subjects.map((s: { subject: string; count: number }) => [
          s.subject,
          s.count,
        ]),
      ).toEqual([
        ['Saúde Coletiva / SUS', 16],
        ['Fundamentos de Enfermagem', 8],
        ['Ética Profissional', 4],
        ['Outros', 2],
      ]);
    });

    it('prova não publicada: 404 anônimo, 200 para ADMIN', async () => {
      await request(http)
        .get(`/exam-bases/${aux2024.id}/subject-distribution`)
        .expect(404);
      await asAdmin(
        request(http).get(`/exam-bases/${aux2024.id}/subject-distribution`),
      ).expect(200);
    });
  });

  describe('GET /exam-bases/:id/competition-history', () => {
    it('cargo de 2024 → 1 edição (2021) com candidatos/vaga e notas honestas', async () => {
      const res = await request(http)
        .get(`/exam-bases/${enf2024.id}/competition-history`)
        .expect(200);

      expect(res.body.editions).toEqual([
        {
          examBaseId: enf2021.id,
          year: 2021,
          applicantCount: 1786,
          vacancyCount: 20,
          perVacancy: 89, // 1786 / 20 = 89,3 → 89
          minPassingGrade: '60',
          actualCutScore: null,
        },
      ]);
    });

    it('cargo sem edições anteriores → editions: [] (não 404)', async () => {
      const res = await request(http)
        .get(`/exam-bases/${tec2024.id}/competition-history`)
        .expect(200);
      expect(res.body).toEqual({ editions: [] });
    });
  });
});

/**
 * Cargo com múltiplas provas (tipos) sob o mesmo cargoGroupId: cada prova é um
 * ExamBase com banco próprio. Describe isolado (app/seed próprios) para não
 * interferir nas contagens exatas do seed compartilhado acima.
 */
describe('Cargo com múltiplas provas (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;
  let user: { id: string };
  let primaria: { id: string; slug: string | null };
  let secundaria: { id: string; slug: string | null };
  let secQuestions: SeededQuestion[];
  let tier1Related: { id: string };
  let tier2Related: { id: string };
  let futura: { id: string };

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);

    const board = await createExamBoard(prisma);
    const otherBoard = await createExamBoard(prisma, {
      name: 'Outra Banca e2e',
      alias: 'OUTRA',
    });
    user = await createUser(prisma);
    const groupId = randomUUID();
    const shared = {
      institution: 'Prefeitura Multi e2e',
      examBoardId: board.id,
      role: 'Enfermeiro',
      salaryBase: 8000,
      vacancyCount: 15,
      examDate: new Date('2024-06-02T00:00:00.000Z'),
      cargoGroupId: groupId,
    };
    primaria = await createExamBase(prisma, {
      ...shared,
      slug: 'multi-enfermeiro-tipo-1',
      provaLabel: 'Tipo 1',
      isPrimaryProva: true,
    });
    secundaria = await createExamBase(prisma, {
      ...shared,
      slug: 'multi-enfermeiro-tipo-2',
      provaLabel: 'Tipo 2',
      isPrimaryProva: false,
    });
    await addQuestions(prisma, primaria.id, [{ subject: 'SUS', count: 5 }]);
    secQuestions = await addQuestions(prisma, secundaria.id, [
      { subject: 'SUS', count: 3 },
    ]);

    // Relacionada tier 1: mesma banca + mesmo cargo, outra instituição/edição.
    tier1Related = await createExamBase(prisma, {
      examBoardId: board.id,
      role: 'Enfermeiro',
      institution: 'Prefeitura Vizinha e2e',
      examDate: new Date('2023-05-01T00:00:00.000Z'),
      slug: 'related-tier1-enfermeiro',
    });
    await addQuestions(prisma, tier1Related.id, [{ subject: 'SUS', count: 4 }]);
    // Relacionada tier 2: mesmo cargo, OUTRA banca.
    tier2Related = await createExamBase(prisma, {
      examBoardId: otherBoard.id,
      role: 'Enfermeiro',
      institution: 'Prefeitura Distante e2e',
      examDate: new Date('2022-05-01T00:00:00.000Z'),
      slug: 'related-tier2-enfermeiro',
    });
    await addQuestions(prisma, tier2Related.id, [{ subject: 'SUS', count: 2 }]);
    // Cargo FUTURO sem questões próprias (deve recomendar só as relacionadas).
    futura = await createExamBase(prisma, {
      examBoardId: board.id,
      role: 'Enfermeiro',
      institution: 'Prefeitura Futura e2e',
      examDate: new Date('2099-01-01T00:00:00.000Z'),
      slug: 'futura-enfermeiro',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /concursos: um card por cargo (grupo), questionCount somado, vaga não duplicada', async () => {
    // Fallback por id de prova resolve/cria o concurso na leitura.
    const res = await request(http).get(`/concursos/${primaria.id}`).expect(200);

    expect(res.body.cargos).toHaveLength(1);
    expect(res.body.cargos[0]).toMatchObject({
      role: 'Enfermeiro',
      provaCount: 2,
      questionCount: 8, // 5 + 3
    });
    expect(res.body.concurso.summary).toMatchObject({
      cargoCount: 1,
      vacancyTotal: 15, // não conta a vaga uma vez por tipo
    });
  });

  it('GET /concursos/:slug/cargos/:cargoSlug: provas[] com os dois tipos (primária primeiro)', async () => {
    const detail = await request(http)
      .get(`/concursos/${primaria.id}`)
      .expect(200);
    const slug = detail.body.concurso.slug as string;
    const cargoSlug = detail.body.cargos[0].slug as string;

    const res = await request(http)
      .get(`/concursos/${slug}/cargos/${cargoSlug}`)
      .expect(200);

    expect(res.body.provas).toHaveLength(2);
    expect(res.body.provas[0].isPrimary).toBe(true);
    expect(res.body.provas.map((p: { label: string }) => p.label)).toEqual([
      'Tipo 1',
      'Tipo 2',
    ]);
    // Cada prova carrega seu próprio plano de estudos (o seletor re-escopa).
    expect(res.body.provas[0].studyPlan).toMatchObject({
      currentStep: 'diagnostico',
    });
    expect(res.body.provas[1].studyPlan.currentStep).toBeDefined();
    expect(
      res.body.provas
        .map((p: { questionCount: number }) => p.questionCount)
        .sort(),
    ).toEqual([3, 5]);
  });

  it('provas[] traz userStats por prova: tentativa numa prova não afeta a outra', async () => {
    // Tentativa finalizada só na prova secundária (80%).
    await createFinishedAttempt(prisma, {
      userId: user.id,
      examBaseId: secundaria.id,
      scorePercentage: 80,
      answers: secQuestions.map((question) => ({ question, correct: true })),
    });

    const detail = await request(http)
      .get(`/concursos/${primaria.id}`)
      .expect(200);
    const slug = detail.body.concurso.slug as string;
    const cargoSlug = detail.body.cargos[0].slug as string;

    const res = await request(http)
      .get(`/concursos/${slug}/cargos/${cargoSlug}`)
      .set(TEST_USER_HEADER, user.id)
      .expect(200);

    const byLabel = Object.fromEntries(
      res.body.provas.map((p: { label: string; userStats: unknown }) => [
        p.label,
        p.userStats,
      ]),
    );
    expect(byLabel['Tipo 2']).toEqual({ attemptCount: 1, bestScore: 80 });
    expect(byLabel['Tipo 1']).toEqual({ attemptCount: 0, bestScore: null });
  });

  it('relatedProvas: mesma banca (tier 1) antes de outra banca (tier 2), sem o próprio grupo', async () => {
    const detail = await request(http)
      .get(`/concursos/${primaria.id}`)
      .expect(200);
    const slug = detail.body.concurso.slug as string;
    const cargoSlug = detail.body.cargos[0].slug as string;

    const res = await request(http)
      .get(`/concursos/${slug}/cargos/${cargoSlug}`)
      .expect(200);

    const related = res.body.relatedProvas as Array<{
      examBaseId: string;
      tier: number;
      studyPlan: { currentStep: string };
    }>;
    const ids = related.map((p) => p.examBaseId);
    // Inclui as duas relacionadas; NÃO inclui as provas do próprio grupo.
    expect(ids).toContain(tier1Related.id);
    expect(ids).toContain(tier2Related.id);
    expect(ids).not.toContain(primaria.id);
    expect(ids).not.toContain(secundaria.id);
    // tier 1 antes de tier 2.
    expect(related.findIndex((p) => p.examBaseId === tier1Related.id)).toBeLessThan(
      related.findIndex((p) => p.examBaseId === tier2Related.id),
    );
    // Cada relacionada tem seu próprio plano de estudos.
    expect(related[0].studyPlan.currentStep).toBeDefined();
  });

  it('cargo futuro sem questões próprias: recomenda só as relacionadas', async () => {
    const detail = await request(http)
      .get(`/concursos/${futura.id}`)
      .expect(200);
    const slug = detail.body.concurso.slug as string;
    const cargoSlug = (detail.body.cargos as Array<{ id: string; slug: string }>).find(
      (c) => c.id === futura.id,
    )!.slug;

    const res = await request(http)
      .get(`/concursos/${slug}/cargos/${cargoSlug}`)
      .expect(200);

    // A própria prova (futura) não tem questões…
    expect(res.body.provas).toHaveLength(1);
    expect(res.body.provas[0].questionCount).toBe(0);
    // …mas há relacionadas (mesma banca/cargo) para treinar.
    expect(res.body.relatedProvas.length).toBeGreaterThan(0);
    expect(
      res.body.relatedProvas.map((p: { examBaseId: string }) => p.examBaseId),
    ).toContain(tier1Related.id);
  });
});
