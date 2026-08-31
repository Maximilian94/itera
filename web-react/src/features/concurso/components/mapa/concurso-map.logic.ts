/**
 * Lógica pura da visão Mapa — sem Leaflet, sem React, testável direto.
 * (Mesmo padrão de `features/home/home-logic.ts` e `check-freshness.ts`.)
 *
 * Resolve dois problemas que o mapa cria e a lista não tem:
 *
 * 1. **Coincidência.** Dois concursos na mesma cidade têm a MESMA coordenada.
 *    Como marcadores separados eles se empilham e o de baixo fica inalcançável.
 *    Então agrupamos por ponto e mostramos um marcador só, com "+N".
 * 2. **Ausência.** Concurso FEDERAL ou sem UF não tem lugar no mapa. Ele não
 *    pode sumir — vai para `offMap`, que o front lista abaixo do mapa. É a
 *    mesma regra conservadora do matching: degrada, nunca some.
 */
import { daysUntil } from '../concurso-labels'
import type { ConcursoListItem, ConcursoStatus } from '../../domain/concurso.types'

/** Um ponto no mapa: uma coordenada, um ou mais concursos. */
export type MapPoint = {
  /** Chave estável = a própria coordenada arredondada. */
  key: string
  lat: number
  lng: number
  precision: 'city' | 'state'
  /** "Campinas/SP" (precisão de cidade) ou "PR" (precisão de estado). */
  label: string
  /** Concursos do ponto, o representante primeiro. */
  items: Array<ConcursoListItem>
  /** O representante — quem dá cor e texto ao marcador fechado. */
  primary: ConcursoListItem
  /** Algum concurso do ponto é recomendado pelo perfil → anel de destaque. */
  recommended: boolean
}

export type MapPartition = {
  points: Array<MapPoint>
  /** Concursos sem coordenada (FEDERAL, sem UF): listados fora do mapa. */
  offMap: Array<ConcursoListItem>
}

const STATUS_RANK: Record<ConcursoStatus, number> = {
  open: 0,
  future: 1,
  past: 2,
}

/**
 * Ordem de relevância dentro de um ponto. O primeiro vira o representante.
 *
 * Inscrição aberta ganha de tudo (é a única com ação possível hoje), e entre
 * abertas vence a que fecha antes — o prazo mais curto é o que o usuário
 * precisa ver primeiro. Depois vêm as futuras (prova mais próxima) e, por
 * último, as passadas (mais recente primeiro, que é a mais útil para treinar).
 */
export function compareForPrimary(
  a: ConcursoListItem,
  b: ConcursoListItem,
): number {
  const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (rank !== 0) return rank

  if (a.status === 'open') {
    return byDateAsc(a.timeline.registrationEnd, b.timeline.registrationEnd)
  }
  if (a.status === 'future') {
    return byDateAsc(a.timeline.examDate, b.timeline.examDate)
  }
  /* Passadas: a mais recente primeiro. */
  return -byDateAsc(a.timeline.examDate, b.timeline.examDate)
}

/** Data mais próxima primeiro; sem data vai para o fim (nunca "ganha"). */
function byDateAsc(a: string | null, b: string | null): number {
  const da = daysUntil(a)
  const db = daysUntil(b)
  if (da == null && db == null) return 0
  if (da == null) return 1
  if (db == null) return -1
  return da - db
}

/**
 * Chave do ponto = a coordenada, não o nome da cidade. Coordenada é o que de
 * fato colide na tela, e ela já vem normalizada do backend (mesmo centroide
 * IBGE), então "São Paulo" e "Sao Paulo" caem juntos sem normalizar texto aqui.
 */
function pointKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`
}

function pointLabel(item: ConcursoListItem, precision: 'city' | 'state'): string {
  if (precision === 'city' && item.city != null) {
    return `${item.city}${item.state != null ? `/${item.state}` : ''}`
  }
  return item.state ?? 'Brasil'
}

/** Agrupa os concursos em pontos do mapa e separa os que não são mapeáveis. */
export function buildMapPoints(
  items: Array<ConcursoListItem>,
): MapPartition {
  const groups = new Map<string, Array<ConcursoListItem>>()
  const offMap: Array<ConcursoListItem> = []

  for (const item of items) {
    const c = item.coords
    if (c == null) {
      offMap.push(item)
      continue
    }
    const key = pointKey(c.lat, c.lng)
    const bucket = groups.get(key)
    if (bucket) bucket.push(item)
    else groups.set(key, [item])
  }

  const points: Array<MapPoint> = []
  for (const [key, bucket] of groups) {
    const sorted = [...bucket].sort(compareForPrimary)
    const primary = sorted[0]
    /* Todos do bucket compartilham a coordenada; a precisão é a do primário. */
    const coords = primary.coords!
    points.push({
      key,
      lat: coords.lat,
      lng: coords.lng,
      precision: coords.precision,
      label: pointLabel(primary, coords.precision),
      items: sorted,
      primary,
      recommended: sorted.some((i) => i.match?.recommended === true),
    })
  }

  /* Ordem estável e significativa: o ponto mais "acionável" primeiro. Importa
   * porque é a ordem de pintura — o marcador urgente fica por cima. */
  points.sort((a, b) => compareForPrimary(a.primary, b.primary))
  offMap.sort(compareForPrimary)

  return { points, offMap }
}

/**
 * Caixa que enquadra todos os pontos, como [[sul, oeste], [norte, leste]].
 * `null` quando não há ponto — o chamador cai no enquadramento do Brasil.
 */
export function boundsOf(
  points: Array<MapPoint>,
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null
  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lng < minLng) minLng = p.lng
    if (p.lng > maxLng) maxLng = p.lng
  }
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ]
}

/** Enquadramento inicial: o Brasil inteiro. */
export const BRAZIL_BOUNDS: [[number, number], [number, number]] = [
  [-33.75, -73.99],
  [5.27, -34.79],
]
