/**
 * O marcador que o usuário pediu: um cartão pequeno ancorado no ponto, com
 * prazo, inscrição e salário legíveis sem interação. Hover/foco abre a ficha
 * completa (Tooltip) e clique abre a mesma ficha fixada + CTA (Popup) — é o
 * Popup que faz isto funcionar no toque, onde hover não existe.
 */
import { useMemo } from 'react'
import L from 'leaflet'
import { Marker, Popup, Tooltip } from 'react-leaflet'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { shortCountdown, shortSalary } from '../concurso-labels'
import { PointDetail } from './PointDetail'
import type { MapPoint } from './concurso-map.logic'

/** Conteúdo do marcador é HTML cru (exigência do Leaflet) → escapar sempre. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/* Classes completas e literais: o Tailwind varre o fonte, então nada de
 * `border-${cor}-500` — não seria gerado. */
const SHELL_BY_STATUS = {
  open: 'border-cyan-500/70 bg-white',
  future: 'border-slate-300 bg-white',
  past: 'border-slate-200 bg-slate-50/95',
} as const

const ACCENT_BY_STATUS = {
  open: 'text-cyan-700',
  future: 'text-slate-600',
  past: 'text-slate-400',
} as const

/**
 * Pílula: instituição (+N) em cima, prazo · salário embaixo. Larga o
 * suficiente para o nome respirar, curta o suficiente para não cobrir o
 * vizinho — daí os rótulos telegráficos (`shortCountdown`/`shortSalary`).
 */
function pillHtml(point: MapPoint): string {
  const { primary, items, recommended } = point
  const extra = items.length - 1
  const countdown = shortCountdown(primary)
  const salary = shortSalary(primary)
  const isOpen = primary.status === 'open'

  const shell = SHELL_BY_STATUS[primary.status]
  const accent = ACCENT_BY_STATUS[primary.status]
  /* Recomendado pelo perfil ganha anel — a recomendação que já existe na lista
   * fica visível no mapa sem precisar abrir nada. */
  const ring = recommended ? 'ring-2 ring-cyan-400 ring-offset-1' : ''

  const openDot = isOpen
    ? '<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500"></span>'
    : ''

  const badge =
    extra > 0
      ? `<span class="ml-1 shrink-0 rounded-full bg-slate-900 px-1.5 py-px text-[10px] font-bold text-white">+${extra}</span>`
      : ''

  const meta = [countdown, salary]
    .filter((v): v is string => v != null && v !== '')
    .map(escapeHtml)
    .join(' · ')

  return `
    <div class="flex max-w-[190px] cursor-pointer flex-col gap-0.5 rounded-xl border ${shell} ${ring} px-2 py-1.5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.25)] transition-transform hover:z-[1000] hover:scale-105">
      <div class="flex items-center gap-1">
        ${openDot}
        <span class="min-w-0 flex-1 truncate text-[11px] font-bold leading-tight text-slate-900">${escapeHtml(primary.institution)}</span>
        ${badge}
      </div>
      <span class="truncate text-[10px] font-semibold leading-tight ${accent}">${meta}</span>
    </div>
  `
}

export function ConcursoMarker({ point }: { point: MapPoint }) {
  /* O divIcon é recriado só quando o conteúdo muda: recriar a cada render faz
   * o Leaflet remontar o marcador e piscar. */
  const icon = useMemo(
    () =>
      L.divIcon({
        html: pillHtml(point),
        className:
          point.precision === 'state'
            ? 'concurso-pill concurso-pill--approx'
            : 'concurso-pill',
        /* Âncora no centro-baixo: a pílula "aponta" para a coordenada. */
        iconSize: [190, 38],
        iconAnchor: [95, 38],
        popupAnchor: [0, -38],
      }),
    [point],
  )

  const target = point.primary.slug

  return (
    <Marker position={[point.lat, point.lng]} icon={icon} riseOnHover>
      {/* Hover e foco por teclado (o marcador do Leaflet é focável). */}
      <Tooltip
        direction="top"
        offset={[0, -42]}
        opacity={1}
        className="concurso-tooltip"
      >
        <PointDetail
          label={point.label}
          items={point.items}
          precision={point.precision}
        />
      </Tooltip>

      {/* Clique: mesma ficha, fixada, com a saída para a página do concurso. */}
      <Popup>
        <PointDetail
          label={point.label}
          items={point.items}
          precision={point.precision}
        />
        <Link
          to="/concursos/$concursoSlug"
          params={{ concursoSlug: target }}
          aria-label={`Ver concurso ${point.primary.institution} ${point.primary.year}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-700 no-underline hover:text-cyan-800"
        >
          Ver concurso
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </Popup>
    </Marker>
  )
}
