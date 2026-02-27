export function formatBRL(value: string | number) {
  const number = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(number)) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(number)
}

/** Formato do título da prova: Ano · Cidade/Estado · Instituição */
export type ExamBaseTitleInput = {
  examDate: string
  governmentScope?: 'MUNICIPAL' | 'STATE' | 'FEDERAL'
  city?: string | null
  state?: string | null
  institution?: string | null
  name?: string
}

export function formatExamBaseTitle(exam: ExamBaseTitleInput): string {
  const year = new Date(exam.examDate).getFullYear()
  const institution = exam.institution ?? exam.name ?? 'Concurso'

  let locationPart = ''
  const scope = exam.governmentScope ?? (exam.city && exam.state ? 'MUNICIPAL' : exam.state ? 'STATE' : 'FEDERAL')
  if (scope === 'MUNICIPAL' && (exam.city || exam.state)) {
    locationPart = exam.city && exam.state ? `${exam.city}/${exam.state}` : (exam.city ?? exam.state ?? '')
  } else if (scope === 'STATE' && exam.state) {
    locationPart = exam.state
  }
  // Federal: não mostra cidade/estado

  const parts = [String(year), locationPart, institution].filter(Boolean)
  return parts.join(' · ')
}