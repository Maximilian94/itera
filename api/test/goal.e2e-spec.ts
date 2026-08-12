import { INestApplication } from '@nestjs/common';
import { GovernmentScope } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, TEST_USER_HEADER } from './create-app';
import { createExamBase, createUser, truncateAll } from './factories';

/**
 * E2E das metas de estudo (GET/POST/DELETE /goals): vínculo durável
 * usuário↔cargo que ancora a home. Cobre resolução de identidade (Cargo.slug e
 * ExamBase fallback), idempotência, arquivar/desarquivar e o backfill lazy a
 * partir de treinos em andamento.
 */
describe('Goal endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;
  let user: { id: string };

  let concursoId: string;
  let cargoId: string;
  let provaId: string;

  const asUser = (req: request.Test) => req.set(TEST_USER_HEADER, user.id);

  /** Concurso + cargo (corte 60) + prova oficial vinculada por CargoProva. */
  async function seedCargo() {
    const concurso = await prisma.concurso.create({
      data: {
        slug: 'pref-itera-2026',
        institution: 'Prefeitura de Itera',
        year: 2026,
        governmentScope: GovernmentScope.MUNICIPAL,
        state: 'SP',
        city: 'Itera',
        examDate: new Date('2026-09-20T00:00:00.000Z'),
      },
    });
    const cargo = await prisma.cargo.create({
      data: {
        slug: 'enfermeiro-itera',
        role: 'Enfermeiro',
        minPassingGradeNonQuota: 60,
        concursoId: concurso.id,
      },
    });
    const prova = await createExamBase(prisma, {
      slug: 'prova-enfermeiro-itera',
      concursoId: concurso.id,
      examDate: new Date('2026-09-20T00:00:00.000Z'),
    });
    await prisma.cargoProva.create({
      data: { cargoId: cargo.id, examBaseId: prova.id, isOficial: true },
    });
    return { concursoId: concurso.id, cargoId: cargo.id, provaId: prova.id };
  }

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);
    user = await createUser(prisma);
    ({ concursoId, cargoId, provaId } = await seedCargo());
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige autenticação → 401 anônimo', async () => {
    await request(http).get('/goals').expect(401);
    await request(http)
      .post('/goals')
      .send({ cargoSlug: 'enfermeiro-itera' })
      .expect(401);
  });

  it('GET sem metas → { goals: [] }', async () => {
    const res = await asUser(request(http).get('/goals')).expect(200);
    expect(res.body).toEqual({ goals: [] });
  });

  it('POST por Cargo.slug cria a meta com concurso, corte e data da prova', async () => {
    const res = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'enfermeiro-itera' })
      .expect(201);
    expect(res.body.goal).toMatchObject({
      concurso: {
        id: concursoId,
        slug: 'pref-itera-2026',
        institution: 'Prefeitura de Itera',
        year: 2026,
      },
      cargo: { id: cargoId, slug: 'enfermeiro-itera', role: 'Enfermeiro', minPassingGrade: 60 },
      examDate: '2026-09-20T00:00:00.000Z',
      provaExamBaseIds: [provaId],
      oficialExamBaseId: provaId,
      stats: { attemptCount: 0, bestScore: null },
    });

    const list = await asUser(request(http).get('/goals')).expect(200);
    expect(list.body.goals).toHaveLength(1);
  });

  it('POST é idempotente e aceita ExamBase.slug como fallback (mesmo goal)', async () => {
    const bySlug = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'enfermeiro-itera' })
      .expect(201);
    const byProva = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'prova-enfermeiro-itera' })
      .expect(201);
    expect(byProva.body.goal.id).toBe(bySlug.body.goal.id);

    const list = await asUser(request(http).get('/goals')).expect(200);
    expect(list.body.goals).toHaveLength(1);
  });

  it('POST por Concurso.slug/id cria a meta no cargo representante (meta a partir do concurso)', async () => {
    const bySlug = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'pref-itera-2026' })
      .expect(201);
    expect(bySlug.body.goal.cargo.id).toBe(cargoId);
    expect(bySlug.body.goal.concurso.slug).toBe('pref-itera-2026');

    // Mesmo cargo representante por Concurso.id → mesma meta (idempotente).
    const byId = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: concursoId })
      .expect(201);
    expect(byId.body.goal.id).toBe(bySlug.body.goal.id);
    expect(byId.body.goal.cargo.id).toBe(cargoId);
  });

  it('POST com cargo inexistente → 404', async () => {
    await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'nao-existe' })
      .expect(404);
  });

  it('stats agregam tentativas finalizadas das provas do cargo', async () => {
    await prisma.examBaseAttempt.create({
      data: {
        userId: user.id,
        examBaseId: provaId,
        finishedAt: new Date(),
        scorePercentage: 62,
      },
    });
    await prisma.examBaseAttempt.create({
      data: {
        userId: user.id,
        examBaseId: provaId,
        finishedAt: new Date(),
        scorePercentage: 55,
      },
    });
    // Tentativa em andamento não conta.
    await prisma.examBaseAttempt.create({
      data: { userId: user.id, examBaseId: provaId },
    });

    const list = await asUser(request(http).get('/goals')).expect(200);
    expect(list.body.goals[0].stats).toEqual({
      attemptCount: 2,
      bestScore: 62,
    });
  });

  it('DELETE arquiva ("parar de treinar") e POST desarquiva a mesma linha', async () => {
    const list = await asUser(request(http).get('/goals')).expect(200);
    const goalId = list.body.goals[0].id;

    await asUser(request(http).delete(`/goals/${goalId}`)).expect(200);
    const after = await asUser(request(http).get('/goals')).expect(200);
    expect(after.body.goals).toEqual([]);

    const again = await asUser(request(http).post('/goals'))
      .send({ cargoSlug: 'enfermeiro-itera' })
      .expect(201);
    expect(again.body.goal.id).toBe(goalId);
  });

  it('DELETE de meta de outro usuário → 404', async () => {
    const list = await asUser(request(http).get('/goals')).expect(200);
    const goalId = list.body.goals[0].id;
    const other = await createUser(prisma);
    await request(http)
      .delete(`/goals/${goalId}`)
      .set(TEST_USER_HEADER, other.id)
      .expect(404);
  });

  describe('backfill lazy a partir de treinos em andamento', () => {
    let trainee: { id: string };

    async function startTraining(userId: string, examBaseId: string) {
      const attempt = await prisma.examBaseAttempt.create({
        data: { userId, examBaseId },
      });
      return prisma.trainingSession.create({
        data: {
          userId,
          examBaseAttemptId: attempt.id,
          examBaseId,
          currentStage: 'EXAM',
        },
      });
    }

    beforeAll(async () => {
      trainee = await createUser(prisma);
    });

    it('treino ativo sem meta → GET /goals cria a meta do cargo', async () => {
      await startTraining(trainee.id, provaId);
      const res = await request(http)
        .get('/goals')
        .set(TEST_USER_HEADER, trainee.id)
        .expect(200);
      expect(res.body.goals).toHaveLength(1);
      expect(res.body.goals[0].cargo.id).toBe(cargoId);
    });

    it('meta arquivada NÃO ressuscita pelo backfill (treino segue ativo)', async () => {
      const res = await request(http)
        .get('/goals')
        .set(TEST_USER_HEADER, trainee.id)
        .expect(200);
      const goalId = res.body.goals[0].id;
      await request(http)
        .delete(`/goals/${goalId}`)
        .set(TEST_USER_HEADER, trainee.id)
        .expect(200);

      const after = await request(http)
        .get('/goals')
        .set(TEST_USER_HEADER, trainee.id)
        .expect(200);
      expect(after.body.goals).toEqual([]);
    });
  });
});
