import { useEffect, useState, useCallback } from 'react'

/* ── UX copy phases ─────────────────────────────────────────────── */
const PHASES = [
  {
    title: 'Prova recebida com sucesso',
    description:
      'Preparando a análise inteligente das suas respostas…',
  },
  {
    title: 'Lendo cada resposta com atenção',
    description:
      'Nossa inteligência artificial está examinando suas escolhas, uma a uma.',
  },
  {
    title: 'Identificando padrões de desempenho',
    description:
      'Cruzando seus resultados com dados de milhares de candidatos para traçar seu perfil.',
  },
  {
    title: 'Mapeando pontos fortes e lacunas',
    description:
      'Descobrindo exatamente quais temas merecem mais atenção na sua preparação.',
  },
  {
    title: 'Criando um plano de estudo sob medida',
    description:
      'Elaborando recomendações personalizadas para acelerar o seu caminho até a aprovação.',
  },
  {
    title: 'Tudo pronto!',
    description:
      'Seu diagnóstico personalizado ficou incrível. Vamos conferir?',
  },
]

const DOC_ROWS = 8
const SCAN_INTERVAL_MS = 550
const PHASE_INTERVAL_MS = 2800
const MIN_DISPLAY_MS = 8000

/* ── Keyframe styles (injected once) ────────────────────────────── */
const keyframes = `
@keyframes ea-phaseIn {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ea-floatParticle {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.25; }
  33%      { transform: translateY(-18px) translateX(10px); opacity: 0.55; }
  66%      { transform: translateY(-10px) translateX(-6px); opacity: 0.35; }
}
@keyframes ea-docFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-7px); }
}
@keyframes ea-beamGlow {
  0%, 100% { box-shadow: 0 0 8px rgba(59,130,246,0.35); }
  50%      { box-shadow: 0 0 22px rgba(59,130,246,0.7); }
}
@keyframes ea-checkPop {
  0%   { transform: scale(0); }
  60%  { transform: scale(1.25); }
  100% { transform: scale(1); }
}
@keyframes ea-scanShimmer {
  0%   { background-position: 200% center; }
  100% { background-position: -200% center; }
}
@keyframes ea-progressPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
`

/* ── Types ──────────────────────────────────────────────────────── */
interface ExamAnalysisOverlayProps {
  /** Set to true once the server has finished processing */
  apiFinished: boolean
  /** Called when the overlay animation is complete and navigation should happen */
  onComplete: () => void
}

