import { GovernmentScope, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { seedQuestions } from './seed/questions/questions';
import { QUESTION_BANK } from './seed/questions/questions.seed';

const prisma = new PrismaClient();

type SkillNode = {
  name: string;
  children?: SkillNode[];
};

async function createSkillTree(
  node: SkillNode,
  parent?: { id: string; path: string },
) {
  const id = randomUUID();
  const path = parent ? `${parent.path}/${id}` : id;

  const created = await prisma.skill.create({
    data: {
      id,
      name: node.name,
      path,
      parentId: parent?.id ?? null,
    },
  });

  if (node.children?.length) {
    for (const child of node.children) {
      await createSkillTree(child, { id: created.id, path: created.path });
    }
  }

  return created;
}

async function main() {
  // remove o seed atual (skills) — e, por cascade, tudo que depender delas se houver FK/cascade no seu BD
  await prisma.$transaction([
    prisma.attempt.deleteMany(),
    prisma.examQuestion.deleteMany(),
    prisma.exam.deleteMany(),
    prisma.option.deleteMany(),
    prisma.question.deleteMany(),
    prisma.skill.deleteMany(),
    prisma.examBase.deleteMany(),
    prisma.examBoard.deleteMany(),
  ]);

  const roadmap: SkillNode = {
    name: 'Angular',
    children: [
      {
        name: 'Introduction',
        children: [
          { name: 'Introduction to Angular' },
          { name: 'Angular Architecture' },
          { name: 'Setting up a New Project' },
          { name: 'Angular and History' },
          { name: 'Learn TypeScript Basics' },
        ],
      },

      {
        name: 'Components',
        children: [
          {
            name: 'Component Anatomy',
            children: [
              { name: 'Provider' },
              { name: 'changeDetection' },
              { name: 'Template' },
              { name: 'Standalone' },
              { name: 'viewProvider' },
              { name: 'Encapsulation' },
              { name: 'Selector' },
              { name: 'Styles' },
              { name: 'Imports' },
              { name: 'Metadata' },
            ],
          },
          {
            name: 'Communication',
            children: [
              { name: 'Parent-Child Interaction' },
              { name: 'ViewChild' },
              { name: 'ContentChild' },
            ],
          },
          { name: 'Component Lifecycle' },
          { name: 'Dynamic Components' },
        ],
      },

      {
        name: 'Modules',
        children: [
          { name: 'Module Architecture' },
          { name: 'Creating Components' },
          { name: 'Creating Modules' },
          { name: 'Feature Modules' },
          { name: 'Lazy Loading Modules' },
          { name: 'Dependencies' },
        ],
      },

      {
        name: 'Templates',
        children: [
          { name: 'Interpolation' },
          { name: 'Template Statements' },
          { name: 'Understand Binding' },
          {
            name: 'Data Binding',
            children: [
              { name: 'Property Binding' },
              { name: 'Attribute Binding' },
              { name: 'Event Binding' },
              { name: 'Two-way Binding' },
            ],
          },
          {
            name: 'Control Flow',
            children: [
              { name: '@Input & @Output' },
              { name: 'Template Ref Vars' },
              { name: 'Template Syntax' },
              { name: '@if' },
              { name: '@else' },
              { name: '@else if' },
              { name: '@for' },
              { name: '@switch' },
              { name: '@case' },
              { name: '@default' },
              { name: '@let' },
              { name: '@defer' },
            ],
          },
          {
            name: 'Pipes',
            children: [
              { name: 'Change Detection' },
              { name: 'Common Pipes' },
              { name: 'Pipes Precedence' },
              { name: 'Custom Pipes' },
            ],
          },
        ],
      },

      {
        name: 'Directives',
        children: [
          { name: 'Structural Directives' },
          { name: 'Attribute Directives' },
          { name: 'Custom Directives' },
        ],
      },

      {
        name: 'Routing',
        children: [
          { name: 'Configuration' },
          { name: 'Lazy Loading' },
          { name: 'Router Outlets' },
          { name: 'Router Links' },
          { name: 'Router Events' },
          { name: 'Guards' },
        ],
      },

      {
        name: 'Services & Remote Data',
        children: [{ name: 'Dependency Injection' }],
      },

      {
        name: 'Forms',
        children: [
          { name: 'Reactive Forms' },
          { name: 'Typed Forms' },
          { name: 'Template-driven Forms' },
          { name: 'Dynamic Forms' },
          { name: 'Custom Validators' },
          { name: 'Control Value Accessor' },
        ],
      },

      {
        name: 'HTTP Client',
        children: [
          { name: 'Setting Up the Client' },
          { name: 'Making Requests' },
          { name: 'Writing Interceptors' },
        ],
      },

      {
        name: 'RxJS Basics',
        children: [
          { name: 'Observable Pattern' },
          { name: 'Observable Lifecycle' },
          { name: 'RxJS vs Promises' },
          {
            name: 'Operators',
            children: [
              { name: 'Filtering' },
              { name: 'Rate Limiting' },
              { name: 'Transformation' },
              { name: 'Combination' },
            ],
          },
        ],
      },

      {
        name: 'Signals',
        children: [
          { name: 'RxJS Interop' },
          { name: 'Inputs as Signals' },
          { name: 'Queries as Signals' },
          { name: 'Model Inputs' },
        ],
      },

      {
        name: 'State Management',
        children: [{ name: 'NgRx' }, { name: 'NGXS' }, { name: 'Elf' }],
      },

      {
        name: 'Zones',
        children: [{ name: 'Zoneless Applications' }],
      },

      {
        name: 'Developer Tools',
        children: [
          { name: 'Angular CLI' },
          { name: 'Local Setup' },
          { name: 'Deployment' },
          { name: 'End-to-End Testing' },
          { name: 'Schematics' },
          { name: 'Build Environments' },
          { name: 'CLI Builders' },
          { name: 'AoT Compilation' },
          { name: 'DevTools' },
          { name: 'Language Service' },
        ],
      },

      {
        name: 'Libraries',
        children: [{ name: 'Using Libraries' }, { name: 'Creating Libraries' }],
      },

      {
        name: 'SSR / SSG',
        children: [{ name: 'SSR' }, { name: 'SSG' }, { name: 'AnalogJS' }],
      },

      {
        name: 'Security',
        children: [
          { name: 'Cross-site Scripting' },
          { name: 'Sanitization' },
          { name: 'Trusting Safe Values' },
          { name: 'Enforce Trusted Types' },
          {
            name: 'HTTP Vulnerabilities',
            children: [
              { name: 'Cross-site Request Forgery' },
              { name: 'HttpClient CSRF' },
              { name: 'XSRF protection' },
              { name: 'Cross-site Script Inclusion' },
            ],
          },
        ],
      },

      {
        name: 'Accessibility',
        children: [
          { name: 'Attributes' },
          { name: 'UI Components' },
          { name: 'Containers' },
          { name: 'Routing' },
          { name: 'Link Identification' },
        ],
      },

      {
        name: 'Performance',
        children: [
          { name: 'Deferrable Views' },
          { name: 'Image Optimization' },
          { name: 'Zone Pollution' },
          { name: 'Slow Computations' },
          { name: 'Hydration' },
        ],
      },

      {
        name: 'Testing',
        children: [
          { name: 'Testing Services' },
          { name: 'Testing Pipes' },
          { name: 'Testing Requests' },
          { name: 'Services with Dependencies' },
          { name: 'Component Bindings' },
          { name: 'Testing Directives' },
          { name: 'Debugging Tests' },
          { name: 'Component Templates' },
          { name: 'Code Coverage' },
        ],
      },

      {
        name: 'Internationalization',
        children: [
          { name: 'Localize Package' },
          { name: 'Locales by ID' },
          { name: 'Translation Files' },
          { name: 'Multiple Locales' },
        ],
      },

      {
        name: 'Animation',
        children: [
          { name: 'Transitions & Triggers' },
          { name: 'Complex Sequences' },
          { name: 'Reusable Animations' },
          { name: 'Route Transitions' },
        ],
      },
    ],
  };

  await createSkillTree(roadmap);
  await seedQuestions(prisma, QUESTION_BANK);

  // Seed minimal exam boards + exam bases (public service positions)
  const [cespe, fgv] = await prisma.$transaction([
    prisma.examBoard.create({
      data: {
        id: randomUUID(),
        name: 'CEBRASPE',
        logoUrl: 'https://example.com/logos/cebraspe.png',
      },
    }),
    prisma.examBoard.create({
      data: {
        id: randomUUID(),
        name: 'FGV',
        logoUrl: 'https://example.com/logos/fgv.png',
      },
    }),
  ]);

  await prisma.examBase.createMany({
    data: [
      {
        id: randomUUID(),
        name: 'Prefeitura - Analista de Sistemas',
        institution: 'Prefeitura Municipal',
        role: 'Analista de Sistemas',
        governmentScope: GovernmentScope.MUNICIPAL,
        state: 'SP',
        city: 'São Paulo',
        salaryBase: new Prisma.Decimal('8500.00'),
        examDate: new Date('2026-06-15T00:00:00.000Z'),
        examBoardId: cespe.id,
        published: true,
        slug: 'cebraspe-sp-sao-paulo-2026-analista-de-sistemas',
      },
      {
        id: randomUUID(),
        name: 'Secretaria Estadual - Desenvolvedor',
        institution: 'Governo do Estado',
        role: 'Desenvolvedor',
        governmentScope: GovernmentScope.STATE,
        state: 'MG',
        city: null,
        salaryBase: new Prisma.Decimal('10500.50'),
        examDate: new Date('2026-08-20T00:00:00.000Z'),
        examBoardId: fgv.id,
        published: true,
        slug: 'fgv-mg-2026-desenvolvedor',
      },
      {
        id: randomUUID(),
        name: 'Órgão Federal - Engenheiro de Software',
        institution: 'Administração Federal',
        role: 'Engenheiro de Software',
        governmentScope: GovernmentScope.FEDERAL,
        state: null,
        city: null,
        salaryBase: new Prisma.Decimal('14500.00'),
        examDate: new Date('2026-10-05T00:00:00.000Z'),
        examBoardId: cespe.id,
        published: true,
        slug: 'cebraspe-2026-engenheiro-de-software',
      },
    ],
  });

  console.log('✅ Seed de skills do Angular concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
