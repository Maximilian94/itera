/**
 * Bolha de agregação. Em zoom de país, 155 pílulas viram uma mancha ilegível
 * no Sudeste; a bolha diz "há N concursos aqui" e o clique aproxima até eles
 * se separarem.
 */
import { useMemo } from 'react'
import L from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'

/** Bolha cresce com a quantidade, mas com teto — senão vira um disco. */
function sizeFor(count: number): number {
  if (count < 10) return 36
  if (count < 50) return 44
  return 52
}

export function ClusterMarker({
  lat,
  lng,
  count,
  hasOpen,
  onClick,
}: {
  lat: number
  lng: number
  count: number
  /** Algum concurso do grupo com inscrição aberta → bolha em cyan (ação). */
  hasOpen: boolean
  onClick: () => void
}) {
  const size = sizeFor(count)

  const icon = useMemo(() => {
    const tone = hasOpen
      ? 'bg-cyan-600/90 text-white ring-cyan-300'
      : 'bg-slate-700/90 text-white ring-slate-300'
    return L.divIcon({
      html: `<div class="flex h-full w-full items-center justify-center rounded-full ${tone} text-sm font-extrabold shadow-md ring-4 transition-transform hover:scale-110">${count}</div>`,
      className: 'concurso-cluster',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }, [count, hasOpen, size])

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      /* O texto acessível do agrupamento: leitor de tela não vê a bolha. */
      alt={`${count} concursos nesta região. Ative para aproximar.`}
    >
      <Tooltip direction="top" offset={[0, -sizeFor(count) / 2]}>
        <span className="text-xs font-semibold text-slate-700">
          {count} concursos · aproxime para ver
        </span>
      </Tooltip>
    </Marker>
  )
}
