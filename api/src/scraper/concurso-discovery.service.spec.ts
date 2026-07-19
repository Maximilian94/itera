import {
  classifyCandidates,
  normalizeInstitution,
  parseCandidates,
  type ExistingConcursoRef,
} from './concurso-discovery.service';

// Trecho fiel do HTML real de /cargos/enfermeiro (dois concursos + links de vaga).
const FIXTURE = `
<ul class="link-d"><li><a
    href="https://www.pciconcursos.com.br/noticias/prefeitura-de-santos-sp-abre-cinco-editais-de-concursos-publicos"
    title="Prefeitura de Santos - SP abre cinco editais de concursos públicos"
    class="noticia_desc n293767">Prefeitura de Santos - SP <small><i class="fa-solid fa-external-link-square"></i></small></a></li></ul>
<ul class="link-i"><li><a href="https://www.pciconcursos.com.br/concursos/vagas/enfermeiro" title="Concursos para ENFERMEIRO"><i class="fas fa-staff-snake"></i>ENFERMEIRO</a></li></ul>
<ul class="link-d"><li><a
    href="https://www.pciconcursos.com.br/noticias/hospital-metropolitano-odilon-behrens-mg-abre-concurso"
    title="Hospital Metropolitano Odilon Behrens - MG abre concurso público"
    class="noticia_desc n293800">Hospital Metropolitano Odilon Behrens - MG <small><i class="fa-solid fa-external-link-square"></i></small></a></li></ul>
<ul class="link-i"><li><a href="https://www.pciconcursos.com.br/concursos/vagas/enfermeiro-intensivista" title="Concursos para ENFERMEIRO INTENSIVISTA">ENFERMEIRO INTENSIVISTA</a></li></ul>
`;

describe('parseCandidates', () => {
  it('extrai um candidato por a.noticia_desc, separando instituição e UF', () => {
    const candidates = parseCandidates(FIXTURE);
    expect(candidates).toHaveLength(2);

    expect(candidates[0]).toEqual({
      institution: 'Prefeitura de Santos',
      uf: 'SP',
      headline:
        'Prefeitura de Santos - SP abre cinco editais de concursos públicos',
      newsUrl:
        'https://www.pciconcursos.com.br/noticias/prefeitura-de-santos-sp-abre-cinco-editais-de-concursos-publicos',
    });
    expect(candidates[1].institution).toBe(
      'Hospital Metropolitano Odilon Behrens',
    );
    expect(candidates[1].uf).toBe('MG');
  });

  it('resolve href relativo e ignora os links de vaga (link-i)', () => {
    const candidates = parseCandidates(
      '<ul class="link-d"><li><a href="/noticias/prefeitura-de-x-ba-abre" title="Prefeitura de X - BA" class="noticia_desc">Prefeitura de X - BA</a></li></ul>' +
        '<ul class="link-i"><li><a href="/concursos/vagas/enfermeiro">ENFERMEIRO</a></li></ul>',
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].newsUrl).toBe(
      'https://www.pciconcursos.com.br/noticias/prefeitura-de-x-ba-abre',
    );
  });

  it('deduplica a mesma notícia repetida na página', () => {
    const row =
      '<ul class="link-d"><li><a href="https://www.pciconcursos.com.br/noticias/a" title="Prefeitura A - SP" class="noticia_desc">Prefeitura A - SP</a></li></ul>';
    expect(parseCandidates(row + row)).toHaveLength(1);
  });
});

describe('normalizeInstitution', () => {
  it('tira acento, caixa e pontuação, colapsa espaços', () => {
    expect(normalizeInstitution('Prefeitura de São João')).toBe(
      'prefeitura de sao joao',
    );
    expect(normalizeInstitution('  Câmara  Municipal- ')).toBe(
      'camara municipal',
    );
  });
});

describe('classifyCandidates', () => {
  const candidates = parseCandidates(FIXTURE);

  it('marca "new" quando nada casa na base', () => {
    const result = classifyCandidates(candidates, []);
    expect(result.map((c) => c.status)).toEqual(['new', 'new']);
    expect(result[0].matched).toBeNull();
  });

  it('marca "exists" por URL da notícia (dedupe exato)', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c1',
        slug: 'santos-2026',
        institution: 'Outro Nome Qualquer',
        state: null,
        pciListingUrl: candidates[0].newsUrl,
      },
    ];
    const result = classifyCandidates(candidates, existing);
    expect(result[0].status).toBe('exists');
    expect(result[0].matched).toEqual({ id: 'c1', slug: 'santos-2026' });
    expect(result[1].status).toBe('new');
  });

  it('marca "exists" por instituição + UF quando não há URL salva', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c2',
        slug: null,
        institution: 'PREFEITURA DE SANTOS',
        state: 'SP',
        pciListingUrl: null,
      },
    ];
    const result = classifyCandidates(candidates, existing);
    expect(result[0].status).toBe('exists');
    expect(result[0].matched).toEqual({ id: 'c2', slug: null });
  });

  it('não casa quando a UF difere', () => {
    const existing: ExistingConcursoRef[] = [
      {
        id: 'c3',
        slug: null,
        institution: 'Prefeitura de Santos',
        state: 'RJ',
        pciListingUrl: null,
      },
    ];
    expect(classifyCandidates(candidates, existing)[0].status).toBe('new');
  });
});
