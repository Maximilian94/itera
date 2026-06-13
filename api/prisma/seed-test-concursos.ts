/**
 * Seed de DEMONSTRAÇÃO para a listagem /concursos (MAX-28).
 *
 * Gera ~200 concursos de enfermagem distintos, espalhados pelos 3 estados
 * temporais (a maioria "já aplicadas", pra exercitar a truncação + sticky),
 * com cidade/UF, banca, salário e janelas de inscrição variados.
 *
 * Tudo marcado com `adminNotes = MARKER` para limpeza fácil:
 *   npx tsx prisma/seed-test-concursos.ts          # cria
 *   npx tsx prisma/seed-test-concursos.ts --clean  # remove só o que foi semeado
 *
 * NÃO use em produção — é dado fake.
 */
import { GovernmentScope, Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKER = 'SEED_TEST_CONCURSOS';
const TODAY = new Date();

const DAY = 24 * 60 * 60 * 1000;
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * DAY);
const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const CITIES: ReadonlyArray<readonly [string, string]> = [
  ['São Paulo', 'SP'], ['Campinas', 'SP'], ['Santos', 'SP'], ['Ribeirão Preto', 'SP'],
  ['Sorocaba', 'SP'], ['São José dos Campos', 'SP'], ['Bauru', 'SP'],
  ['Rio de Janeiro', 'RJ'], ['Niterói', 'RJ'], ['Campos dos Goytacazes', 'RJ'], ['Petrópolis', 'RJ'],
  ['Belo Horizonte', 'MG'], ['Uberlândia', 'MG'], ['Juiz de Fora', 'MG'], ['Contagem', 'MG'],
  ['Curitiba', 'PR'], ['Londrina', 'PR'], ['Maringá', 'PR'],
  ['Porto Alegre', 'RS'], ['Caxias do Sul', 'RS'], ['Pelotas', 'RS'],
  ['Florianópolis', 'SC'], ['Joinville', 'SC'], ['Blumenau', 'SC'],
  ['Salvador', 'BA'], ['Feira de Santana', 'BA'],
  ['Recife', 'PE'], ['Olinda', 'PE'], ['Caruaru', 'PE'],
  ['Fortaleza', 'CE'], ['Sobral', 'CE'],
  ['Goiânia', 'GO'], ['Anápolis', 'GO'],
  ['Manaus', 'AM'], ['Belém', 'PA'], ['Brasília', 'DF'],
  ['Vitória', 'ES'], ['Natal', 'RN'], ['João Pessoa', 'PB'],
  ['Maceió', 'AL'], ['Aracaju', 'SE'], ['Teresina', 'PI'],
  ['Campo Grande', 'MS'], ['Cuiabá', 'MT'], ['São Luís', 'MA'], ['Porto Velho', 'RO'],
];

/** Templates de instituição por âmbito. `loc`: como preencher cidade/estado. */
const TEMPLATES: ReadonlyArray<{
  make: (city: string) => string;
  scope: GovernmentScope;
  loc: 'city' | 'state' | 'none';
}> = [
  { make: (c) => `Prefeitura de ${c}`, scope: GovernmentScope.MUNICIPAL, loc: 'city' },
  { make: (c) => `Secretaria de Saúde de ${c}`, scope: GovernmentScope.MUNICIPAL, loc: 'city' },
  { make: (c) => `Hospital Municipal de ${c}`, scope: GovernmentScope.MUNICIPAL, loc: 'city' },
  { make: (c) => `Fundação de Saúde de ${c}`, scope: GovernmentScope.MUNICIPAL, loc: 'city' },
  { make: (c) => `Instituto de Saúde de ${c}`, scope: GovernmentScope.MUNICIPAL, loc: 'city' },
  { make: (c) => `Hospital das Clínicas de ${c}`, scope: GovernmentScope.STATE, loc: 'state' },
  { make: (c) => `Universidade Federal de ${c}`, scope: GovernmentScope.FEDERAL, loc: 'none' },
];

const BOARD_NAMES = [
  ['Fundação Getúlio Vargas', 'FGV'],
  ['Fundação VUNESP', 'VUNESP'],
  ['Cebraspe', 'Cebraspe'],
  ['Instituto Brasileiro de Formação e Capacitação', 'IBFC'],
  ['Instituto Quadrix', 'Quadrix'],
  ['Fundação Carlos Chagas', 'FCC'],
  ['AOCP Concursos', 'AOCP'],
  ['Instituto Access', 'Access'],
] as const;

const CARGOS: ReadonlyArray<{ role: string; min: number; max: number }> = [
  { role: 'Enfermeiro', min: 4500, max: 9500 },
  { role: 'Técnico de Enfermagem', min: 2200, max: 4200 },
  { role: 'Auxiliar de Enfermagem', min: 1800, max: 2800 },
  { role: 'Enfermeiro Obstetra', min: 5000, max: 9800 },
  { role: 'Enfermeiro do Trabalho', min: 5200, max: 9000 },
];

