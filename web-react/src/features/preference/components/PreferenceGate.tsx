import { PreferenceWizard } from './PreferenceWizard'
import { useUpsertPreferenceMutation } from '../queries/preference.queries'

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
