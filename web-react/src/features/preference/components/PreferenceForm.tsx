import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { StateCitySelect } from '@/components/StateCitySelect'
import type {
  CareerStage,
  ExamHorizon,
  PreferenceMobility,
  UpsertPreferenceInput,
  UserPreference,
} from '../domain/preference.types'

import {
  CAREER_OPTIONS,
  HORIZON_OPTIONS,
  RADIUS_OPTIONS,
  SCOPE_OPTIONS,
  scopeOfMobility,
  type SearchScope,
} from './preference-options'

type Radius = Extract<PreferenceMobility, 'MAX_30MIN' | 'MAX_1H' | 'MAX_2H'>

/** Grupo de rádios em cartões (idioma Tailwind da página, jsdom-friendly). */
function RadioCards<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string
  name: string
  options: Array<{ value: T; label: string }>
  value: T | ''
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-slate-700">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value === o.value
          return (
            <label
              key={o.value}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-within:ring-2 focus-within:ring-cyan-500 focus-within:ring-offset-1 ${
                checked
                  ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${checked ? 'bg-cyan-600' : 'bg-slate-300'}`}
              />
              {o.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export type PreferenceFormProps = {
  /** Perfil atual (edição) ou null/undefined (primeiro preenchimento). */
  initial?: UserPreference | null
  submitLabel: string
  onSubmit: (input: UpsertPreferenceInput) => void
  isSubmitting?: boolean
  /** Mensagem de erro da mutation (null/undefined = sem erro). */
  errorMessage?: string | null
  /** Slot para ações extras ao lado do submit (ex.: Cancelar no dialog). */
  secondaryAction?: ReactNode
}

/**
 * Formulário all-at-once do perfil — usado no dialog de edição (o gate usa o
 * `PreferenceWizard`). O escopo da busca ramifica os campos de localização:
 * cidade+raio / estado inteiro / Brasil todo. Sempre envia o documento
 * completo (PUT upsert).
 */
export function PreferenceForm({
  initial,
  submitLabel,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  secondaryAction,
}: PreferenceFormProps) {
  const initialScope = initial != null ? scopeOfMobility(initial.mobility) : ''
  const [scope, setScope] = useState<SearchScope | ''>(initialScope)
  const [state, setState] = useState(initial?.state ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [radius, setRadius] = useState<Radius | ''>(
    initialScope === 'CITY' ? (initial?.mobility as Radius) : '',
  )
  const [careerStage, setCareerStage] = useState<CareerStage | ''>(
    initial?.careerStage ?? '',
  )
  const [horizon, setHorizon] = useState<ExamHorizon | ''>(
    initial?.horizon ?? '',
  )
  /* Salário como texto (só dígitos); vazio = sem restrição. */
  const [minSalary, setMinSalary] = useState(
    initial?.minSalary != null ? String(Math.round(Number(initial.minSalary))) : '',
  )

  const locationComplete =
    scope === 'ANYWHERE' ||
    (scope === 'STATE' && state !== '') ||
    (scope === 'CITY' && state !== '' && city !== '' && radius !== '')

  const complete = locationComplete && careerStage !== '' && horizon !== ''

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!complete || !scope || !careerStage || !horizon) return
    const salary = minSalary === '' ? null : Number(minSalary)
    const anchor =
      scope === 'ANYWHERE'
        ? {}
        : scope === 'STATE'
          ? { state }
          : { state, city }
    onSubmit({
      ...anchor,
      mobility: scope === 'CITY' ? (radius as Radius) : scope,
      careerStage,
      minSalary: salary,
      horizon,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <RadioCards
          legend="Onde você busca concursos?"
          name="scope"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={setScope}
        />
        {scope === 'CITY' && (
          <>
            <p className="text-xs text-slate-500">
              A cidade é o centro da busca — onde você mora ou para onde
              planeja se mudar.
            </p>
            {/* MUNICIPAL fixo: habilita UF + cidade (o scope real vem do concurso). */}
            <StateCitySelect
              governmentScope="MUNICIPAL"
              state={state}
              city={city}
              onStateChange={setState}
              onCityChange={setCity}
              size="small"
            />
            <RadioCards
              legend="Toparia prestar concurso a até…"
              name="radius"
              options={RADIUS_OPTIONS}
              value={radius}
              onChange={setRadius}
            />
          </>
        )}
        {scope === 'STATE' && (
          <StateCitySelect
            governmentScope="STATE"
            hideCity
            state={state}
            city=""
            onStateChange={setState}
            onCityChange={() => {}}
            size="small"
          />
        )}
      </div>

      <RadioCards
        legend="Seu momento na carreira"
        name="careerStage"
        options={CAREER_OPTIONS}
        value={careerStage}
        onChange={setCareerStage}
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pref-min-salary"
          className="text-sm font-semibold text-slate-700"
        >
          Salário mínimo aceitável
        </label>
        <div className="relative w-44">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400"
          >
            R$
          </span>
          <input
            id="pref-min-salary"
            type="text"
            inputMode="numeric"
            value={minSalary}
            onChange={(e) => setMinSalary(e.target.value.replace(/\D/g, ''))}
            placeholder="0"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm tabular-nums text-slate-800 placeholder:text-slate-400 transition-all focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <p className="text-xs text-slate-500">
          Opcional — deixe em branco para ver tudo.
        </p>
      </div>

      <RadioCards
        legend="Qual é o seu horizonte?"
        name="horizon"
        options={HORIZON_OPTIONS}
        value={horizon}
        onChange={setHorizon}
      />

      {errorMessage != null && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        {secondaryAction}
        <button
          type="submit"
          disabled={!complete || isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? 'Salvando…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
