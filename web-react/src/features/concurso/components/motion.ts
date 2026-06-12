import { useEffect, useState } from 'react'

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
