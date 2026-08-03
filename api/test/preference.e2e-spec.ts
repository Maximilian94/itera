import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, TEST_USER_HEADER } from './create-app';
import { createUser, truncateAll } from './factories';

/**
 * E2E do perfil de preferências (GET/PUT /preferences): recurso 1:1 do usuário
 * autenticado, upsert de documento completo. O matching que ele alimenta é
 * coberto em concurso.e2e-spec.ts (GET /concursos → match).
 */
describe('Preference endpoints (e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;
  let user: { id: string };

  const asUser = (req: request.Test) => req.set(TEST_USER_HEADER, user.id);

  const validBody = {
    state: 'SP',
    city: 'Campinas',
    mobility: 'MAX_1H',
    careerStage: 'COREN_REGISTERED',
    minSalary: 3500,
    horizon: 'ASAP',
  };

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);
    user = await createUser(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exige autenticação → 401 anônimo (GET e PUT)', async () => {
    await request(http).get('/preferences').expect(401);
    await request(http).put('/preferences').send(validBody).expect(401);
  });

  it('GET sem perfil → { preference: null }', async () => {
    const res = await asUser(request(http).get('/preferences')).expect(200);
    expect(res.body).toEqual({ preference: null });
  });

  it('PUT cria o perfil e GET o devolve (minSalary serializado como string)', async () => {
    const put = await asUser(request(http).put('/preferences'))
      .send(validBody)
      .expect(200);
    expect(put.body.preference).toMatchObject({
      state: 'SP',
      city: 'Campinas',
      mobility: 'MAX_1H',
      careerStage: 'COREN_REGISTERED',
      minSalary: '3500',
      horizon: 'ASAP',
    });

    const get = await asUser(request(http).get('/preferences')).expect(200);
    expect(get.body.preference).toMatchObject({ city: 'Campinas' });
  });

  it('PUT de novo atualiza (upsert) e limpa minSalary quando ausente', async () => {
    const res = await asUser(request(http).put('/preferences'))
      .send({ ...validBody, city: 'Santos', minSalary: undefined })
      .expect(200);
    expect(res.body.preference).toMatchObject({
      city: 'Santos',
      mobility: 'MAX_1H',
      minSalary: null,
    });

    const rows = await prisma.userPreference.findMany({
      where: { userId: user.id },
    });
    expect(rows).toHaveLength(1);
  });

  it('escopo STATE mantém a UF e derruba a cidade; ANYWHERE derruba a âncora toda', async () => {
    const estado = await asUser(request(http).put('/preferences'))
      .send({ ...validBody, state: 'sp', city: undefined, mobility: 'STATE' })
      .expect(200);
    expect(estado.body.preference).toMatchObject({
      state: 'SP',
      city: null,
      mobility: 'STATE',
    });

    const brasil = await asUser(request(http).put('/preferences'))
      .send({
        mobility: 'ANYWHERE',
        careerStage: 'COREN_REGISTERED',
        horizon: 'ASAP',
      })
      .expect(200);
    expect(brasil.body.preference).toMatchObject({
      state: null,
      city: null,
      mobility: 'ANYWHERE',
    });
  });

  it('âncora condicional: 400 sem cidade em escopo de raio e sem UF em escopo estado', async () => {
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, city: undefined })
      .expect(400);
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, state: undefined, city: undefined, mobility: 'STATE' })
      .expect(400);
  });

  it('400 para enum inválido, salário negativo, UF longa e campo extra', async () => {
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, mobility: 'TELEPORT' })
      .expect(400);
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, minSalary: -1 })
      .expect(400);
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, state: 'SAO' })
      .expect(400);
    // forbidNonWhitelisted: o front manda só os campos do DTO.
    await asUser(request(http).put('/preferences'))
      .send({ ...validBody, id: 'hack' })
      .expect(400);
  });
});
