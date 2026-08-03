import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { StateCitySelect } from '@/components/StateCitySelect'
import {
  CAREER_OPTIONS,
  HORIZON_OPTIONS,
  RADIUS_OPTIONS,
  SCOPE_OPTIONS,
  type SearchScope,
} from './preference-options'
import type {
  CareerStage,
  ExamHorizon,
  PreferenceMobility,
  UpsertPreferenceInput,
} from '../domain/preference.types'

type Step =
  | 'scope'
  | 'location'
  | 'radius'
  | 'uf'
  | 'career'
  | 'horizon'
  | 'salary'

/**
 * A trilha de perguntas segue o escopo escolhido na 1ª tela — cidade pede
 * âncora + raio, estado pede só a UF, Brasil pula direto para a carreira.
 * Sem escopo ainda (tela 1), mostramos a trilha mais longa como total.
 */
function stepsForScope(scope: SearchScope | ''): Step[] {
  if (scope === 'STATE') return ['scope', 'uf', 'career', 'horizon', 'salary']
  if (scope === 'ANYWHERE') return ['scope', 'career', 'horizon', 'salary']
  return ['scope', 'location', 'radius', 'career', 'horizon', 'salary']
}

/** Pausa entre escolher uma opção e avançar — o usuário vê a seleção assentar. */
const ADVANCE_DELAY_MS = 220

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Lista vertical de opções grandes — o controle do wizard (1 escolha = avança). */
function OptionRows<T extends string>({
  name,
  options,
  value,
  onChoose,
}: {
  name: string
  options: Array<{ value: T; label: string; description?: string }>
  value: T | ''
  onChoose: (v: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2.5">
      {options.map((o) => {
        const checked = value === o.value
        return (
          <label
            key={o.value}
            className={`group flex cursor-pointer items-center gap-3.5 rounded-xl border px-5 py-4 transition-all duration-150 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-2 ${
              checked
                ? 'border-cyan-400 bg-cyan-50 shadow-[0_1px_3px_rgba(15,23,42,0.08)]'
                : 'border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-cyan-300 hover:bg-cyan-50/40'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChoose(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                checked
                  ? 'border-cyan-600 bg-cyan-600'
                  : 'border-slate-300 bg-white group-hover:border-cyan-400'
              }`}
            >
              {checked && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <span className="flex flex-col gap-0.5">
              <span
                className={`text-base font-semibold ${checked ? 'text-cyan-800' : 'text-slate-700'}`}
              >
                {o.label}
              </span>
              {o.description != null && (
                <span
                  className={`text-sm ${checked ? 'text-cyan-700' : 'text-slate-500'}`}
                >
                  {o.description}
                </span>
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}

export type PreferenceWizardProps = {
  onSubmit: (input: UpsertPreferenceInput) => void
  isSubmitting?: boolean
  errorMessage?: string | null
}

/**
 * Fluxo pergunta-a-pergunta do gate de preferências, em tela cheia focada:
 * a 1ª tela escolhe o ESCOPO da busca (cidade+raio / estado / Brasil) e a
 * trilha se ramifica — cidade e raio só aparecem quando importam. Progresso
 * segmentado, auto-avanço ao escolher e volta livre. O dialog de edição usa
 * o `PreferenceForm` direto — editar não exige wizard.
 */
export function PreferenceWizard({
  onSubmit,
  isSubmitting = false,
  errorMessage,
}: PreferenceWizardProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [scope, setScope] = useState<SearchScope | ''>('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [radius, setRadius] = useState<
    Extract<PreferenceMobility, 'MAX_30MIN' | 'MAX_1H' | 'MAX_2H'> | ''
  >('')
  const [careerStage, setCareerStage] = useState<CareerStage | ''>('')
  const [horizon, setHorizon] = useState<ExamHorizon | ''>('')
  const [minSalary, setMinSalary] = useState('')

  const steps = stepsForScope(scope)
  const step: Step = steps[Math.min(stepIndex, steps.length - 1)]
  const headingRef = useRef<HTMLHeadingElement>(null)
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Foco no título a cada troca de tela — leitor de tela acompanha o fluxo. */
  useEffect(() => {
    if (stepIndex > 0) headingRef.current?.focus()
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    }
  }, [stepIndex])

  const goNext = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  /** Escolher uma opção avança sozinho, com uma pausa para a seleção assentar. */
  const chooseAndAdvance = <T extends string>(set: (v: T) => void) => (v: T) => {
    set(v)
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (prefersReducedMotion()) {
      goNext()
    } else {
      advanceTimer.current = setTimeout(goNext, ADVANCE_DELAY_MS)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!scope || !careerStage || !horizon) return
    const salary = minSalary === '' ? null : Number(minSalary)
    if (scope === 'ANYWHERE') {
      onSubmit({
        mobility: 'ANYWHERE',
        careerStage,
        horizon,
        minSalary: salary,
      })
      return
    }
    if (!state) return
    if (scope === 'STATE') {
      onSubmit({ state, mobility: 'STATE', careerStage, horizon, minSalary: salary })
      return
    }
    if (!city || !radius) return
    onSubmit({ state, city, mobility: radius, careerStage, horizon, minSalary: salary })
  }

  const stepMeta: Record<Step, { title: string; hint?: string }> = {
    scope: {
      title: 'Onde você busca concursos?',
      hint: 'Responda rápido e a lista se organiza em volta do seu objetivo.',
    },
    location: {
      /* A cidade é a âncora da busca, não necessariamente onde a pessoa mora —
       * cobre quem planeja se mudar (mora em Recife, mira Jundiaí). */
      title: 'Em volta de qual cidade?',
      hint: 'Onde você mora hoje — ou para onde planeja se mudar.',
    },
    radius: {
      title: 'Toparia prestar concurso a até…',
      hint: city !== '' ? `Tempo de viagem a partir de ${city}.` : 'Tempo de viagem até a cidade da prova.',
    },
    uf: {
      title: 'Em qual estado?',
      hint: 'Mostramos os concursos do estado inteiro, mais os nacionais.',
    },
    career: { title: 'Qual é o seu momento na carreira?' },
    horizon: { title: 'Quando você quer estar na prova?' },
    salary: {
      title: 'Salário mínimo para valer a pena?',
      hint: 'Opcional — deixe em branco para ver tudo.',
    },
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      {/* Progresso segmentado: 1 traço por pergunta da trilha do escopo. */}
      <div className="flex items-center gap-4">
        <div
          role="progressbar"
          aria-label="Progresso das perguntas"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={stepIndex + 1}
          className="flex flex-1 gap-1.5"
        >
          {steps.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none ${
                i <= stepIndex ? 'bg-cyan-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500">
          {stepIndex + 1} de {steps.length}
        </span>
      </div>

      {/* A tela da pergunta atual (key retriga a entrada animada). */}
      <div
        key={step}
        className="flex min-h-80 flex-col gap-6 animate-[fade-in-up_300ms_cubic-bezier(0.2,0.8,0.2,1)_both] motion-reduce:animate-none"
      >
        <div className="flex flex-col gap-2">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-extrabold tracking-tight text-slate-900 outline-none [text-wrap:balance] sm:text-3xl"
          >
            {stepMeta[step].title}
          </h2>
          {stepMeta[step].hint != null && (
            <p className="text-sm leading-6 text-slate-600 sm:text-base">
              {stepMeta[step].hint}
            </p>
          )}
        </div>

        {step === 'scope' && (
          <OptionRows
            name="Onde você busca concursos?"
            options={SCOPE_OPTIONS}
            value={scope}
            onChoose={chooseAndAdvance((v: SearchScope) => setScope(v))}
          />
        )}

        {step === 'location' && (
          <div className="flex flex-col gap-6">
            <StateCitySelect
              governmentScope="MUNICIPAL"
              state={state}
              city={city}
              onStateChange={setState}
              onCityChange={setCity}
              size="small"
            />
            <button
              type="button"
              onClick={goNext}
              disabled={!state || !city}
              className="self-start rounded-xl bg-cyan-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 'radius' && (
          <OptionRows
            name="Toparia prestar concurso a até…"
            options={RADIUS_OPTIONS}
            value={radius}
            onChoose={chooseAndAdvance(
              (v: Extract<PreferenceMobility, 'MAX_30MIN' | 'MAX_1H' | 'MAX_2H'>) =>
                setRadius(v),
            )}
          />
        )}

        {step === 'uf' && (
          <div className="flex flex-col gap-6">
            <StateCitySelect
              governmentScope="STATE"
              hideCity
              state={state}
              city=""
              onStateChange={setState}
              onCityChange={() => {}}
              size="small"
            />
            <button
              type="button"
              onClick={goNext}
              disabled={!state}
              className="self-start rounded-xl bg-cyan-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 'career' && (
          <OptionRows
            name="Qual é o seu momento na carreira?"
            options={CAREER_OPTIONS}
            value={careerStage}
            onChoose={chooseAndAdvance((v: CareerStage) => setCareerStage(v))}
          />
        )}

        {step === 'horizon' && (
          <OptionRows
            name="Quando você quer estar na prova?"
            options={HORIZON_OPTIONS}
            value={horizon}
            onChoose={chooseAndAdvance((v: ExamHorizon) => setHorizon(v))}
          />
        )}

        {step === 'salary' && (
          <div className="flex flex-col gap-6">
            <div className="relative w-56">
              <span
                aria-hidden
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-slate-500"
              >
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                aria-label="Salário mínimo aceitável"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                /* eslint-disable-next-line jsx-a11y/no-autofocus -- última tela do wizard; o foco cai direto no único campo */
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-lg tabular-nums text-slate-800 placeholder:text-slate-500 transition-all focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
              />
            </div>

            {errorMessage != null && (
              <p role="alert" className="text-sm font-semibold text-red-600">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="self-start rounded-xl bg-cyan-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? 'Salvando…' : 'Ver meus concursos'}
            </button>
          </div>
        )}
      </div>

      {/* Voltar mora fora da tela animada: posição estável entre passos. */}
      <div className="min-h-5">
        {stepIndex > 0 && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Voltar
          </button>
        )}
      </div>
    </form>
  )
}
