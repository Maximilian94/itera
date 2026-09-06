/**
 * Remove os cargos "Enfermeiro" FANTASMA — os que o antigo `discovery/add`
 * criava por chute, antes de qualquer análise de edital.
 *
 * Por que eles são um problema, e não só ruído: como o cargo já constava no
 * snapshot, a análise do edital transcrevia as atribuições NELE — inclusive as
 * de um cargo de nome parecido ("Enfermeiro de Unidade Básica de Saúde") —
 * publicando ficha errada, enquanto o cargo verdadeiro nascia ao lado como
 * "cargo novo". A criação já foi removida; este script limpa o passivo.
 *
 * ⚠️ Um fantasma é INDISTINGUÍVEL de um cargo "Enfermeiro" real que ainda não
 * foi analisado. Por isso os critérios são conservadores e cumulativos — só
 * apaga o que não pode estar sendo usado por ninguém:
 *
 *   - role exatamente "Enfermeiro" (o literal que o discovery criava)
 *   - concurso é RASCUNHO (publishedAt null) — publicado nunca é tocado
 *   - sem prova (CargoProva), sem quadro de matérias, sem slug
 *   - sem NENHUM dado de ficha preenchido
 *   - sem meta de usuário (UserGoal) apontando para ele
 *
 * Uso:
 *   npx ts-node scripts/limpa-cargos-fantasma.ts           # dry-run (padrão)
 *   npx ts-node scripts/limpa-cargos-fantasma.ts --apply   # apaga de verdade
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');

  const candidatos = await prisma.cargo.findMany({
    where: {
      role: 'Enfermeiro',
      slug: null,
      description: null,
      requirements: null,
      salaryBase: null,
      workload: null,
      vacancyCount: null,
      applicantCount: null,
      registrationFee: null,
      minPassingGradeNonQuota: null,
      actualCutScore: null,
      provas: { none: {} },
      syllabusGroups: { none: {} },
      userGoals: { none: {} },
      concurso: { publishedAt: null },
    },
    select: {
      id: true,
      createdAt: true,
      concurso: {
        select: {
          id: true,
          institution: true,
          year: true,
          state: true,
          pciListingUrl: true,
          _count: { select: { cargos: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (candidatos.length === 0) {
    console.log('Nenhum cargo fantasma encontrado.');
    return;
  }

  console.log(`${candidatos.length} cargo(s) fantasma em rascunhos:\n`);
  for (const c of candidatos) {
    const k = c.concurso;
    // "resta N" avisa quando o concurso ficará SEM nenhum cargo — esperado
    // para quem ainda não teve o edital analisado, mas vale ver na lista.
    const resta = k._count.cargos - 1;
    console.log(
      `  ${k.institution ?? '(sem instituição)'} ${k.state ?? ''} ${k.year ?? ''}` +
        ` — cargo ${c.id} — resta ${resta} cargo(s) no concurso` +
        (k.pciListingUrl ? '' : '  [não veio do discovery]'),
    );
  }

  if (!apply) {
    console.log('\nDry-run: nada foi apagado. Rode com --apply para remover.');
    return;
  }

  const { count } = await prisma.cargo.deleteMany({
    where: { id: { in: candidatos.map((c) => c.id) } },
  });
  console.log(`\n${count} cargo(s) removido(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
