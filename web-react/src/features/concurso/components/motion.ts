import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/* Craft vocabulary de motion (per DESIGN.md):
 * - Entrance: fade-in-up (styles.css keyframe), staggered, gated por
 *   prefers-reduced-motion.
 * - Meters animam de 0 ao valor no mount. */

/** Staggered entrance for top-level sections. */
export function enter(i: number) {
  return {
    className:
      'animate-[fade-in-up_400ms_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none',
    style: { animationDelay: `${i * 70}ms` },
  }
}

/** Flips to true on the next frame so width transitions play on mount. */
export function useMeters() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return on
}

export const METER_BAR =
  'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none'

/**
 * View transition para mudanças de NÍVEL por estado (mesa → treino → ponto de
 * estudo), sem navegação de rota: elementos com o mesmo `view-transition-name`
 * morfam entre o antes e o depois (ex.: título do ponto saindo do card para o
 * header). Progressive enhancement: sem suporte ou com reduced-motion, o
 * update acontece sem animação.
 */
export function withViewTransition(update: () => void) {
  /* Cast deliberadamente opcional: navegadores antigos e o jsdom dos testes
   * não implementam a View Transitions API. */
  const start = (document as { startViewTransition?: (cb: () => void) => unknown })
    .startViewTransition
  const reduceMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (start == null || reduceMotion) {
    update()
    return
  }
  start.call(document, () => {
    flushSync(update)
  })
}