type Temporal = 'open' | 'future' | 'past';

/** Datas por estado temporal (date-only em UTC, como o resto do app). */
function temporalDates(t: Temporal): {
  examDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  resultDate: Date;
} {
  if (t === 'open') {
    const registrationStart = addDays(TODAY, -rand(0, 12));
    const registrationEnd = addDays(TODAY, rand(2, 45));
    const examDate = addDays(registrationEnd, rand(25, 60));
    return { registrationStart, registrationEnd, examDate, resultDate: addDays(examDate, 40) };
  }
  if (t === 'future') {
    const examDate = addDays(TODAY, rand(12, 110));
    const registrationEnd = addDays(TODAY, -rand(5, 30)); // inscrições já encerradas
    const registrationStart = addDays(registrationEnd, -rand(20, 40));
    return { registrationStart, registrationEnd, examDate, resultDate: addDays(examDate, 40) };
  }
  const examDate = addDays(TODAY, -rand(60, 2200)); // passado: 2 meses a ~6 anos
  const registrationEnd = addDays(examDate, -rand(60, 80));
  const registrationStart = addDays(registrationEnd, -rand(20, 40));
  return { registrationStart, registrationEnd, examDate, resultDate: addDays(examDate, 45) };
}

/** Distribui ~200: maioria passada, p/ exercitar a truncação de "Já aplicadas". */
function temporalFor(i: number): Temporal {
  if (i < 14) return 'open';
  if (i < 32) return 'future';
  return 'past';
}

async function clean() {
  const del = await prisma.examBase.deleteMany({ where: { adminNotes: MARKER } });
  // Remove concursos órfãos (criados pelo lazy-link ao navegar) sem nenhuma prova.
  const orphans = await prisma.concurso.deleteMany({ where: { examBases: { none: {} } } });
  console.log(`Removidos ${del.count} exam bases e ${orphans.count} concursos órfãos.`);
}

async function ensureBoards() {
  const boards: { id: string }[] = [];
  for (const [name, alias] of BOARD_NAMES) {
    const existing = await prisma.examBoard.findFirst({ where: { name } });
    boards.push(existing ?? (await prisma.examBoard.create({ data: { name, alias } })));
  }
  return boards;
}

async function main() {
  if (process.argv.includes('--clean')) {
    await clean();
    return;
  }

  const boards = await ensureBoards();
  const TARGET = 200;
  const rows: Prisma.ExamBaseCreateManyInput[] = [];

  for (let i = 0; i < TARGET; i++) {
    // Identidade única do concurso: cidade × template cobre ~200 combos.
    const [city, uf] = CITIES[i % CITIES.length];
    const template = TEMPLATES[Math.floor(i / CITIES.length) % TEMPLATES.length];
    const institution = template.make(city);
    const board = pick(boards);
    const t = temporalFor(i);
    const dates = temporalDates(t);
    const state = template.loc === 'none' ? null : uf;
    const cityValue = template.loc === 'city' ? city : null;

    // 1 a 3 cargos: Enfermeiro sempre presente.
    const extras = [...CARGOS].slice(1).sort(() => Math.random() - 0.5);
    const cargos = [CARGOS[0], ...extras.slice(0, rand(0, 2))];

    for (const cargo of cargos) {
      const hasReserveList = Math.random() < 0.3;
      rows.push({
        name: `${cargo.role} — ${institution} ${dates.examDate.getUTCFullYear()}`,
        slug: `seed-c${i}-${cargo.role.toLowerCase().replace(/[^a-z]+/g, '-')}`,
        institution,
        role: cargo.role,
        governmentScope: template.scope,
        state,
        city: cityValue,
        salaryBase: new Prisma.Decimal(rand(cargo.min, cargo.max)),
        vacancyCount: rand(1, 60),
        hasReserveList,
        minPassingGradeNonQuota: new Prisma.Decimal(60),
        examDate: dates.examDate,
        registrationStart: dates.registrationStart,
        registrationEnd: dates.registrationEnd,
        resultDate: dates.resultDate,
        examBoardId: board.id,
        isNursingRelevant: true,
        published: true,
        adminNotes: MARKER,
      });
    }
  }

  // Limpa um seed anterior antes de recriar (idempotente).
  await prisma.examBase.deleteMany({ where: { adminNotes: MARKER } });
  const created = await prisma.examBase.createMany({ data: rows, skipDuplicates: true });
  console.log(
    `Criados ${created.count} cargos em ${TARGET} concursos (open/future/past). ` +
      `Para remover: npx tsx prisma/seed-test-concursos.ts --clean`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
