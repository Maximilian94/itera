import {
  ExamBase,
  ExamBoard,
  GovernmentScope,
  Prisma,
  PrismaClient,
  User,
  UserRole,
} from '@prisma/client';

/**
 * Factories do seed e2e (critério do MAX-19: helpers reaproveitáveis, não
 * SQL solto). Cada helper cria uma linha com defaults plausíveis e aceita
 * overrides pontuais; o spec descreve o cenário, não o INSERT.
 */

type Db = Pick<
  PrismaClient,
  | '$executeRawUnsafe'
  | 'user'
  | 'examBoard'
  | 'examBase'
  | 'examSyllabusGroup'
  | 'examBaseQuestion'
  | 'examBaseQuestionAlternative'
  | 'examBaseAttempt'
  | 'examBaseAttemptAnswer'
>;

let sequence = 0;
const nextId = () => ++sequence;

/**
 * Limpa o banco de teste entre suítes. TRUNCATE ... CASCADE alcança as
 * dependentes (questões, tentativas, syllabus) via FKs.
 */
export async function truncateAll(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "users", "exam_boards", "concursos", "exam_bases" CASCADE',
  );
}

export function createUser(
  db: Db,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
): Promise<User> {
  return db.user.create({
    data: {
      email: `e2e-user-${nextId()}@test.local`,
      role: UserRole.USER,
      ...overrides,
    },
  });
}

export function createExamBoard(
  db: Db,
  overrides: Partial<Prisma.ExamBoardUncheckedCreateInput> = {},
): Promise<ExamBoard> {
  return db.examBoard.create({
    data: {
      name: 'Cebraspe (Cespe/UnB)',
      alias: 'CEBRASPE',
      ...overrides,
    },
  });
}

export function createExamBase(
  db: Db,
  overrides: Partial<Prisma.ExamBaseUncheckedCreateInput> = {},
): Promise<ExamBase> {
  const id = nextId();
  return db.examBase.create({
    data: {
      name: `Prova e2e ${id}`,
      slug: `prova-e2e-${id}`,
      role: 'Enfermeiro',
      governmentScope: GovernmentScope.MUNICIPAL,
      state: 'SP',
      city: 'Itera',
      examDate: new Date('2024-06-02T00:00:00.000Z'),
      published: true,
      isNursingRelevant: true,
      ...overrides,
    },
  });
}

export async function createSyllabusGroups(
  db: Db,
  examBaseId: string,
  groups: { name: string; topics: string }[],
): Promise<void> {
  await db.examSyllabusGroup.createMany({
    data: groups.map((g, order) => ({ examBaseId, order, ...g })),
  });
}

export interface SeededQuestion {
  id: string;
  subject: string | null;
  /** Alternativa correta ("A") e uma errada ("B"), para montar respostas. */
  correctAlternativeId: string;
  wrongAlternativeId: string;
}

/**
 * Cria questões com matéria controlada (`subject: null` cobre o balde
 * "Outros" do MAX-17), cada uma com alternativas A (correta) e B.
 */
export async function addQuestions(
  db: Db,
  examBaseId: string,
  spec: { subject: string | null; count: number }[],
): Promise<SeededQuestion[]> {
  const seeded: SeededQuestion[] = [];
  let position = 0;
  for (const { subject, count } of spec) {
    for (let i = 0; i < count; i++) {
      const question = await db.examBaseQuestion.create({
        data: {
          examBaseId,
          subject,
          statement: `Questão e2e ${nextId()}`,
          correctAlternative: 'A',
          position: position++,
          alternatives: {
            create: [
              { key: 'A', text: 'Correta', explanation: 'Gabarito.' },
              { key: 'B', text: 'Errada', explanation: 'Distrator.' },
            ],
          },
        },
        include: { alternatives: true },
      });
      seeded.push({
        id: question.id,
        subject,
        correctAlternativeId: question.alternatives.find((a) => a.key === 'A')!
          .id,
        wrongAlternativeId: question.alternatives.find((a) => a.key === 'B')!
          .id,
      });
    }
  }
  return seeded;
}

/**
 * Tentativa FINALIZADA (as regras de studyPlan/stats ignoram as demais) com
 * respostas marcadas: `answers` diz quais questões acertar/errar.
 */
export async function createFinishedAttempt(
  db: Db,
  input: {
    userId: string;
    examBaseId: string;
    scorePercentage: number;
    answers: { question: SeededQuestion; correct: boolean }[];
    finishedAt?: Date;
  },
): Promise<void> {
  await db.examBaseAttempt.create({
    data: {
      userId: input.userId,
      examBaseId: input.examBaseId,
      scorePercentage: input.scorePercentage,
      finishedAt: input.finishedAt ?? new Date('2024-07-01T12:00:00.000Z'),
      answers: {
        create: input.answers.map(({ question, correct }) => ({
          examBaseQuestionId: question.id,
          selectedAlternativeId: correct
            ? question.correctAlternativeId
            : question.wrongAlternativeId,
        })),
      },
    },
  });
}
