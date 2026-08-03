import municipios from './municipios.json';

/**
 * Estimativa de tempo de viagem entre municípios para o matching de
 * concursos: centroides IBGE (municipios.json, gerado por
 * scripts/build-municipios.mjs) + distância em linha reta (haversine)
 * corrigida por um fator de estrada e velocidade média rodoviária.
 *
 * Não é rota real — é uma aproximação honesta o suficiente para responder
 * "dá para ir?" na recomendação (a copy do front diz "~40 min").
 */

interface Municipio {
  /** UF (sigla). */
  u: string;
  /** Nome normalizado (minúsculas, sem acentos). */
  n: string;
  lat: number;
  lng: number;
}

/** Estrada real ≈ 1.3× a linha reta (malha rodoviária brasileira). */
const ROAD_FACTOR = 1.3;
/** Média rodoviária intermunicipal (km/h). */
const AVG_SPEED_KMH = 70;
const EARTH_RADIUS_KM = 6371;

/** Normalização de nome de cidade (texto livre → chave do índice). */
export function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

let index: Map<string, Municipio> | null = null;

function lookup(state: string, city: string): Municipio | undefined {
  if (index == null) {
    index = new Map(
      (municipios as Municipio[]).map((m) => [`${m.u}|${m.n}`, m]),
    );
  }
  return index.get(`${state.trim().toUpperCase()}|${normalizeName(city)}`);
}

function haversineKm(a: Municipio, b: Municipio): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface CityRef {
  state: string | null;
  city: string | null;
}

/**
 * Minutos estimados de viagem entre duas cidades; `0` para a mesma cidade,
 * `null` quando algum lado não é geocodificável (cidade texto-livre fora da
 * base IBGE, ou state/city ausentes) — o matching trata null como
 * "não recomendável" (decisão conservadora).
 */
export function estimateTravelMinutes(
  from: CityRef,
  to: CityRef,
): number | null {
  if (!from.state || !from.city || !to.state || !to.city) return null;
  if (
    from.state.trim().toUpperCase() === to.state.trim().toUpperCase() &&
    normalizeName(from.city) === normalizeName(to.city)
  ) {
    return 0;
  }
  const a = lookup(from.state, from.city);
  const b = lookup(to.state, to.city);
  if (!a || !b) return null;
  const km = haversineKm(a, b) * ROAD_FACTOR;
  return Math.round((km / AVG_SPEED_KMH) * 60);
}
