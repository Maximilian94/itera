import { looksLikeChallenge } from './document-scraper.service';

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
