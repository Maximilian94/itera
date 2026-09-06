/**
 * Recorte do edital nas janelas de texto onde UM cargo aparece — o palheiro
 * menor é o que dá recall ao extrator literal (fichas) e ao quadro de matérias.
 *
 * Duas armadilhas motivam a complexidade daqui, ambas observadas em editais
 * reais com mais de um cargo de enfermagem:
 *
 * 1. **Colisão por prefixo.** `indexOf("ENFERMEIRO")` casa dentro de
 *    "ENFERMEIRO PLANTONISTA" e "ENFERMEIRO DO TRABALHO". Sem saber quais são
 *    os cargos IRMÃOS, o cargo genérico herda as ocorrências dos específicos e
 *    o recorte deixa de ser dele.
 *
 * 2. **Corte cego pelas pontas.** Manter só as primeiras e as últimas
 *    ocorrências (o que esta função fazia) decapita o ANEXO DE ATRIBUIÇÕES,
 *    que mora no MEIO do edital, e entrega no lugar dele o ANEXO DE CONTEÚDO
 *    PROGRAMÁTICO, que costuma ser o último. O extrator então transcrevia a
 *    lista de matérias da prova como se fosse a atribuição do cargo.
 *
 * A seleção aqui é por PONTUAÇÃO: cada ocorrência é julgada pelo texto ao redor
 * (é um cabeçalho de seção? fala de atribuições ou de conteúdo programático?) e
 * as melhores para o `purpose` pedido vencem — em vez de as mais extremas.
 */

/** O que a chamada seguinte vai pedir ao modelo — muda quais janelas servem. */
export type FocusPurpose = 'fichas' | 'syllabus';

export interface FocusOptions {
  /**
   * TODOS os cargos do edital. Usado para rejeitar ocorrências que na verdade
   * pertencem a um cargo de nome mais longo. Sem isto, "Enfermeiro" e
   * "Enfermeiro Plantonista" recebem o mesmo recorte.
   */
  allRoles?: string[];
  purpose?: FocusPurpose;
  /** Orçamento de chars do recorte inteiro (repartido entre os cargos). */
  maxChars?: number;
}

const WINDOW_BEFORE = 2_000;
const WINDOW_AFTER = 8_000;
const MAX_HITS_PER_ROLE = 8;
const DEFAULT_MAX_CHARS = 400_000;

/** Marcadores da seção de atribuições/requisitos (sem acento, caixa alta). */
const FICHA_MARKERS = [
  'ATRIBUI',
  'DESCRICAO SUMARIA',
  'DESCRICAO DAS ATIVIDADES',
  'DESCRICAO DETALHADA',
  'SINTESE DAS ATRIBUI',
  'REQUISITO',
  'ESCOLARIDADE',
  'PRE-REQUISITO',
];

/** Marcadores do conteúdo programático / quadro de provas. */
const SYLLABUS_MARKERS = [
  'CONTEUDO PROGRAMATICO',
  'PROGRAMA DAS PROVAS',
  'QUADRO DE PROVAS',
  'DISTRIBUICAO DAS QUESTOES',
  'DISTRIBUICAO DE QUESTOES',
  'CONHECIMENTOS ESPECIFICOS',
  'CONHECIMENTOS GERAIS',
  'LINGUA PORTUGUESA',
  'RACIOCINIO LOGICO',
];

// Dobra de acentos char-a-char. ⚠️ NÃO usar `normalize('NFD')` aqui: ela
// DESLOCA os índices (um "Ç" vira 2 chars) e os offsets calculados sobre o
// texto dobrado são usados para fatiar o texto ORIGINAL. A troca 1:1 preserva
// o comprimento.
const ACCENTED = 'ÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÇÑÝ';
const PLAIN = 'AAAAAAEEEEIIIIOOOOOUUUUCNY';

/** Caixa alta e sem diacríticos, preservando o comprimento da string. */
function fold(s: string): string {
  let out = s.toUpperCase();
  for (let i = 0; i < ACCENTED.length; i++) {
    out = out.split(ACCENTED[i]).join(PLAIN[i]);
  }
  return out;
}

function findHits(haystack: string, needle: string): number[] {
  const hits: number[] = [];
  if (!needle) return hits;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) break;
    hits.push(idx);
    from = idx + needle.length;
  }
  return hits;
}

/**
 * Ocorrências de `role` que na verdade abrem o nome de um cargo mais
 * específico ("Enfermeiro" dentro de "Enfermeiro Plantonista") não são deste
 * cargo. Se a rejeição zerar tudo, devolve os hits originais — recall pobre é
 * ruim, recall nulo é pior.
 */
