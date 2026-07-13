/**
 * Normalizes free text into a URL-safe slug segment
 * (lowercase, ASCII, hyphen-separated). Ex.: "Prefeitura de Campinas" → "prefeitura-de-campinas".
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
