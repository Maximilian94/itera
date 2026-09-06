/**
 * Preenche `Concurso.editalUrl` a partir do edital de abertura que JÁ está na
 * timeline de Notícias.
 *
 * Por que existe: o link do edital só era gravado pelo form admin ou pela
 * leitura da notícia (fase 2). Um concurso descoberto no pciconcursos cuja
 * notícia não citava o edital ficava sem link para sempre — mesmo depois de a
 * fase 4 trazer o `EDITAL_ABERTURA` para a timeline, com o PDF visível na aba
 * ao lado. O `addConcursoDocuments` passou a promover o link na entrada; este
 * script cobre o passivo de quem já foi processado.
 *
 * Conservador pela mesma regra do fluxo: só toca em concurso com `editalUrl`
 * VAZIO — nunca sobrescreve o que o admin colou à mão. Havendo mais de um
 * edital de abertura, vence o publicado mais recentemente (um consolidado
 * republicado substitui o original).
 *
 * Uso (sem DATABASE_URL no ambiente, cai no `.env` — o banco LOCAL):
 *   npx ts-node scripts/backfill-edital-url.ts           # dry-run (padrão)
 *   npx ts-node scripts/backfill-edital-url.ts --apply   # grava
 *
 * Contra outro banco (o do ambiente VENCE o `.env`):
 *   DATABASE_URL="postgresql://…" npx ts-node scripts/backfill-edital-url.ts
 */
import { PrismaClient } from '@prisma/client';
import { isBareHome } from '../src/scraper/document-scraper.service';

const prisma = new PrismaClient();

/** host/banco da conexão, SEM credenciais — "24 atualizados" sem dizer onde é
 *  o tipo de saída que faz alguém achar que mexeu em produção (ou não mexeu). */
function alvo(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return '(DATABASE_URL do .env)';
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '(DATABASE_URL ilegível)';
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(`Banco: ${alvo()} — modo ${apply ? 'APLICAR' : 'dry-run'}\n`);

  const encontrados = await prisma.concurso.findMany({
    where: {
      OR: [{ editalUrl: null }, { editalUrl: '' }],
      documents: { some: { kind: 'EDITAL_ABERTURA' } },
    },
    select: {
      id: true,
      institution: true,
      state: true,
      year: true,
      publishedAt: true,
      documents: {
        where: { kind: 'EDITAL_ABERTURA' },
        select: { url: true, publishedAt: true },
        // Mais recente primeiro; sem data vai para o fim (o original costuma
        // ser o único, e um consolidado republicado deve vencê-lo).
        orderBy: { publishedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Mesma recusa do fluxo (`isBareHome`): o classificador às vezes marca a home
  // da banca como edital de abertura, e "Ver edital original" apontando para a
  // home é pior que não ter botão. Sobrando nada, o concurso fica de fora.
  const candidatos = encontrados
    .map((c) => ({
      ...c,
      documents: c.documents.filter((d) => !isBareHome(d.url)),
    }))
    .filter((c) => c.documents.length > 0);

  const descartados = encontrados.length - candidatos.length;
  if (descartados > 0)
    console.log(
      `${descartados} concurso(s) fora: o único "edital" era a home da banca.\n`,
    );

  if (candidatos.length === 0) {
    console.log(
      'Nenhum concurso sem editalUrl com edital de abertura na timeline.',
    );
    return;
  }

  console.log(`${candidatos.length} concurso(s) para vincular:\n`);
  for (const c of candidatos) {
    const doc = c.documents[0];
    console.log(
      `  ${c.institution ?? '(sem instituição)'} ${c.state ?? ''} ${c.year ?? ''}` +
        `${c.publishedAt ? '' : ' [rascunho]'}\n    → ${doc.url}` +
        (c.documents.length > 1
          ? `  (${c.documents.length} editais de abertura na timeline)`
          : ''),
    );
  }

  if (!apply) {
    console.log('\nDry-run: nada foi gravado. Rode com --apply para vincular.');
    return;
  }

  let count = 0;
  for (const c of candidatos) {
    await prisma.concurso.update({
      where: { id: c.id },
      data: { editalUrl: c.documents[0].url },
    });
    count++;
  }
  console.log(`\n${count} concurso(s) atualizado(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
