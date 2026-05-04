import { readAttribution, writeAttribution } from "./storage";
import type { AttributionData } from "./types";

/**
 * First-touch attribution capture (§8.1 do doc).
 *
 * Roda em qualquer pageview, mas SÓ persiste se não houver entry prévia
 * dentro da janela de TTL — preserva a fonte que originalmente trouxe o
 * usuário, mesmo se ele voltar por outro canal depois.
 *
 * Lê de:
 *  - URL: utm_source/medium/campaign/content/term, fbclid, gclid
 *  - referrer: document.referrer
 *  - landingPage: window.location.pathname
 *  - cookies: _fbp e _fbc (gravados pelo Pixel quando consent=accepted)
 *
 * O cookie `_fbc` só existe quando o Pixel inicializou. Sem consent, ele
 * fica vazio aqui, o que é OK — o Meta CAPI ainda recebe o `fbclid` da URL
 * pelo backend e consegue match (com qualidade menor).
 */

const PARAM_TO_FIELD: Array<[string, keyof AttributionData]> = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
  ["fbclid", "fbclid"],
  ["gclid", "gclid"],
];

function readUrlParams(): Partial<AttributionData> {
  const out: Partial<AttributionData> = {};
  const params = new URLSearchParams(window.location.search);
  for (const [param, field] of PARAM_TO_FIELD) {
    const value = params.get(param)?.trim();
    if (value) out[field] = value;
  }
  return out;
}

function readCookie(name: string): string | undefined {
  const all = document.cookie?.split("; ") ?? [];
  for (const entry of all) {
    const eq = entry.indexOf("=");
    if (eq < 0) continue;
    if (decodeURIComponent(entry.slice(0, eq)) === name) {
      return decodeURIComponent(entry.slice(eq + 1));
    }
  }
  return undefined;
}

function hasAnyValue(d: Partial<AttributionData>): boolean {
  return Object.values(d).some((v) => v !== undefined && v !== "");
}

/**
 * Idempotente: chamar várias vezes não substitui o registro existente.
 * Retorna o snapshot persistido (ou já gravado anteriormente).
 */
export function captureAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  const existing = readAttribution();
  if (existing) return existing.data;

  const fromUrl = readUrlParams();
  const referrer = (document.referrer || "").trim() || undefined;
  const landingPage = window.location.pathname;
  const fbp = readCookie("_fbp");
  const fbc = readCookie("_fbc");

  const data: AttributionData = {
    ...fromUrl,
    referrer,
    landingPage,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };

  // Visita "pura": mesma origem (sem referrer externo), sem UTM, sem
  // fbclid/gclid e sem cookies do Pixel. Nada útil pra salvar — deixa
  // pro próximo pageview que talvez tenha sinal.
  const referrerHost = parseHost(referrer);
  const sameOrigin =
    !referrerHost || referrerHost === window.location.hostname;
  if (!hasAnyValue(fromUrl) && sameOrigin && !fbp && !fbc) {
    return null;
  }

  writeAttribution(data);
  return data;
}

function parseHost(url?: string): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
