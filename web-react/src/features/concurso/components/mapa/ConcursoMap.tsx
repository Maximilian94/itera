/**
 * Visão Mapa da listagem de concursos.
 *
 * Recebe os concursos JÁ FILTRADOS pela rota — o mapa é uma forma de ver a
 * mesma seleção da lista, não uma consulta paralela. Por isso não busca nada.
 *
 * Tiles: OpenStreetMap padrão — o único basemap de verdade SEM chave de API
 * (o CARTO Positron, tentado antes, hoje carimba "API KEY REQUIRED" nos
 * tiles). Como o OSM padrão é colorido e brigaria com a paleta slate/cyan do
 * DESIGN.md, dessaturamos os tiles por CSS (`map.css`): num mapa de dados a
 * base tem que recuar para os marcadores aparecerem. A atribuição no rodapé é
 * obrigatória pela licença.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import Supercluster from 'supercluster'
import { ConcursoMarker } from './ConcursoMarker'
import { ClusterMarker } from './ClusterMarker'
import { BRAZIL_BOUNDS, boundsOf, buildMapPoints } from './concurso-map.logic'
import type { MapPoint } from './concurso-map.logic'
import type { ConcursoListItem } from '../../domain/concurso.types'

import 'leaflet/dist/leaflet.css'
import './map.css'

/** Zoom a partir do qual não agrupamos mais: as pílulas já cabem. */
const CLUSTER_MAX_ZOOM = 11
const CLUSTER_RADIUS = 80

type PointProps = { point: MapPoint }

function MarkerLayer({ points }: { points: Array<MapPoint> }) {
  const map = useMap()
  const [version, setVersion] = useState(0)

  /* Recalcula os clusters a cada pan/zoom. Guardamos só um contador: os dados
   * de bounds/zoom são lidos do próprio mapa na hora de renderizar. */
  useMapEvents({
    moveend: () => setVersion((v) => v + 1),
    zoomend: () => setVersion((v) => v + 1),
  })

  const cluster = useMemo(() => {
    const index = new Supercluster<PointProps>({
      radius: CLUSTER_RADIUS,
      maxZoom: CLUSTER_MAX_ZOOM,
    })
    index.load(
      points.map((point) => ({
        type: 'Feature' as const,
        properties: { point },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat] as [number, number],
        },
      })),
    )
    return index
  }, [points])

  const clusters = useMemo(() => {
    const b = map.getBounds()
    const zoom = Math.round(map.getZoom())
    return cluster.getClusters(
      [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
      zoom,
    )
    /* `version` não é lido aqui de propósito: é só o gatilho — muda a cada
     * pan/zoom e força reler bounds/zoom direto do mapa. */
  }, [cluster, map, version])

  const zoomInto = useCallback(
    (clusterId: number, lat: number, lng: number) => {
      const target = Math.min(
        cluster.getClusterExpansionZoom(clusterId),
        CLUSTER_MAX_ZOOM + 2,
      )
      map.flyTo([lat, lng], target, { duration: 0.6 })
    },
    [cluster, map],
  )

  return (
    <>
      {clusters.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates
        const props = feature.properties

        /* O supercluster devolve uma união: bolha agregada ou ponto solto.
         * `'cluster' in props` é o discriminante — só a bolha tem a chave. */
        if ('cluster' in props) {
          const { cluster_id: id, point_count: count } = props
          /* `hasOpen` exige olhar as folhas; o custo é baixo (só os visíveis)
           * e é o que decide a cor da bolha. */
          const hasOpen = cluster
            .getLeaves(id, Infinity)
            .some((l) => l.properties.point.primary.status === 'open')
          return (
            <ClusterMarker
              key={`c-${id}`}
              lat={lat}
              lng={lng}
              count={count}
              hasOpen={hasOpen}
              onClick={() => zoomInto(id, lat, lng)}
            />
          )
        }

        return <ConcursoMarker key={props.point.key} point={props.point} />
      })}
    </>
  )
}

/**
 * Reenquadra quando a seleção muda (filtrar por estado na toolbar deve levar o
 * mapa até lá). Depende de `bounds`, que só troca de identidade quando os
 * pontos mudam — assim o mapa não briga com o pan do usuário a cada render.
 *
 * O timer é adiado (o container precisa estar dimensionado antes do fitBounds)
 * e CANCELADO no cleanup: sem isso, trocar para Lista logo após abrir o mapa
 * dispara o fitBounds num mapa já destruído e estoura.
 */
function FitToPoints({
  bounds,
}: {
  bounds: [[number, number], [number, number]]
}) {
  const map = useMap()

  useEffect(() => {
    const id = setTimeout(() => {
      map.invalidateSize()
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
    }, 0)
    return () => clearTimeout(id)
  }, [bounds, map])

  return null
}

export function ConcursoMap({ items }: { items: Array<ConcursoListItem> }) {
  const { points, offMap } = useMemo(() => buildMapPoints(items), [items])
  /* Identidade estável enquanto os pontos não mudam — é o gatilho do reenquadre. */
  const bounds = useMemo(() => boundsOf(points) ?? BRAZIL_BOUNDS, [points])

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative h-[clamp(420px,62vh,720px)] w-full overflow-hidden rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(15,23,42,0.08)]"
        /* O mapa é uma imagem interativa complexa: nomeá-lo dá ao leitor de
         * tela um marco navegável em vez de uma pilha de botões soltos. */
        role="region"
        aria-label={`Mapa de concursos — ${points.length} ${points.length === 1 ? 'local' : 'locais'}`}
      >
        <MapContainer
          bounds={BRAZIL_BOUNDS}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          <FitToPoints bounds={bounds} />
          <MarkerLayer points={points} />
        </MapContainer>

        {points.length === 0 && (
          <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/70">
            <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
              Nenhum concurso com local definido nesta seleção.
            </p>
          </div>
        )}
      </div>

      {/* Rodapé de leitura do mapa: sem isto, "scroll não dá zoom" vira bug
       * percebido, e o marcador tracejado vira mistério. */}
      <p className="text-xs text-slate-400">
        Use os botões + / − para aproximar. Marcador tracejado = localização
        aproximada (centro do estado).
      </p>

      {offMap.length > 0 && <OffMapList items={offMap} />}
    </div>
  )
}

/**
 * Concursos sem ponto no mapa (federais, sem UF). Ficam visíveis logo abaixo
 * porque sumir seria pior que não posicionar: é a mesma regra conservadora do
 * matching — degrada, nunca esconde.
 */
function OffMapList({ items }: { items: Array<ConcursoListItem> }) {
  return (
    <section
      aria-label="Concursos sem localização no mapa"
      className="flex flex-col gap-2"
    >
      <h3 className="text-sm font-bold text-slate-500">
        Nacionais e sem local definido ({items.length})
      </h3>
      <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.slug}>
            <OffMapRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function OffMapRow({ item }: { item: ConcursoListItem }) {
  return (
    <a
      href={`/concursos/${item.slug}`}
      className="flex flex-col gap-0.5 rounded-xl border border-slate-200 bg-white px-3 py-2 no-underline transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
    >
      <span className="truncate text-sm font-bold text-slate-900">
        {item.institution}
      </span>
      <span className="text-xs text-slate-500">
        {item.governmentScope === 'FEDERAL' ? 'Federal' : (item.state ?? 'Brasil')}
        {' · '}
        {item.cargoCount} {item.cargoCount === 1 ? 'cargo' : 'cargos'}
      </span>
    </a>
  )
}
