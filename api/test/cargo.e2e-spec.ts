import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, TEST_USER_HEADER } from './create-app';
import {
  addQuestions,
  createExamBoard,
  createFinishedAttempt,
  createUser,
  truncateAll,
} from './factories';

/**
 * E2E da gestão ADMIN de cargos (remodelagem Cargo↔Prova, R4.1) contra
 * Postgres real — exercita inclusive o unique parcial
 * `cargo_provas_one_oficial_per_cargo`.
 *
 * Fluxo coberto: criar prova pelo wizard → Cargo default 1:1 nasce com
 * Concurso eager; compartilhar prova entre 2 cargos do mesmo concurso (caso
 * Recife); invariantes (1 oficial por cargo, cross-concurso proibido,
 * desvincular oficial → 400) e o dual-write das colunas legadas.
 */

const INSTITUTION = 'Prefeitura de Recife';

describe('Cargos (admin, e2e)', () => {
  let app: INestApplication<App>;
  let http: App;
  let prisma: PrismaService;

  let admin: { id: string };
  let user: { id: string };
  let board: { id: string };

  /** Provas criadas pelo wizard: Enfermeiro Geral e Enfermeiro Pediatra. */
  let provaGeral: string;
  let provaPediatra: string;
  /** Cargo default = id da prova (determinístico, como o backfill). */
  const cargoOf = (provaId: string) => provaId;

  const asAdmin = (req: request.Test) => req.set(TEST_USER_HEADER, admin.id);
  const asUser = (req: request.Test) => req.set(TEST_USER_HEADER, user.id);

  beforeAll(async () => {
    app = await createTestApp();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);
    await truncateAll(prisma);

    admin = await createUser(prisma, { role: UserRole.ADMIN });
    user = await createUser(prisma);
    board = await createExamBoard(prisma);

    const geral = await asAdmin(request(http).post('/exam-bases'))
      .send({
        name: 'Concurso Recife 2026 — Enfermeiro Geral',
        role: 'Enfermeiro Geral',
        institution: INSTITUTION,
        governmentScope: 'MUNICIPAL',
        state: 'PE',
        city: 'Recife',
        examDate: '2026-09-20T00:00:00.000Z',
        examBoardId: board.id,
        salaryBase: '7500.00',
      })
      .expect(201);
    provaGeral = (geral.body as { id: string }).id;

    const pediatra = await asAdmin(request(http).post('/exam-bases'))
      .send({
        name: 'Concurso Recife 2026 — Enfermeiro Pediatra',
        role: 'Enfermeiro Pediatra',
        institution: INSTITUTION,
        governmentScope: 'MUNICIPAL',
        state: 'PE',
        city: 'Recife',
        examDate: '2026-09-20T00:00:00.000Z',
        examBoardId: board.id,
        salaryBase: '8200.00',
      })
      .expect(201);
    provaPediatra = (pediatra.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('criar prova pelo wizard cria Cargo default 1:1 com Concurso eager', async () => {
    const cargo = await prisma.cargo.findUniqueOrThrow({
      where: { id: cargoOf(provaGeral) },
      include: { provas: true, concurso: true },
    });

    expect(cargo.role).toBe('Enfermeiro Geral');
    expect(String(cargo.salaryBase)).toBe('7500');
    expect(cargo.concurso.institution).toBe(INSTITUTION);
    expect(cargo.concurso.year).toBe(2026);
    expect(cargo.provas).toHaveLength(1);
    expect(cargo.provas[0]).toMatchObject({
      examBaseId: provaGeral,
      isOficial: true,
    });

    // Os dois cargos caem no MESMO concurso (mesma tupla institution+ano+banca).
    const other = await prisma.cargo.findUniqueOrThrow({
      where: { id: cargoOf(provaPediatra) },
    });
    expect(other.concursoId).toBe(cargo.concursoId);
  });

  it('endpoints de cargo exigem ADMIN (usuário comum → 403)', async () => {
    await asUser(request(http).get('/cargos')).expect(403);
    await asUser(
      request(http).post(
        `/cargos/${cargoOf(provaGeral)}/provas/${provaPediatra}`,
      ),
    ).expect(403);
  });

  it('caso Recife: compartilhar a prova do Geral com o cargo Pediatra (2 cliques)', async () => {
    const res = await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaGeral}`,
      ),
    )
      .send({ provaLabel: 'Prova comum' })
      .expect(201);

    const provas = (res.body as {
      provas: Array<{ examBaseId: string; isOficial: boolean; provaLabel: string | null }>;
    }).provas;
    expect(provas).toHaveLength(2);
    // A prova própria do Pediatra segue oficial; a compartilhada entra como extra.
    expect(provas.find((p) => p.examBaseId === provaPediatra)?.isOficial).toBe(true);
    expect(provas.find((p) => p.examBaseId === provaGeral)).toMatchObject({
      isOficial: false,
      provaLabel: 'Prova comum',
    });

    // A prova compartilhada continua vinculada ao cargo original também (M:N).
    const links = await prisma.cargoProva.findMany({
      where: { examBaseId: provaGeral },
    });
    expect(links.map((l) => l.cargoId).sort()).toEqual(
      [cargoOf(provaGeral), cargoOf(provaPediatra)].sort(),
    );
  });

  it('vincular a mesma prova de novo → 400', async () => {
    await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaGeral}`,
      ),
    ).expect(400);
  });

  it('prova de OUTRO concurso → 400 (mesmo edital apenas)', async () => {
    const alien = await asAdmin(request(http).post('/exam-bases'))
      .send({
        name: 'Concurso Olinda 2026 — Enfermeiro',
        role: 'Enfermeiro',
        institution: 'Prefeitura de Olinda',
        governmentScope: 'MUNICIPAL',
        state: 'PE',
        city: 'Olinda',
        examDate: '2026-10-04T00:00:00.000Z',
        examBoardId: board.id,
      })
      .expect(201);

    await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaGeral)}/provas/${(alien.body as { id: string }).id}`,
      ),
    ).expect(400);
  });

  it('setOficial troca a oficial em transação e espelha o legado', async () => {
    const res = await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaGeral}/oficial`,
      ),
    ).expect(201);

    const provas = (res.body as {
      provas: Array<{ examBaseId: string; isOficial: boolean }>;
    }).provas;
    expect(provas.find((p) => p.examBaseId === provaGeral)?.isOficial).toBe(true);
    expect(provas.find((p) => p.examBaseId === provaPediatra)?.isOficial).toBe(
      false,
    );

    // Exatamente 1 oficial no banco (o unique parcial é o backstop).
    const oficiais = await prisma.cargoProva.count({
      where: { cargoId: cargoOf(provaPediatra), isOficial: true },
    });
    expect(oficiais).toBe(1);

    // Volta: a prova própria do Pediatra reassume como oficial.
    await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaPediatra}/oficial`,
      ),
    ).expect(201);
  });

  it('desvincular a prova OFICIAL → 400; a não-oficial desvincula', async () => {
    await asAdmin(
      request(http).delete(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaPediatra}`,
      ),
    ).expect(400);

    const res = await asAdmin(
      request(http).delete(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaGeral}`,
      ),
    ).expect(200);
    expect(
      (res.body as { provas: Array<unknown> }).provas,
    ).toHaveLength(1);
  });

  it('PATCH da ficha do cargo espelha as colunas legadas da prova oficial', async () => {
    await asAdmin(request(http).patch(`/cargos/${cargoOf(provaGeral)}`))
      .send({ salaryBase: '9100.00', vacancyCount: 25 })
      .expect(200);

    const prova = await prisma.examBase.findUniqueOrThrow({
      where: { id: provaGeral },
      select: { salaryBase: true, vacancyCount: true },
    });
    expect(String(prova.salaryBase)).toBe('9100');
    expect(prova.vacancyCount).toBe(25);
  });

  it('R4.2: prova compartilhada aparece nos DOIS cargos com o mesmo questionCount; treino de um reflete prontidão no outro', async () => {
    // Recompartilha a prova do Geral com o Pediatra e dá questões a ela.
    await asAdmin(
      request(http).post(
        `/cargos/${cargoOf(provaPediatra)}/provas/${provaGeral}`,
      ),
    ).expect(201);
    const questions = await addQuestions(prisma, provaGeral, [
      { subject: 'SUS', count: 6 },
    ]);
    // O usuário treina a prova compartilhada (nota 50).
    await createFinishedAttempt(prisma, {
      userId: user.id,
      examBaseId: provaGeral,
      scorePercentage: 50,
      answers: questions.map((q, i) => ({ question: q, correct: i % 2 === 0 })),
    });

    // Provas do wizard nascem despublicadas; publica para a leitura de user.
    await prisma.examBase.updateMany({
      where: { id: { in: [provaGeral, provaPediatra] } },
      data: { published: true },
    });
    const cargoGeral = await prisma.cargo.findUniqueOrThrow({
      where: { id: cargoOf(provaGeral) },
      select: { concurso: { select: { slug: true, id: true } } },
    });
    const concursoRef = cargoGeral.concurso.slug ?? cargoGeral.concurso.id;

    // Cargos por UUID (o slug do cargo default segue o da prova, que o wizard
    // ainda não gerou) — o fallback por id é parte do contrato.
    const [geral, pediatra] = await Promise.all([
      asUser(
        request(http).get(
          `/concursos/${concursoRef}/cargos/${cargoOf(provaGeral)}`,
        ),
      ).expect(200),
      asUser(
        request(http).get(
          `/concursos/${concursoRef}/cargos/${cargoOf(provaPediatra)}`,
        ),
      ).expect(200),
    ]);

    type Prova = {
      examBaseId: string;
      isPrimary: boolean;
      questionCount: number;
      userStats: { attemptCount: number; bestScore: number | null };
      studyPlan: { bestScore: number | null };
    };
    const sharedInGeral = (geral.body.provas as Prova[]).find(
      (p) => p.examBaseId === provaGeral,
    )!;
    const sharedInPed = (pediatra.body.provas as Prova[]).find(
      (p) => p.examBaseId === provaGeral,
    )!;

    // É a MESMA prova: contagem e prontidão idênticas nos dois cargos.
    expect(sharedInGeral.questionCount).toBe(6);
    expect(sharedInPed.questionCount).toBe(6);
    expect(sharedInGeral.userStats).toEqual({ attemptCount: 1, bestScore: 50 });
    expect(sharedInPed.userStats).toEqual({ attemptCount: 1, bestScore: 50 });
    expect(sharedInGeral.studyPlan.bestScore).toBe(50);
    expect(sharedInPed.studyPlan.bestScore).toBe(50);
    // No Geral ela é a oficial; no Pediatra é prova extra.
    expect(sharedInGeral.isPrimary).toBe(true);
    expect(sharedInPed.isPrimary).toBe(false);
    // As fichas continuam independentes: cada cargo com seu salário.
    expect(geral.body.cargo.salaryBase).toBe('9100');
    expect(pediatra.body.cargo.salaryBase).toBe('8200');
  });

  it('editar janela da prova sincroniza a janela agregada do Concurso (§2b)', async () => {
    await asAdmin(request(http).patch(`/exam-bases/${provaGeral}`))
      .send({
        registrationStart: '2026-06-01T00:00:00.000Z',
        registrationEnd: '2026-06-30T00:00:00.000Z',
        editalUrl: 'https://recife.example.com/edital.pdf',
      })
      .expect(200);
    await asAdmin(request(http).patch(`/exam-bases/${provaPediatra}`))
      .send({ registrationEnd: '2026-07-05T00:00:00.000Z' })
      .expect(200);

    const cargo = await prisma.cargo.findUniqueOrThrow({
      where: { id: cargoOf(provaGeral) },
      select: { concursoId: true },
    });
    const concurso = await prisma.concurso.findUniqueOrThrow({
      where: { id: cargo.concursoId },
    });
    expect(concurso.registrationStart?.toISOString()).toBe(
      '2026-06-01T00:00:00.000Z',
    );
    // End mais tarde entre as provas do concurso.
    expect(concurso.registrationEnd?.toISOString()).toBe(
      '2026-07-05T00:00:00.000Z',
    );
    expect(concurso.editalUrl).toBe('https://recife.example.com/edital.pdf');
  });
});