function rejectSiblingHits(
  folded: string,
  hits: number[],
  role: string,
  allRoles: string[],
): number[] {
  const foldedRole = fold(role);
  const siblings = allRoles
    .map(fold)
    .filter((r) => r !== foldedRole && r.startsWith(foldedRole));
  if (siblings.length === 0) return hits;
  const kept = hits.filter(
    (idx) => !siblings.some((s) => folded.startsWith(s, idx)),
  );
  return kept.length > 0 ? kept : hits;
}

/**
 * Uma ocorrência vale mais quando abre uma SEÇÃO do cargo (nome sozinho na
 * linha) e quando o texto ao redor fala do que vamos pedir. Falar do assunto
 * oposto penaliza: é assim que a janela do conteúdo programático para de ser
 * escolhida quando o pedido é a ficha.
 */
function scoreHit(
  folded: string,
  idx: number,
  needleLen: number,
  purpose: FocusPurpose,
): number {
  const wanted = purpose === 'syllabus' ? SYLLABUS_MARKERS : FICHA_MARKERS;
  const other = purpose === 'syllabus' ? FICHA_MARKERS : SYLLABUS_MARKERS;
  const context =
    folded.slice(Math.max(0, idx - 1_200), idx) +
    folded.slice(idx + needleLen, idx + needleLen + 800);

  let score = 0;
  if (wanted.some((m) => context.includes(m))) score += 3;
  if (other.some((m) => context.includes(m))) score -= 2;

  // Cabeçalho de seção: só espaço/pontuação entre o início da linha e o cargo,
  // e a linha termina logo depois do nome.
  const lineStart = folded.lastIndexOf('\n', idx) + 1;
  const prefix = folded.slice(lineStart, idx);
  const lineEnd = folded.indexOf('\n', idx + needleLen);
  const suffix = folded.slice(
    idx + needleLen,
    lineEnd === -1 ? folded.length : lineEnd,
  );
  if (/^[\s\-–—•*#|]*$/.test(prefix) && suffix.trim().length <= 40) score += 2;

  return score;
}

/**
 * Recorta de `text` as janelas onde `roles` aparecem, escolhendo as melhores
 * para `purpose` dentro de um orçamento repartido igualmente entre os cargos.
 * Devolve o texto inteiro quando nenhum cargo é encontrado (melhor mandar tudo
 * do que mandar nada).
 */
export function buildFocusedText(
  text: string,
  roles: string[],
  opts: FocusOptions = {},
): string {
  const purpose = opts.purpose ?? 'fichas';
  const maxChars = opts.maxChars ?? DEFAULT_MAX_CHARS;
  const allRoles = opts.allRoles ?? roles;
  const folded = fold(text);

  // Orçamento por cargo: sem isto, o recorte dos primeiros cargos consome o
  // limite e os últimos são truncados fora da chamada, silenciosamente.
  const budgetPerRole = Math.max(
    WINDOW_BEFORE + WINDOW_AFTER,
    Math.floor(maxChars / Math.max(1, roles.length)),
  );

  const windows: [number, number][] = [];

  for (const role of roles) {
    const foldedRole = fold(role);
    let hits = rejectSiblingHits(
      folded,
      findHits(folded, foldedRole),
      role,
      allRoles,
    );

    if (hits.length === 0) {
      // "Motorista - Categoria B" pode aparecer sem o hífen no anexo: cai para
      // o token mais longo do nome (>=5 letras).
      const token = foldedRole
        .split(/[^A-Z]+/)
        .filter((t) => t.length >= 5)
        .sort((a, b) => b.length - a.length)[0];
      if (token) hits = findHits(folded, token);
      if (hits.length === 0) continue;
    }

    const scored = hits.map((idx, order) => ({
      idx,
      order,
      score: scoreHit(folded, idx, foldedRole.length, purpose),
    }));

    // A primeira ocorrência é quase sempre o quadro de vagas (salário, carga,
    // requisito) — entra sempre, independentemente da nota.
    const first = scored[0];
    const rest = scored
      .slice(1)
      .sort((a, b) => b.score - a.score || a.order - b.order);

    const perRoleWindows = Math.max(
      1,
      Math.min(
        MAX_HITS_PER_ROLE,
        Math.floor(budgetPerRole / (WINDOW_BEFORE + WINDOW_AFTER)),
      ),
    );

    for (const hit of [first, ...rest].slice(0, perRoleWindows)) {
      windows.push([
        Math.max(0, hit.idx - WINDOW_BEFORE),
        Math.min(text.length, hit.idx + WINDOW_AFTER),
      ]);
    }
  }

  if (windows.length === 0) return text;

  windows.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const w of windows) {
    const last = merged[merged.length - 1];
    if (last && w[0] <= last[1]) last[1] = Math.max(last[1], w[1]);
    else merged.push([w[0], w[1]]);
  }
  return merged.map(([s, e]) => text.slice(s, e)).join('\n[...]\n');
}
