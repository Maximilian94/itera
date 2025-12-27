import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type SeedQuestion = {
  statement: string;
  explanationText: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

async function seedSkill(name: string, questions: SeedQuestion[]) {
  const skill = await prisma.skill.upsert({
    where: { name },
    update: {},
    create: { name },
  });

  for (const q of questions) {
    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      throw new Error(
        `Seed question must have exactly 1 correct option. Got ${correctCount} for: ${q.statement}`,
      );
    }

    await prisma.question.create({
      data: {
        skillId: skill.id,
        statement: q.statement,
        explanationText: q.explanationText,
        options: { create: q.options },
      },
    });
  }
}

async function main() {
  // Reset (keep it simple for MVP dev seeding)
  await prisma.attempt.deleteMany();
  await prisma.option.deleteMany();
  await prisma.question.deleteMany();
  await prisma.skill.deleteMany();

  await seedSkill('JavaScript', [
    {
      statement: 'What does Array.prototype.map return?',
      explanationText:
        '`map` always returns a new array with the callback applied to each element.',
      options: [
        { text: 'A new array', isCorrect: true },
        { text: 'The original array (mutated)', isCorrect: false },
        { text: 'A single value', isCorrect: false },
        { text: 'A Promise', isCorrect: false },
      ],
    },
    {
      statement: 'What is the value of `typeof null` in JavaScript?',
      explanationText:
        "It is a long-standing JS quirk: `typeof null` returns 'object'.",
      options: [
        { text: "'null'", isCorrect: false },
        { text: "'object'", isCorrect: true },
        { text: "'undefined'", isCorrect: false },
        { text: "'number'", isCorrect: false },
      ],
    },
    {
      statement: 'Which statement about `const` is correct?',
      explanationText:
        '`const` prevents rebinding, but the referenced object can still be mutated.',
      options: [
        { text: 'It makes objects deeply immutable', isCorrect: false },
        { text: 'It prevents reassignment of the binding', isCorrect: true },
        { text: 'It is function-scoped', isCorrect: false },
        { text: 'It is equivalent to `var`', isCorrect: false },
      ],
    },
    {
      statement: 'Which operator is used for strict equality?',
      explanationText:
        '`===` compares both value and type (no coercion).',
      options: [
        { text: '==', isCorrect: false },
        { text: '===', isCorrect: true },
        { text: '=', isCorrect: false },
        { text: '!=', isCorrect: false },
      ],
    },
  ]);

  await seedSkill('SQL', [
    {
      statement: 'Which SQL clause is used to filter rows?',
      explanationText:
        '`WHERE` filters rows before grouping/aggregation.',
      options: [
        { text: 'WHERE', isCorrect: true },
        { text: 'ORDER BY', isCorrect: false },
        { text: 'SELECT', isCorrect: false },
        { text: 'FROM', isCorrect: false },
      ],
    },
    {
      statement: 'Which JOIN returns only matching rows from both tables?',
      explanationText:
        '`INNER JOIN` returns rows where the join condition matches in both tables.',
      options: [
        { text: 'LEFT JOIN', isCorrect: false },
        { text: 'RIGHT JOIN', isCorrect: false },
        { text: 'INNER JOIN', isCorrect: true },
        { text: 'FULL OUTER JOIN', isCorrect: false },
      ],
    },
    {
      statement: 'Which function counts rows?',
      explanationText:
        '`COUNT(*)` counts rows (including nulls in columns).',
      options: [
        { text: 'SUM(*)', isCorrect: false },
        { text: 'COUNT(*)', isCorrect: true },
        { text: 'AVG(*)', isCorrect: false },
        { text: 'MAX(*)', isCorrect: false },
      ],
    },
    {
      statement: 'Which clause is used to filter aggregated results?',
      explanationText:
        '`HAVING` filters groups after `GROUP BY`.',
      options: [
        { text: 'WHERE', isCorrect: false },
        { text: 'HAVING', isCorrect: true },
        { text: 'LIMIT', isCorrect: false },
        { text: 'DISTINCT', isCorrect: false },
      ],
    },
  ]);

  await seedSkill('Docker', [
    {
      statement: 'What does `docker compose up -d` do?',
      explanationText:
        'It starts services defined in docker-compose in the background (detached).',
      options: [
        { text: 'Builds images only', isCorrect: false },
        { text: 'Starts services in detached mode', isCorrect: true },
        { text: 'Stops and removes containers', isCorrect: false },
        { text: 'Deletes volumes', isCorrect: false },
      ],
    },
    {
      statement: 'Which file commonly defines multi-container local setups?',
      explanationText:
        '`docker-compose.yml` (Compose) is commonly used for multi-container local dev.',
      options: [
        { text: 'Dockerfile', isCorrect: false },
        { text: 'docker-compose.yml', isCorrect: true },
        { text: 'package.json', isCorrect: false },
        { text: 'Makefile', isCorrect: false },
      ],
    },
    {
      statement: 'What is a Docker volume used for?',
      explanationText:
        'Volumes persist data outside the container lifecycle (e.g. database files).',
      options: [
        { text: 'Persisting data', isCorrect: true },
        { text: 'Encrypting traffic', isCorrect: false },
        { text: 'Scheduling containers', isCorrect: false },
        { text: 'Compiling TypeScript', isCorrect: false },
      ],
    },
    {
      statement: 'What does a container port mapping like "5432:5432" mean?',
      explanationText:
        'It maps host port 5432 to container port 5432.',
      options: [
        { text: 'Container port 5432 maps to host port 5432', isCorrect: false },
        { text: 'Host port 5432 maps to container port 5432', isCorrect: true },
        { text: 'It disables networking', isCorrect: false },
        { text: 'It only works on Windows', isCorrect: false },
      ],
    },
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });


