/**
 * Seed de DEMONSTRAÇÃO para "provas para treinar" (recomendação).
 *
 * O `seed-c5-enfermeiro` é um concurso FUTURO (inscrições abertas): ele NÃO tem
 * questões próprias — a prova ainda não foi aplicada. Para treinar, o sistema
 * recomenda provas relacionadas (mesmo cargo): mesma banca (tier 1) e, depois,
 * outras bancas (tier 2). Este seed:
 *   - garante que a prova futura fique SEM questões próprias (limpa resíduo de
 *     um seed anterior que, por engano, colocou "Tipo 1/Tipo 2" nela);
 *   - cria edições PASSADAS de Enfermeiro com questões: 2 da mesma banca
 *     (CEBRASPE → tier 1) e 1 de outra banca (FGV → tier 2).
 *
 *   npx tsx prisma/seed-multi-prova.ts          # cria/atualiza
 *   npx tsx prisma/seed-multi-prova.ts --clean  # remove o que foi semeado
 *
 * NÃO use em produção — é dado fake.
 */
import { GovernmentScope, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TARGET_SLUG = 'seed-c5-enfermeiro';
const SIBLING_SLUG = 'seed-c5-enfermeiro-tipo-2'; // resíduo do seed antigo
const MARKER = 'SEED_MULTI_PROVA';

type SeedQuestion = {
  subject: string;
  statement: string;
  correct: string;
  alternatives: { key: string; text: string }[];
};

const BANK_A: SeedQuestion[] = [
  {
    subject: 'Saúde Coletiva / SUS',
    statement:
      'Segundo a Lei 8.080/1990, o princípio que garante atendimento em todos os níveis de complexidade é a:',
    correct: 'B',
    alternatives: [
      { key: 'A', text: 'Equidade' },
      { key: 'B', text: 'Integralidade' },
      { key: 'C', text: 'Hierarquização' },
      { key: 'D', text: 'Descentralização' },
    ],
  },
  {
    subject: 'Fundamentos de Enfermagem',
    statement: 'A frequência cardíaca normal de um adulto em repouso situa-se entre:',
    correct: 'A',
    alternatives: [
      { key: 'A', text: '60 a 100 bpm' },
      { key: 'B', text: '100 a 140 bpm' },
      { key: 'C', text: '40 a 60 bpm' },
      { key: 'D', text: '20 a 40 bpm' },
    ],
  },
  {
    subject: 'Vacinação',
    statement: 'A vacina BCG, aplicada ao nascer, protege contra formas graves de:',
    correct: 'A',
    alternatives: [
      { key: 'A', text: 'Tuberculose' },
      { key: 'B', text: 'Hepatite B' },
      { key: 'C', text: 'Febre amarela' },
      { key: 'D', text: 'Poliomielite' },
    ],
  },
  {
    subject: 'Saúde da Mulher',
    statement: 'O exame Papanicolau é recomendado prioritariamente para mulheres de:',
    correct: 'B',
    alternatives: [
      { key: 'A', text: '15 a 20 anos' },
      { key: 'B', text: '25 a 64 anos' },
      { key: 'C', text: '65 a 80 anos' },
      { key: 'D', text: 'qualquer idade, anualmente' },
    ],
  },
  {
    subject: 'Controle de Infecção',
    statement: 'As precauções de contato exigem, ao tocar o paciente, o uso de:',
    correct: 'D',
    alternatives: [
      { key: 'A', text: 'Apenas máscara N95' },
      { key: 'B', text: 'Apenas óculos' },
      { key: 'C', text: 'Nenhum EPI' },
      { key: 'D', text: 'Luvas e avental' },
    ],
  },
];

const BANK_B: SeedQuestion[] = [
  {
    subject: 'Saúde Coletiva / SUS',
    statement: 'A porta de entrada preferencial do SUS é organizada pela estratégia:',
    correct: 'C',
    alternatives: [
      { key: 'A', text: 'Mais Médicos' },
      { key: 'B', text: 'Hospitais de referência' },
      { key: 'C', text: 'Estratégia Saúde da Família (ESF)' },
      { key: 'D', text: 'UPA 24h' },
    ],
  },
  {
    subject: 'Enfermagem em Urgência',
    statement: 'A sequência atual de RCP de alta qualidade prioriza:',
    correct: 'A',
    alternatives: [
      { key: 'A', text: 'C-A-B (compressões primeiro)' },
      { key: 'B', text: 'A-B-C (vias aéreas primeiro)' },
      { key: 'C', text: 'Apenas ventilação' },
      { key: 'D', text: 'Desfibrilar antes de comprimir' },
    ],
  },
  {
    subject: 'Farmacologia',
    statement: 'Entre os "certos" da administração de medicamentos, inclui-se a:',
    correct: 'B',
    alternatives: [
      { key: 'A', text: 'cor certa do comprimido' },
      { key: 'B', text: 'via de administração certa' },
      { key: 'C', text: 'marca certa' },
      { key: 'D', text: 'temperatura certa' },
    ],
  },
  {
    subject: 'Ética e Legislação',
    statement: 'O exercício da enfermagem no Brasil é fiscalizado pelo:',
    correct: 'C',
    alternatives: [
      { key: 'A', text: 'Ministério do Trabalho' },
      { key: 'B', text: 'CRM' },
      { key: 'C', text: 'COFEN / COREN' },
      { key: 'D', text: 'Sindicato' },
    ],
  },
];

type RelatedSpec = {
  slug: string;
  name: string;
  institution: string;
  city: string;
  state: string;
  examDate: Date;
  sameBanca: boolean;
  bank: SeedQuestion[];
};

const RELATED: RelatedSpec[] = [
  {
    slug: 'seed-rel-enfermeiro-campinas-2024',
    name: 'Prefeitura de Campinas — Enfermeiro 2024',
    institution: 'Prefeitura de Campinas',
    city: 'Campinas',
    state: 'SP',
    examDate: new Date('2024-05-12T00:00:00.000Z'),
    sameBanca: true, // CEBRASPE → tier 1
    bank: BANK_A,
  },
  {
    slug: 'seed-rel-enfermeiro-santos-2023',
    name: 'Prefeitura de Santos — Enfermeiro 2023',
    institution: 'Prefeitura de Santos',
    city: 'Santos',
    state: 'SP',
    examDate: new Date('2023-08-20T00:00:00.000Z'),
    sameBanca: true, // CEBRASPE → tier 1
    bank: BANK_B,
  },
  {
    slug: 'seed-rel-enfermeiro-curitiba-2023',
    name: 'Prefeitura de Curitiba — Enfermeiro 2023',
    institution: 'Prefeitura de Curitiba',
    city: 'Curitiba',
    state: 'PR',
    examDate: new Date('2023-03-15T00:00:00.000Z'),
    sameBanca: false, // outra banca → tier 2
    bank: BANK_A,
  },
];

/** Cria as questões de uma prova (idempotente: pula se já houver questões). */
async function seedQuestions(examBaseId: string, bank: SeedQuestion[]) {
  const existing = await prisma.examBaseQuestion.count({ where: { examBaseId } });
  if (existing > 0) return;
  let position = 0;
  for (const q of bank) {
    await prisma.examBaseQuestion.create({
      data: {
        examBaseId,
        subject: q.subject,
        statement: q.statement,
        correctAlternative: q.correct,
        position: position++,
        alternatives: {
          create: q.alternatives.map((a) => ({
            key: a.key,
            text: a.text,
            explanation: `Alternativa ${a.key}.`,
          })),
        },
      },
    });
  }
}

async function findOrCreateBoard(name: string, alias: string) {
  const existing = await prisma.examBoard.findFirst({ where: { name } });
  return existing ?? prisma.examBoard.create({ data: { name, alias } });
}

async function resetTarget() {
  const source = await prisma.examBase.findUnique({ where: { slug: TARGET_SLUG } });
  if (!source) {
    throw new Error(
      `Prova ${TARGET_SLUG} não encontrada. Rode antes o seed dos concursos de teste.`,
    );
  }
  // Prova futura NÃO tem questões próprias: limpa resíduo do seed antigo.
  await prisma.examBaseQuestion.deleteMany({ where: { examBaseId: source.id } });
  await prisma.examBase.update({
    where: { id: source.id },
    data: { cargoGroupId: null, provaLabel: null, isPrimaryProva: true },
  });
  await prisma.examBase.deleteMany({ where: { slug: SIBLING_SLUG } });
  return source;
}

async function main() {
  const source = await resetTarget();
  const otherBoard = await findOrCreateBoard('FGV', 'FGV');

  for (const spec of RELATED) {
    const examBoardId = spec.sameBanca ? source.examBoardId : otherBoard.id;
    const prova = await prisma.examBase.upsert({
      where: { slug: spec.slug },
      update: { examBoardId, adminNotes: MARKER, published: true },
      create: {
        name: spec.name,
        slug: spec.slug,
        role: 'Enfermeiro',
        governmentScope: GovernmentScope.MUNICIPAL,
        institution: spec.institution,
        city: spec.city,
        state: spec.state,
        examDate: spec.examDate,
        examBoardId,
        salaryBase: 7500,
        minPassingGradeNonQuota: 60,
        isNursingRelevant: true,
        published: true,
        adminNotes: MARKER,
      },
    });
    await seedQuestions(prova.id, spec.bank);
  }

  // Edições PASSADAS do MESMO cargo/banca/instituição do alvo → alimentam a
  // seção "Provas anteriores" (sidebar da aba Detalhes) e também são treináveis.
  const previousEditions = [
    { slug: 'seed-prev-enfermeiro-2022', year: 2022, bank: BANK_A },
    { slug: 'seed-prev-enfermeiro-2019', year: 2019, bank: BANK_B },
  ];
  for (const ed of previousEditions) {
    const prova = await prisma.examBase.upsert({
      where: { slug: ed.slug },
      update: { examBoardId: source.examBoardId, adminNotes: MARKER, published: true },
      create: {
        name: `${source.institution} — Enfermeiro ${ed.year}`,
        slug: ed.slug,
        role: 'Enfermeiro',
        governmentScope: source.governmentScope,
        institution: source.institution,
        city: source.city,
        state: source.state,
        examDate: new Date(`${ed.year}-05-14T00:00:00.000Z`),
        examBoardId: source.examBoardId,
        salaryBase: 7200,
        minPassingGradeNonQuota: 60,
        isNursingRelevant: true,
        published: true,
        adminNotes: MARKER,
      },
    });
    await seedQuestions(prova.id, ed.bank);
  }

  console.log(
    `✅ Pronto. "${TARGET_SLUG}" (futura) ficou sem questões próprias; recomenda ` +
      `${RELATED.length} provas relacionadas (2 da mesma banca + 1 de outra) e tem ` +
      `${previousEditions.length} edições anteriores do próprio cargo.`,
  );
}

async function clean() {
  await resetTarget().catch(() => undefined);
  const del = await prisma.examBase.deleteMany({ where: { adminNotes: MARKER } });
  console.log(`Revertido: ${del.count} prova(s) relacionada(s) removida(s).`);
}

const run = process.argv.includes('--clean') ? clean : main;
run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
