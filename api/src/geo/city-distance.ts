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

/**
 * Normalização de nome de cidade (texto livre → chave do índice).
 *
 * Hífen e apóstrofo viram espaço porque a grafia varia entre fontes: o edital
 * escreve "São João del-Rei" e a base IBGE guarda "sao joao del rei". É
 * aplicada nos DOIS lados (consulta e índice) — normalizar só a consulta
 * quebraria os 72 municípios cujo nome oficial tem hífen/apóstrofo
 * ("Apicum-Açu", "Alta Floresta d'Oeste"). Simétrica, não colide: as 5.571
 * chaves continuam únicas dentro da UF.
 */
export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

let index: Map<string, Municipio> | null = null;

function getIndex(): Map<string, Municipio> {
  if (index == null) {
    index = new Map(
      (municipios as Municipio[]).map((m) => [
        `${m.u}|${normalizeName(m.n)}`,
        m,
      ]),
    );
  }
  return index;
}

function lookup(state: string, city: string): Municipio | undefined {
  return getIndex().get(
    `${state.trim().toUpperCase()}|${normalizeName(city)}`,
  );
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

/**
 * Ponto no mapa. `precision` diz o quanto se pode confiar nele: `city` é o
 * centroide do próprio município; `state` é o centroide da UF (usado quando o
 * concurso é estadual e não tem cidade) — o front sinaliza os dois de forma
 * diferente para não fingir precisão que não existe.
 */
export interface GeoPoint {
  lat: number;
  lng: number;
  precision: 'city' | 'state';
}

let stateCentroids: Map<string, GeoPoint> | null = null;

/**
 * Centroide da UF = média dos centroides dos seus municípios. É uma âncora
 * grosseira ("algum lugar no meio do estado"), suficiente para posicionar um
 * concurso estadual sem cidade definida. Memoizado no 1º uso.
 */
function stateCentroid(state: string): GeoPoint | undefined {
  if (stateCentroids == null) {
    const acc = new Map<string, { lat: number; lng: number; n: number }>();
    for (const m of municipios as Municipio[]) {
      const cur = acc.get(m.u) ?? { lat: 0, lng: 0, n: 0 };
      cur.lat += m.lat;
      cur.lng += m.lng;
      cur.n += 1;
      acc.set(m.u, cur);
    }
    stateCentroids = new Map(
      [...acc].map(([uf, s]) => [
        uf,
        { lat: s.lat / s.n, lng: s.lng / s.n, precision: 'state' as const },
      ]),
    );
  }
  return stateCentroids.get(state.trim().toUpperCase());
}

/**
 * Resolve a coordenada de um concurso para o mapa: centroide do município
 * quando cidade+UF batem na base IBGE, senão centroide da UF, senão `null`.
 *
 * `null` é um resultado legítimo e esperado — concurso FEDERAL (é nacional,
 * fixá-lo numa capital seria mentira), sem UF, ou com "cidade" que na verdade
 * é uma região ("Oeste do Paraná"). O front lista esses fora do mapa em vez de
 * escondê-los.
 */
export function resolveCoords(ref: CityRef): GeoPoint | null {
  if (!ref.state) return null;
  if (ref.city) {
    const m = lookup(ref.state, ref.city);
    if (m) return { lat: m.lat, lng: m.lng, precision: 'city' };
  }
  return stateCentroid(ref.state) ?? null;
}
