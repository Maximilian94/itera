/**
 * Generates a URL-friendly slug from text.
 * Removes accents, replaces spaces/special chars with hyphens, lowercase.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generates a unique slug for ExamBase.
 * Format: banca-estado-cidade-ano-cargo
 * - banca: exam board name (or institution/fallback if no board)
 * - estado: state UF (if applicable)
 * - cidade: city (if applicable, e.g. municipal)
 * - ano: year from exam date
 * - cargo: role
 */
export function generateExamBaseSlug(
  input: {
    examBoardName: string | null;
    institution: string | null;
    state: string | null;
    city: string | null;
    examDate: Date;
    role: string;
  },
  existingSlugs: string[],
  idPrefix?: string,
): string {
  const banca =
    input.examBoardName?.trim() ||
    input.institution?.trim() ||
    'sem-banca';
  const year = input.examDate.getFullYear().toString();

  const parts: string[] = [slugify(banca)];

  if (input.state?.trim()) {
    parts.push(slugify(input.state.trim()));
  }
  if (input.city?.trim()) {
    parts.push(slugify(input.city.trim()));
  }

  parts.push(year);
  parts.push(slugify(input.role));

  const base = parts.join('-');
  const candidate = idPrefix ? `${base}-${idPrefix}` : base;

  if (!existingSlugs.includes(candidate)) {
    return candidate;
  }

  const suffix = idPrefix ?? Math.random().toString(36).slice(2, 10);
  return `${base}-${suffix}`;
}
