/**
 * Em que fase do preparo cada concurso está.
 *
 * O fluxo admin é faseado e manual de propósito: "Adicionar" só cadastra o
 * rascunho (fase 1, sem IA), e cada fase cara é um clique explícito. Como o
 * backend não guarda um ponteiro de fase, ela é DERIVADA dos dados que a linha
 * já traz — assim nada pode dessincronizar, e uma fase feita por outro caminho
 * (link colado à mão, documento vindo do wizard) é reconhecida na hora.
 *
 * Módulo puro: sem React, sem rede.
 */
import type { AdminConcursoRow } from './scraper.types'

export type ConcursoPhaseId =
  | 'news'
  | 'link'
  | 'documents'
  | 'analysis'
  | 'publish'
  | 'done'

export interface ConcursoPhase {
  id: ConcursoPhaseId
  /** Posição no fluxo (as fases 0 e 1 já aconteceram quando a linha existe). */
  step: number
  /** Rótulo do estado atual, para o selo. */
  label: string
  /** Texto do botão que executa a próxima fase. */
  actionLabel: string
  /** true quando a próxima fase gasta IA — a UI avisa antes. */
  costsMoney: boolean
}

const TOTAL_STEPS = 6

/**
 * A fase corrente é a primeira pendência na ordem do fluxo. Concurso já
 * publicado é 'done' mesmo que falte algo: publicar é uma decisão do admin, e
 * despublicar sozinho por causa de um dado ausente seria pior que o problema.
 */
export function concursoPhase(row: AdminConcursoRow): ConcursoPhase {
  if (row.published)
    return {
      id: 'done',
      step: TOTAL_STEPS,
      label: 'Publicado',
      actionLabel: 'Despublicar',
      costsMoney: false,
    }

  // Fase 2 só existe para concurso vindo da descoberta (tem notícia de origem).
  // Sem notícia, o fluxo começa direto na busca do link.
  if (row.hasNewsUrl && !row.hasEditalUrl && row.needsSourceUrl)
    return {
      id: 'news',
      step: 2,
      label: 'Rascunho',
      actionLabel: 'Ler notícia',
      costsMoney: true,
    }

  if (row.needsSourceUrl)
    return {
      id: 'link',
      step: 3,
      label: 'Sem link oficial',
      actionLabel: 'Procurar link',
      costsMoney: true,
    }

  if (row.documentCount === 0)
    return {
      id: 'documents',
      step: 4,
      label: 'Sem documentos',
      actionLabel: 'Buscar documentos',
      costsMoney: true,
    }

  // Com documentos mas sem edital, a ficha ainda não foi lida de um PDF.
  if (!row.hasEditalUrl)
    return {
      id: 'analysis',
      step: 5,
      label: 'Documentos não analisados',
      actionLabel: 'Analisar documentos',
      costsMoney: true,
    }

  return {
    id: 'publish',
    step: TOTAL_STEPS,
    label: 'Pronto para publicar',
    actionLabel: 'Publicar',
    costsMoney: false,
  }
}

/** "Fase 3 de 6" — dá noção de progresso sem precisar abrir o concurso. */
export function phaseProgressLabel(phase: ConcursoPhase): string {
  return phase.id === 'done'
    ? 'Concluído'
    : `Fase ${phase.step} de ${TOTAL_STEPS}`
}
