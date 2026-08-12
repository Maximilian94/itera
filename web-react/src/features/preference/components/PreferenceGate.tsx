import { AcademicCapIcon } from '@heroicons/react/24/outline'
import { useUpsertPreferenceMutation } from '../queries/preference.queries'
import { PreferenceWizard } from './PreferenceWizard'

/**
 * Gate obrigatório de /concursos: primeiro acesso sem perfil → o wizard toma a
 * página inteira (a rota esconde o header/filtros da lista). Ao salvar, a
 * query de preferências é atualizada e a página destrava sozinha (a lista
 * refetcha já com `match`).
 *
 * Sem card, sem chrome: a pergunta É a página (m-auto centraliza no espaço da
 * rota, que vira uma coluna flex-1 enquanto o gate está ativo).
 */
export function PreferenceGate() {
  const mutation = useUpsertPreferenceMutation()

  return (
    <section
      aria-label="Monte seu radar de concursos"
      className="m-auto w-full max-w-xl px-4 py-10 sm:px-6"
    >
      {/* Ato 0 do onboarding: enquadra o wizard como o 1º passo — "calibrar o
          radar" — para o novo usuário entender por que responde isto antes de
          ver a lista. O progresso interno do wizard fica logo abaixo. */}
      <div className="mb-8 flex flex-col items-start gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-inset ring-cyan-100">
          <AcademicCapIcon className="h-3.5 w-3.5" />
          Passo 1 de 2
        </span>
        <p className="text-sm leading-6 text-slate-600">
          Vou te acompanhar nos primeiros passos. Começando pelo essencial: me
          diz pra onde você mira e eu calibro quais concursos aparecem pra você.
        </p>
      </div>

      <PreferenceWizard
        onSubmit={(input) => mutation.mutate(input)}
        isSubmitting={mutation.isPending}
        errorMessage={
          mutation.isError
            ? 'Não foi possível salvar. Tente novamente.'
            : null
        }
      />
    </section>
  )
}
