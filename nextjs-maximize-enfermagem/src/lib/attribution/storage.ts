import type { AttributionData } from "./types";

/**
 * Persistência de first-touch attribution em localStorage com TTL 90 dias.
 * Estrutura armazenada: `{ data, capturedAt }` (epoch ms).
 *
 * Decisões:
 *  - 90d porque é a janela de attribution que o Meta usa pra `Lead`.
 *  - Sem cookie: cookie tem cap de tamanho e cross-subdomínio confuso.
 *  - JSON.parse defensivo: storage corrompido não derruba o site.
 */

const STORAGE_KEY = "maximize:attribution";
export const TTL_MS = 90 * 24 * 60 * 60 * 1000;

interface StoredAttribution {
  data: AttributionData;
  capturedAt: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const capturedAt = parsed["capturedAt"];
    const data = parsed["data"];
    if (typeof capturedAt !== "number" || !isPlainObject(data)) return null;
    if (Date.now() - capturedAt > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { data: data as AttributionData, capturedAt };
  } catch {
    return null;
  }
}

export function writeAttribution(data: AttributionData): void {
  if (typeof window === "undefined") return;
  try {
    const entry: StoredAttribution = { data, capturedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Modo anônimo / quota cheia: ignora silenciosamente.
  }
}

export function clearAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
