import { PrismaClient } from '@prisma/client';

export type MCQ = {
  statement: string;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
};

export type QuestionBank = Record<string, MCQ[]>;

export async function buildSkillIdMap(prisma: PrismaClient) {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true },
  });
  return new Map(skills.map((s) => [s.name, s.id]));
}

export async function seedQuestions(
  prisma: PrismaClient,
  questionBank: QuestionBank,
) {
  const skillIdByName = await buildSkillIdMap(prisma);
  console.log('skillIdByName', skillIdByName);

  for (const [skillName, questions] of Object.entries(questionBank)) {
    const skillId = skillIdByName.get(skillName);
    if (!skillId) {
      throw new Error(`Skill not found for questions: "${skillName}"`);
    }

    for (const q of questions) {
      // guard: exactly one correct option
      const correctCount = q.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new Error(
          `Question must have exactly 1 correct option (skill="${skillName}"):\n${q.statement}`,
        );
      }

      await prisma.question.create({
        data: {
          statement: q.statement,
          explanationText: q.explanation,
          skillId,
          options: {
            create: q.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          },
        },
      });
    }
  }
}
