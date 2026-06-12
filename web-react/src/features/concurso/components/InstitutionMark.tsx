/** Palavras que não carregam identidade no nome de um órgão público. */
const STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/**
 * Iniciais do monograma a partir do nome da instituição:
 * primeira letra da primeira e da última palavra significativa
 * ("Prefeitura Municipal de Campinas" → "PC"); nomes de uma palavra
 * usam as duas primeiras letras ("Cebraspe" → "CE").
 */
export function institutionInitials(institution: string): string {
  const words = institution
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((w) => w.length > 0 && !STOPWORDS.has(w.toLocaleLowerCase('pt-BR')))
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase('pt-BR')
  return (words[0][0] + words[words.length - 1][0]).toLocaleUpperCase('pt-BR')
}

/** Marca da instituição: monograma sóbrio, sem mascote. */
export function InstitutionMark({ institution }: { institution: string }) {
  return (
    <div
      aria-hidden
      className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-2xl bg-slate-900 text-sm font-extrabold tracking-wide text-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.35)] sm:h-14 sm:w-14 sm:text-base"
    >
      {institutionInitials(institution)}
    </div>
  )
}
