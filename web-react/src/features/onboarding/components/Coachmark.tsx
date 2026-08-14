import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Popper } from '@mui/material'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import type { RefObject } from 'react'

type Rect = { top: number; left: number; width: number; height: number }

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Coach-mark ancorado: destaca o elemento alvo (buraco de luz num backdrop
 * escurecido, via box-shadow) e ancora um card explicativo ao lado dele (MUI
 * Popper cuida de posicionar/flipar e seguir o scroll). O backdrop bloqueia a
 * interação com a página durante o passo; a navegação vive no card.
 *
 * O alvo é lido do `targetRef` a cada passo, com scroll pra ele à vista.
 */
export function Coachmark({
  targetRef,
  index,
  count,
  title,
  body,
  nextLabel,
  onPrev,
  onNext,
  onSkip,
}: {
  targetRef: RefObject<HTMLElement | null>
  /** Posição desta parada entre as revelações (1-based). */
  index: number
  /** Total de revelações do tour. */
  count: number
  title: string
  body: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  onSkip: () => void
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)

  useLayoutEffect(() => {
    const pad = 8
    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      // Alvo muito alto (a lista): recorta o realce à parte visível de cima.
      const height = Math.min(r.height, window.innerHeight - 32)
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: height + pad * 2,
      })
    }

    // O alvo pode montar num commit posterior ao do coach-mark, e o scroll
    // suave leva alguns frames pra assentar — então acompanhamos por rAF em vez
    // de medir uma vez só.
    let raf = 0
    let ticks = 0
    let scrolled = false
    const tick = () => {
      const el = targetRef.current
      if (el != null) {
        setAnchorEl(el)
        if (!scrolled) {
          scrolled = true
          const tall = el.getBoundingClientRect().height > window.innerHeight * 0.6
          el.scrollIntoView({
            block: tall ? 'start' : 'center',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        }
        measure(el)
      }
      if (ticks++ < 60) raf = requestAnimationFrame(tick)
    }
    tick()

    const onMove = () => {
      const el = targetRef.current
      if (el != null) measure(el)
    }
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [targetRef, index])

  if (typeof document === 'undefined') return null
  const last = index >= count

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 z-[75]">
          {/* Catcher: bloqueia cliques na página durante o passo. */}
          <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
          {rect != null && (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-xl ring-2 ring-cyan-400 transition-all duration-150"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.55)',
              }}
            />
          )}
        </div>,
        document.body,
      )}

      <Popper
        open={anchorEl != null}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ zIndex: 80 }}
        modifiers={[
          { name: 'offset', options: { offset: [0, 14] } },
          { name: 'preventOverflow', options: { padding: 8 } },
          { name: 'flip', enabled: true },
        ]}
      >
        <div
          role="dialog"
          aria-label={title}
          className="w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-cyan-200 bg-white p-4 shadow-[0_20px_40px_-12px_rgba(2,6,23,0.35)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <button
              type="button"
              onClick={onSkip}
              className="shrink-0 rounded text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Pular
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">{body}</p>

          <div className="mt-4 flex items-center gap-4">
            <div
              role="progressbar"
              aria-label="Progresso do tour"
              aria-valuemin={1}
              aria-valuemax={count}
              aria-valuenow={index}
              className="flex flex-1 gap-1.5"
            >
              {Array.from({ length: count }, (_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i < index ? 'bg-cyan-600' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onPrev}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                Voltar
              </button>
              <button
                type="button"
                onClick={onNext}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
              >
                {nextLabel}
                {!last && <ArrowRightIcon className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </Popper>
    </>
  )
}
