import {
  DocumentScraperService,
  looksLikeChallenge,
} from './document-scraper.service';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { ConcursoCostService } from './concurso-cost.service';

/* Regressão do caso Mondaí: o desafio do Cloudflare vem com HTML "substancial"
 * (5–27 KB), passava por página válida, a IA não achava documentos nele e o
 * link CORRETO era rejeitado como "página lida, sem documentos". */
describe('looksLikeChallenge', () => {
  it('reconhece o desafio do Cloudflare em inglês e em português', () => {
    expect(
      looksLikeChallenge('<!DOCTYPE html><html><head><title>Just a moment...'),
    ).toBe(true);
    expect(looksLikeChallenge('<html><head><title>Um momento…</title>')).toBe(
      true,
    );
  });

  it('reconhece pelos marcadores do desafio, sem depender do título', () => {
    expect(
      looksLikeChallenge(
        '<html><body><script src="/cdn-cgi/challenge-platform/x.js">',
      ),
    ).toBe(true);
    expect(looksLikeChallenge('<div class="cf-browser-verification">')).toBe(
      true,
    );
  });

  it('não confunde página real com desafio', () => {
    expect(
      looksLikeChallenge(
        '<html><head><title>Concursos - AMEOSC</title></head><body><a href="/edital.pdf">Edital</a>',
      ),
    ).toBe(false);
    expect(looksLikeChallenge('')).toBe(false);
  });
});

/* O edital já entrava na timeline de Notícias, mas o link não subia para a
 * ficha: concurso vindo da descoberta ficava sem "Ver edital original" para
 * sempre, com o edital visível na aba ao lado. */
describe('addConcursoDocuments — edital de abertura na ficha', () => {
  function build(concurso: { editalUrl: string | null } | null) {
    const update = jest.fn().mockResolvedValue({});
    const prisma = {
      concurso: {
        findUnique: jest.fn().mockResolvedValue(
          concurso && {
            id: 'c1',
            documentsSourceUrl: 'https://banca.org/c',
            ...concurso,
          },
        ),
        update,
      },
      concursoDocument: { upsert: jest.fn().mockResolvedValue({}) },
    } as unknown as PrismaService;
    const service = new DocumentScraperService(
      {} as ConfigService,
      prisma,
      {} as ConcursoCostService,
    );
    return { service, update };
  }

  const doc = (
    over: Partial<{ url: string; kind: string; publishedAt: string | null }>,
  ) => ({
    title: 'Edital de Abertura nº 01/2026',
    url: 'https://banca.org/edital.pdf',
    kind: 'EDITAL_ABERTURA',
    publishedAt: null,
    ...over,
  });

  it('grava o edital de abertura quando o concurso não tem link', async () => {
    const { service, update } = build({ editalUrl: null });

    const res = await service.addConcursoDocuments('c1', [
      {
        title: 'Comunicado',
        url: 'https://banca.org/com.pdf',
        kind: 'COMUNICADO',
      },
      doc({}),
    ]);

    expect(res.editalUrlFilled).toBe('https://banca.org/edital.pdf');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { editalUrl: 'https://banca.org/edital.pdf' },
    });
  });

  it('nunca sobrescreve o link que já está na ficha', async () => {
    const { service, update } = build({
      editalUrl: 'https://colado-na-mao.org/e.pdf',
    });

    const res = await service.addConcursoDocuments('c1', [doc({})]);

    expect(res.editalUrlFilled).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('sem edital de abertura no lote, não toca no concurso', async () => {
    const { service, update } = build({ editalUrl: null });

    const res = await service.addConcursoDocuments('c1', [
      doc({ kind: 'RETIFICACAO', url: 'https://banca.org/ret.pdf' }),
      doc({ kind: 'GABARITO', url: 'https://banca.org/gab.pdf' }),
    ]);

    expect(res.editalUrlFilled).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('recusa a home da banca — "Ver edital original" não pode cair na home', async () => {
    const { service, update } = build({ editalUrl: null });

    const res = await service.addConcursoDocuments('c1', [
      doc({ url: 'https://www.idib.org.br/' }),
    ]);

    expect(res.editalUrlFilled).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('com mais de um edital de abertura, vence o publicado mais recente', async () => {
    const { service } = build({ editalUrl: null });

    const res = await service.addConcursoDocuments('c1', [
      doc({ url: 'https://banca.org/original.pdf', publishedAt: '2026-05-10' }),
      doc({
        url: 'https://banca.org/consolidado.pdf',
        publishedAt: '2026-06-01',
      }),
    ]);

    expect(res.editalUrlFilled).toBe('https://banca.org/consolidado.pdf');
  });
});
