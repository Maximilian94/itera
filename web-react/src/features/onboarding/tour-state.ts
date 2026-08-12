import { useSyncExternalStore } from 'react'

/**
 * Estado do tour de onboarding, COMPARTILHADO entre o coach (no layout), o
 * botão "Fazer o tour" (na dashboard) e a revisão de perfil (em /concursos).
 * Por viverem em componentes diferentes, um `useState` local não serve — quando
 * a dashboard inicia o tour, o coach precisa reagir na hora. Daí um store de
 * módulo + `useSyncExternalStore`.
 *
 * `override`:
 *   null        → automático (deriva do estágio: novo usuário até concluir)
 *   'active'    → tour iniciado manualmente (coach forçado, mesmo concluído)
 *   'dismissed' → pulado/concluído pelo usuário (coach oculto até reiniciar)
 * `reviewed`: no tour manual, se o Passo 1 (revisão do perfil) já foi aceito
 *   nesta volta. Resetado a cada `startTour`; marcado ao continuar OU ao salvar
 *   o perfil (o upsert chama `ackReview`), para o Passo 1 nunca aparecer duas
 *   vezes.
 */
export type TourOverride = 'active' | 'dismissed' | null
export type TourState = { override: TourOverride; reviewed: boolean }

const OVERRIDE_KEY = 'maximize:onboarding:tour'
const REVIEWED_KEY = 'maximize:onboarding:tour-reviewed'
const listeners = new Set<() => void>()

function readLS(): TourState {
  try {
    const o = window.localStorage.getItem(OVERRIDE_KEY)
    return {
      override: o === 'active' || o === 'dismissed' ? o : null,
      reviewed: window.localStorage.getItem(REVIEWED_KEY) === '1',
    }
  } catch {
    return { override: null, reviewed: false }
  }
}

let cache: TourState = readLS()

function commit(next: TourState) {
  cache = next
  try {
    if (next.override) window.localStorage.setItem(OVERRIDE_KEY, next.override)
    else window.localStorage.removeItem(OVERRIDE_KEY)
    if (next.reviewed) window.localStorage.setItem(REVIEWED_KEY, '1')
    else window.localStorage.removeItem(REVIEWED_KEY)
  } catch {
    /* modo privado/bloqueado: seguimos só com o cache em memória */
  }
  listeners.forEach((l) => l())
}

/** Reinicia o tour do Passo 1 (revisão do perfil ainda pendente). */
export function startTour() {
  commit({ override: 'active', reviewed: false })
}
/** Marca o Passo 1 como concluído (continuar OU salvar o perfil). */
export function ackReview() {
  if (!cache.reviewed) commit({ ...cache, reviewed: true })
}
export function dismissTour() {
  commit({ ...cache, override: 'dismissed' })
}
export function resetTour() {
  commit({ override: null, reviewed: false })
}

/** Snapshots puros — leitura sem montar componente (útil em testes). */
export function getTourOverride(): TourOverride {
  return cache.override
}
export function getTourReviewed(): boolean {
  return cache.reviewed
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

const SERVER_SNAPSHOT: TourState = { override: null, reviewed: false }

export function useTourState(): TourState {
  return useSyncExternalStore(subscribe, () => cache, () => SERVER_SNAPSHOT)
}
