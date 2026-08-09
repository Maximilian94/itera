import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import type { ConcursoListItem } from '@/features/concurso/domain/concurso.types'
import { matchReasonLabel } from '@/features/preference/components/match-copy'
import { institutionMark } from '../home-logic'

function formatSalary(value: string | null): string | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/**
 * "Recomendados para você": até 3 concursos do match do perfil, excluindo os
 * que já são meta. Lista em linhas (não grid de cards), com chips de motivo.
 */
export function RecommendedList({
  concursos,
  excludeConcursoIds,
  hasPreference,
}: {
  concursos: ConcursoListItem[]
  /** Ids e slugs de concursos que já são meta do usuário. */
  excludeConcursoIds: Set<string>
  hasPreference: boolean
}) {
  if (!hasPreference) {
    return (
      <section aria-labelledby="reco-title">
        <h2 id="reco-title" className="text-base font-extrabold tracking-tight text-slate-900">
          Recomendados para você
        </h2>
        <Link
          to="/concursos"
          className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-inherit no-underline shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="text-sm text-slate-700">
            Conte onde você busca concursos e o salário mínimo que procura: a
            home passa a recomendar os editais certos para você.
          </span>
          <span className="shrink-0 text-sm font-bold text-cyan-700">
            Criar perfil
          </span>
        </Link>
      </section>
    )
  }

  const recommended = concursos
    .filter((c) => c.match?.recommended)
    .filter(
      (c) =>
        !excludeConcursoIds.has(c.slug) &&
        (c.id == null || !excludeConcursoIds.has(c.id)),
    )
    .slice(0, 3)

  if (recommended.length === 0) return null

  return (
    <section aria-labelledby="reco-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="reco-title" className="text-base font-extrabold tracking-tight text-slate-900">
          Recomendados para você
        </h2>
        <Link
          to="/concursos"
          className="text-xs font-bold text-cyan-700 no-underline hover:underline"
        >
          Ver todos os concursos
        </Link>
      </div>
      <ul className="mt-2.5 flex list-none flex-col gap-2 p-0">
        {recommended.map((c) => {
          const salary = formatSalary(c.salaryMax ?? c.salaryMin)
          const sub = [
            c.city ? `${c.city}/${c.state}` : (c.state ?? 'Nacional'),
            c.examBoard?.alias ?? c.examBoard?.name,
            salary,
            c.vacancyTotal > 0 ? `${c.vacancyTotal} vagas` : null,
          ]
            .filter(Boolean)
            .join(' · ')
          const reasons = (c.match?.reasons ?? []).slice(0, 2)
          return (
            <li key={c.slug}>
              <Link
                to="/concursos/$concursoSlug"
                params={{ concursoSlug: c.slug }}
                className="flex items-center gap-3.5 rounded-xl border border-slate-300 bg-white px-4 py-3 text-inherit no-underline shadow-sm transition-shadow hover:shadow-md"
              >
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-xs font-extrabold text-slate-600"
                >
                  {institutionMark(c.institution)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">
                    {c.institution} · {c.year}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {sub}
                  </span>
                </span>
                <span className="hidden shrink-0 gap-1.5 sm:flex">
                  {reasons.map((r) => (
                    <span
                      key={r}
                      className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800"
                    >
                      {matchReasonLabel(r, c.match)}
                    </span>
                  ))}
                </span>
                <ChevronRightIcon
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-slate-400"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
