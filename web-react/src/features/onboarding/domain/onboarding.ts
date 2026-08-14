/**
 * Onboarding do novo usuário — Atos 0 e 1: calibrar o perfil e escolher a
 * primeira meta. O estágio é DERIVADO de dados reais (sem persistência nova):
 *
 *   perfil salvo? (UserPreference)  →  meta escolhida? (UserGoal)
 *
 * Assim o onboarding não é um caminho paralelo que diverge do produto — foi
 * essa divergência (uma tela de tutorial à parte, com href montada na mão) que
 * gerou o antigo 404 "Cargo não encontrado". Aqui o coach acompanha o usuário
 * DENTRO das telas reais.
 */
export type OnboardingStep = 'profile' | 'goal' | 'done'

export function deriveOnboardingStep(input: {
  hasPreference: boolean
  hasGoal: boolean
}): OnboardingStep {
  if (!input.hasPreference) return 'profile'
  if (!input.hasGoal) return 'goal'
  return 'done'
}

/**
 * Onde o coach do Ato 1 está acompanhando o usuário — derivado do pathname.
 * A copy muda conforme o nível do fluxo de concursos em que ele está.
 */
export type CoachContext = 'list' | 'concurso' | 'cargo' | 'away'

export function coachContext(pathname: string): CoachContext {
  // /concursos/:slug/:cargo → é aqui que a meta é definida.
  if (/^\/concursos\/[^/]+\/[^/]+\/?$/.test(pathname)) return 'cargo'
  // /concursos/:slug → abrir um cargo.
  if (/^\/concursos\/[^/]+\/?$/.test(pathname)) return 'concurso'
  // /concursos (a lista).
  if (/^\/concursos\/?$/.test(pathname)) return 'list'
  return 'away'
}

export type CoachCopy = { title: string; body: string }

export function coachCopy(context: CoachContext): CoachCopy {
  switch (context) {
    case 'list':
      return {
        title: 'Escolha um concurso para treinar',
        body: 'Os recomendados combinam com o perfil que você acabou de montar. Abra um para conhecer os cargos.',
      }
    case 'concurso':
      return {
        title: 'Abra o cargo que você quer',
        body: 'Toque no cargo de enfermagem para ver a ficha — é lá que você define sua meta.',
      }
    case 'cargo':
      return {
        title: 'Defina este cargo como sua meta',
        body: 'Use "Definir como meta" no topo da página — ou troque a meta atual. É de graça e não gasta treino; sua Mesa passa a girar em torno dele.',
      }
    case 'away':
      return {
        title: 'Falta escolher sua meta',
        body: 'Escolha o concurso que você vai encarar e o app se organiza em torno dele.',
      }
  }
}
