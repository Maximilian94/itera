import { describe, expect, it } from 'vitest'
import { concursoPhase, phaseProgressLabel } from '../concurso-phase'
import type { AdminConcursoRow } from '../scraper.types'

/** Linha recém-criada pela descoberta: rascunho, sem nada preenchido. */
function row(over: Partial<AdminConcursoRow> = {}): AdminConcursoRow {
  return {
    id: 'c1',
    slug: null,
    institution: 'Prefeitura de Santos',
    state: 'SP',
    year: 2026,
    status: 'future',
    provaCount: 0,
    needsSourceUrl: true,
    closed: false,
    documentsCheckedAt: null,
    registrationEnd: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    published: false,
    hasNewsUrl: true,
    hasEditalUrl: false,
    documentCount: 0,
    aiCostUsd: null,
    ...over,
  }
}

describe('concursoPhase', () => {
  it('recém-adicionado pela descoberta começa na leitura da notícia', () => {
    const p = concursoPhase(row())
    expect(p.id).toBe('news')
    expect(p.label).toBe('Rascunho')
    expect(p.costsMoney).toBe(true)
  })

  it('concurso sem notícia de origem pula a fase 2 e vai ao link', () => {
    // Criado por outro fluxo (wizard/edital colado): não há notícia para ler.
    expect(concursoPhase(row({ hasNewsUrl: false })).id).toBe('link')
  })

  it('com edital conhecido mas sem link oficial, cobra o link', () => {
    expect(concursoPhase(row({ hasEditalUrl: true })).id).toBe('link')
  })

  it('com link e sem documentos, a próxima fase é raspar a origem', () => {
    const p = concursoPhase(row({ needsSourceUrl: false }))
    expect(p.id).toBe('documents')
    expect(p.step).toBe(4)
  })

  it('com documentos e sem edital, falta analisar o PDF', () => {
    expect(
      concursoPhase(row({ needsSourceUrl: false, documentCount: 3 })).id,
    ).toBe('analysis')
  })

  it('tudo preenchido cai em "pronto para publicar"', () => {
    const p = concursoPhase(
      row({ needsSourceUrl: false, documentCount: 3, hasEditalUrl: true }),
    )
    expect(p.id).toBe('publish')
    expect(p.actionLabel).toBe('Publicar')
    // Publicar é decisão do admin, não chamada de IA.
    expect(p.costsMoney).toBe(false)
  })

  it('publicado é terminal mesmo com dados faltando', () => {
    // Despublicar sozinho por causa de um campo vazio seria pior que o furo:
    // a decisão de expor ao usuário é do admin e não se desfaz sem ele.
    const p = concursoPhase(row({ published: true }))
    expect(p.id).toBe('done')
    expect(p.actionLabel).toBe('Despublicar')
    expect(phaseProgressLabel(p)).toBe('Concluído')
  })

  it('nenhuma fase pendente promete gratuidade indevida', () => {
    // Só as fases que chamam IA podem marcar custo — o aviso da UI depende disso.
    const paid = ['news', 'link', 'documents', 'analysis']
    for (const id of paid) {
      const found = [
        row(),
        row({ hasNewsUrl: false }),
        row({ needsSourceUrl: false }),
        row({ needsSourceUrl: false, documentCount: 2 }),
      ].map(concursoPhase)
      const match = found.find((p) => p.id === id)
      if (match) expect(match.costsMoney).toBe(true)
    }
  })

  it('mostra o progresso em fases', () => {
    expect(phaseProgressLabel(concursoPhase(row()))).toBe('Fase 2 de 6')
  })
})
