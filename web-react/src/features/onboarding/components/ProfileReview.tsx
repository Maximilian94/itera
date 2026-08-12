import { useState } from 'react'
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BanknotesIcon,
  BriefcaseIcon,
  ClockIcon,
  MapPinIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { ackReview } from '../tour-state'
import type { ComponentType, SVGProps } from 'react'
import type { UserPreference } from '@/features/preference/domain/preference.types'
import { PreferenceForm } from '@/features/preference/components/PreferenceForm'
import { CAREER_OPTIONS } from '@/features/preference/components/preference-options'
import { useUpsertPreferenceMutation } from '@/features/preference/queries/preference.queries'

const RADIUS_LABEL: Partial<Record<UserPreference['mobility'], string>> = {
  MAX_30MIN: 'até 30 min',
  MAX_1H: 'até 1h',
  MAX_2H: 'até 2h',
}

/** Mesmo vocabulário da PreferenceBar — o resumo do radar tem que bater. */
function scopeLabel(p: UserPreference): string {
  if (p.mobility === 'ANYWHERE') return 'Brasil todo'
  if (p.mobility === 'STATE') return `${p.state} inteiro`
  return `${p.city}/${p.state} · ${RADIUS_LABEL[p.mobility]}`
}

const HORIZON_LABEL: Record<UserPreference['horizon'], string> = {
  ASAP: 'Prova o quanto antes',
  LONG_TERM: 'Preparando (1–2 anos)',
}

function careerLabel(p: UserPreference): string {
  return CAREER_OPTIONS.find((o) => o.value === p.careerStage)?.label ?? ''
}

const salaryFmt = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function Step1Header({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-6 flex flex-col items-start gap-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-inset ring-cyan-100">
        <AcademicCapIcon className="h-3.5 w-3.5" />
        Passo 1 de 2
      </span>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance] sm:text-3xl">
        {title}
      </h2>
      <p className="text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  )
}

/**
 * Passo 1 do tour MANUAL, quando o perfil já existe: em vez de re-perguntar
 * tudo, mostra o "radar" atual para revisão — continuar (aceita e vai ao Passo
 * 2) ou ajustar (abre o form pré-preenchido; salvar também conclui o Passo 1
 * via o `ackReview` no upsert). Assim a numeração 1→2 volta a fazer sentido
 * sem forçar quem já respondeu a responder de novo.
 */
export function ProfileReview({ preference }: { preference: UserPreference }) {
  const [editing, setEditing] = useState(false)
  const mutation = useUpsertPreferenceMutation()

  if (editing) {
    return (
      <section
        aria-label="Ajustar seu radar"
        className="m-auto w-full max-w-xl px-4 py-10 sm:px-6"
      >
        <Step1Header
          title="Ajuste seu radar"
          hint="Mude o que já não vale e salve — seguimos para escolher sua meta."
        />
        <PreferenceForm
          initial={preference}
          submitLabel="Salvar e continuar"
          onSubmit={(input) => mutation.mutate(input)}
          isSubmitting={mutation.isPending}
          errorMessage={
            mutation.isError ? 'Não foi possível salvar. Tente novamente.' : null
          }
          secondaryAction={
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex cursor-pointer items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              Voltar
            </button>
          }
        />
      </section>
    )
  }

  return (
    <section
      aria-label="Revise seu radar"
      className="m-auto w-full max-w-xl px-4 py-10 sm:px-6"
    >
      <Step1Header
        title="Este é o seu radar"
        hint="É por aqui que eu escolho quais concursos te mostrar. Ainda está certo?"
      />

      <div className="flex flex-col gap-2.5">
        <Stat icon={MapPinIcon} label="Onde" value={scopeLabel(preference)} />
        <Stat
          icon={BriefcaseIcon}
          label="Momento"
          value={careerLabel(preference)}
        />
        <Stat
          icon={ClockIcon}
          label="Prazo"
          value={HORIZON_LABEL[preference.horizon]}
        />
        {preference.minSalary != null && (
          <Stat
            icon={BanknotesIcon}
            label="Salário mínimo"
            value={`≥ ${salaryFmt.format(Number(preference.minSalary))}`}
          />
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => ackReview()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2"
        >
          Está certo, continuar
          <ArrowRightIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1.5 rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
          <PencilSquareIcon className="h-4 w-4" />
          Ajustar
        </button>
      </div>
    </section>
  )
}
