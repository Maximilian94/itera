/**
 * Conteúdo rico de um ponto do mapa — os "mais dados" que aparecem no hover
 * (Tooltip) e no clique (Popup). Um componente só para os dois, porque hover e
 * toque têm que contar a mesma história; só o invólucro muda.
 */
import {
  BriefcaseIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import {
  salaryRange,
  temporalClass,
  temporalText,
} from '../concurso-labels'
import { StatusPill } from '../StatusPill'
import type { ConcursoListItem } from '../../domain/concurso.types'

const dayMonthYear = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

function Row({
  icon: Icon,
  children,
}: {
  icon: typeof BriefcaseIcon
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center gap-2 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="min-w-0">{children}</span>
    </li>
  )
}

/** Ficha de um concurso: o que o hover promete a mais que a pílula. */
export function ConcursoDetail({ item }: { item: ConcursoListItem }) {
  const temporal = temporalText(item)
  const salary = salaryRange(item.salaryMin, item.salaryMax)
  const board = item.examBoard?.alias ?? item.examBoard?.name ?? null
  const { registrationStart, registrationEnd } = item.timeline

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <p className="truncate text-sm font-bold text-slate-900">
        {item.institution}
      </p>
      <p className={`text-xs ${temporalClass(item.status, temporal.urgent)}`}>
        {temporal.text}
      </p>

      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        <Row icon={BriefcaseIcon}>
          {item.cargoCount} {item.cargoCount === 1 ? 'cargo' : 'cargos'}
          {item.vacancyTotal > 0 && (
            <>
              {' · '}
              {item.vacancyTotal}{' '}
              {item.vacancyTotal === 1 ? 'vaga' : 'vagas'}
            </>
          )}
          {item.hasCR && ' · CR'}
        </Row>
        {salary != null && (
          <Row icon={UserGroupIcon}>
            <span className="font-semibold text-slate-700">{salary}</span>
          </Row>
        )}
        {board != null && <Row icon={BuildingLibraryIcon}>{board}</Row>}
        {registrationStart != null && registrationEnd != null && (
          <Row icon={CalendarDaysIcon}>
            Inscrições {dayMonthYear.format(new Date(registrationStart))} a{' '}
            {dayMonthYear.format(new Date(registrationEnd))}
          </Row>
        )}
      </ul>
    </div>
  )
}

/**
 * O ponto inteiro. Com um concurso, é a ficha dele; com vários, a ficha do
 * representante e a lista enxuta dos outros — o motivo de existir o "+N".
 */
export function PointDetail({
  label,
  items,
  precision,
}: {
  label: string
  items: Array<ConcursoListItem>
  precision: 'city' | 'state'
}) {
  const [primary, ...rest] = items
  return (
    <div className="flex w-60 min-w-0 flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
        {/* Não fingimos precisão: centroide de UF é dito como tal. */}
        {precision === 'state' && ' · local aproximado'}
      </p>
      <ConcursoDetail item={primary} />

      {rest.length > 0 && (
        <>
          <p className="mt-0.5 border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
            Mais {rest.length}{' '}
            {rest.length === 1 ? 'concurso aqui' : 'concursos aqui'}
          </p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {rest.slice(0, 4).map((item) => {
              const t = temporalText(item)
              return (
                <li key={item.slug} className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-700">
                    {item.institution}
                  </p>
                  <p className={`truncate text-[11px] ${temporalClass(item.status, t.urgent)}`}>
                    {t.text}
                  </p>
                </li>
              )
            })}
            {rest.length > 4 && (
              <li className="text-[11px] text-slate-400">
                e mais {rest.length - 4}…
              </li>
            )}
          </ul>
        </>
      )}
      <StatusPillRow items={items} />
    </div>
  )
}

/** Resumo do ponto quando ele tem mais de um concurso. */
function StatusPillRow({ items }: { items: Array<ConcursoListItem> }) {
  const open = items.filter((i) => i.status === 'open').length
  if (open === 0) return null
  return (
    <div className="pt-0.5">
      <StatusPill
        status="open"
        label={
          open === 1 ? '1 com inscrições abertas' : `${open} com inscrições abertas`
        }
      />
    </div>
  )
}
