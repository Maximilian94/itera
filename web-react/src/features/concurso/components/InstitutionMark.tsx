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

/** Marca da instituição: monograma sóbrio, sem mascote.
 *  `md` (padrão) = cabeçalho do nível 1; `sm` = list-rows compactos. */
export function InstitutionMark({
  institution,
  size = 'md',
}: {
  institution: string
  size?: 'sm' | 'md'
}) {
  const sizing =
    size === 'sm'
      ? 'h-10 w-10 rounded-xl text-sm'
      : 'h-12 w-12 rounded-2xl text-sm sm:h-14 sm:w-14 sm:text-base'
  return (
    <div
      aria-hidden
      className={`flex shrink-0 select-none items-center justify-center bg-slate-100 font-extrabold tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/80 ${sizing}`}
    >
      {institutionInitials(institution)}
    </div>
  )
}