/* ── Component ──────────────────────────────────────────────────── */
export function ExamAnalysisOverlay({
  apiFinished,
  onComplete,
}: ExamAnalysisOverlayProps) {
  const [visible, setVisible] = useState(false)
  const [currentPhase, setCurrentPhase] = useState(0)
  const [scannedUpTo, setScannedUpTo] = useState(-1)
  const [scanDone, setScanDone] = useState(false)
  const [minTimeReached, setMinTimeReached] = useState(false)
  const [exiting, setExiting] = useState(false)

  /* Fade in */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  /* Row-by-row scanning */
  useEffect(() => {
    if (scanDone) return
    const id = setInterval(() => {
      setScannedUpTo((prev) => {
        if (prev >= DOC_ROWS - 1) {
          setScanDone(true)
          return prev
        }
        return prev + 1
      })
    }, SCAN_INTERVAL_MS)
    return () => clearInterval(id)
  }, [scanDone])

  /* Phase rotation */
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentPhase((p) => (p < PHASES.length - 1 ? p + 1 : p))
    }, PHASE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  /* Minimum display time */
  useEffect(() => {
    const id = setTimeout(() => setMinTimeReached(true), MIN_DISPLAY_MS)
    return () => clearTimeout(id)
  }, [])

  /* Exit transition */
  const triggerExit = useCallback(() => {
    setExiting(true)
    setTimeout(() => onComplete(), 600)
  }, [onComplete])

  /* Resolve when ready */
  useEffect(() => {
    if (apiFinished && minTimeReached && !exiting) {
      // Jump to last phase if not there yet
      setCurrentPhase(PHASES.length - 1)
      const id = setTimeout(triggerExit, 1400)
      return () => clearTimeout(id)
    }
  }, [apiFinished, minTimeReached, exiting, triggerExit])

  const phase = PHASES[currentPhase]

  /* ── Beam vertical position (px from top of the doc) ───────── */
  const DOC_HEADER_H = 52 // px (header + border)
  const ROW_FIRST_TOP = 20 // py-4 ≈ 16 + some margin
  const ROW_STEP = 28 // row height + gap
  const beamTop = DOC_HEADER_H + ROW_FIRST_TOP + scannedUpTo * ROW_STEP

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center
        transition-opacity duration-600 ${visible && !exiting ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.90)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      {/* Injected keyframes */}
      <style>{keyframes}</style>

      {/* ── Floating ambient particles ──────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${3 + (i % 4) * 2}px`,
              height: `${3 + (i % 4) * 2}px`,
              left: `${8 + ((i * 6.9) % 84)}%`,
              top: `${12 + ((i * 9.7) % 76)}%`,
              backgroundColor:
                i % 3 === 0
                  ? 'rgba(99,102,241,0.30)'
                  : 'rgba(59,130,246,0.22)',
              animation: `ea-floatParticle ${5 + i * 0.6}s ease-in-out infinite`,
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </div>

      {/* ── Document ────────────────────────────────────────── */}
      <div
        className="relative mb-12"
        style={{ animation: 'ea-docFloat 4.5s ease-in-out infinite' }}
      >
        {/* Soft glow behind doc */}
        <div
          className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(59,130,246,0.12) 0%, transparent 70%)',
          }}
        />

        <div
          className="relative w-56 h-[304px] bg-white rounded-xl overflow-hidden"
          style={{
            boxShadow:
              '0 0 40px rgba(59,130,246,0.12), 0 25px 50px rgba(0,0,0,0.35)',
          }}
        >
          {/* Header area */}
          <div className="px-5 pt-5 pb-3 border-b border-slate-100">
            <div className="h-2.5 w-20 bg-slate-200 rounded-full mb-2" />
            <div className="h-1.5 w-28 bg-slate-100 rounded-full" />
          </div>

          {/* Question rows */}
          <div className="px-5 py-4 flex flex-col gap-2">
            {Array.from({ length: DOC_ROWS }, (_, i) => {
              const isScanned = i <= scannedUpTo
              return (
                <div key={i} className="flex items-center gap-3">
                  {/* Circle / check */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                      text-[9px] font-bold transition-colors duration-400
                      ${isScanned
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    style={
                      isScanned
                        ? {
                            animation: 'ea-checkPop 0.35s ease-out forwards',
                            animationDelay: '0.05s',
                          }
                        : undefined
                    }
                  >
                    {isScanned ? (
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>

                  {/* "Text" bar */}
                  <div
                    className={`h-2 rounded-full transition-all duration-500
                      ${isScanned ? 'bg-cyan-100' : 'bg-slate-100'}`}
                    style={{
                      width: `${45 + ((i * 19) % 55)}%`,
                      ...(isScanned
                        ? {
                            background:
                              'linear-gradient(90deg, #dbeafe 30%, #bfdbfe 50%, #dbeafe 70%)',
                            backgroundSize: '200% 100%',
                            animation:
                              'ea-scanShimmer 2.2s ease-in-out infinite',
                            animationDelay: `${i * 0.15}s`,
                          }
                        : {}),
                    }}
                  />
                </div>
              )
            })}
          </div>

          {/* Scan beam */}
          {!scanDone && scannedUpTo >= 0 && (
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                height: '4px',
                borderRadius: '2px',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.85) 25%, rgba(99,102,241,0.95) 50%, rgba(59,130,246,0.85) 75%, transparent 100%)',
                top: `${beamTop}px`,
                transition: 'top 0.45s ease-in-out',
                animation: 'ea-beamGlow 1s ease-in-out infinite',
              }}
            />
          )}

          {/* Tinted area above the beam (already-scanned zone) */}
          {scannedUpTo >= 0 && (
            <div
              className="absolute left-0 right-0 top-0 pointer-events-none transition-all duration-500"
              style={{
                height: `${beamTop + 4}px`,
                background:
                  'linear-gradient(180deg, rgba(59,130,246,0.04) 0%, rgba(59,130,246,0.07) 100%)',
              }}
            />
          )}

          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)`,
              backgroundSize: '24px 24px',
            }}
          />
        </div>
      </div>

      {/* ── Phase text ──────────────────────────────────────── */}
      <div
        key={currentPhase}
        className="text-center max-w-lg px-8"
        style={{ animation: 'ea-phaseIn 0.55s ease-out forwards' }}
      >
        <h2 className="text-[22px] font-bold text-white mb-2.5 leading-tight">
          {phase.title}
        </h2>
        <p className="text-[15px] text-cyan-200/80 leading-relaxed">
          {phase.description}
        </p>
      </div>

      {/* ── Progress dots ───────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-10">
        {PHASES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-500 ${
              i === currentPhase
                ? 'w-7 h-2 bg-cyan-400'
                : i < currentPhase
                  ? 'w-2 h-2 bg-cyan-500/50'
                  : 'w-2 h-2 bg-slate-600/60'
            }`}
            style={
              i === currentPhase
                ? { animation: 'ea-progressPulse 1.8s ease-in-out infinite' }
                : undefined
            }
          />
        ))}
      </div>

      {/* ── Bottom tagline ──────────────────────────────────── */}
      <p className="absolute bottom-8 text-[11px] tracking-wide text-slate-500 uppercase">
        Powered by Itera AI
      </p>
    </div>
  )
}
