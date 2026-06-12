// @vitest-environment jsdom

/**
 * Página do cargo (nível 2): matriz {past, future} × {com/sem tentativas},
 * plano de estudos guiado por `currentStep` e passe de axe (MAX-26).
 */
import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  expectNoSeriousAxeViolations,
  installFetchMock,
  makeCargoDetail,
  makeDistribution,
  renderPage,
} from './page-test-utils'
import type { CargoDetail, SubjectDistribution } from '../domain/concurso.types'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const CARGO_PATH = '/concursos/pmc-2026/enfermeiro'
const API = '/concursos/pmc-2026/cargos/enfermeiro'

/** Monta o mapa de handlers da página: detail + blocos satélites. */
function mockCargoApi(opts: {
  detail: CargoDetail
  distribution?: SubjectDistribution
  /** Tentativas da prova alvo do treino (própria ou edição anterior). */
  attempts?: Array<{ id: string; finishedAt: string | null }>
  /** stats-by-subject por examBaseId (alvo do CTA e provas-fonte). */
  statsBySubject?: Record<string, Array<{ subject: string; count: number }>>
}) {
  const handlers: Record<string, { body: unknown }> = {
    [API]: { body: opts.detail },
    '/stripe/access': {
      body: { status: 'inactive', canDoFreeTraining: false },
    },
    [`/exam-bases/${opts.detail.cargo.id}/subject-distribution`]: {
      body: opts.distribution ?? makeDistribution(),
    },
    [`/exam-bases/${opts.detail.cargo.id}/competition-history`]: {
      body: { editions: [] },
    },
  }
  for (const exam of [
    opts.detail.cargo.id,
    ...opts.detail.previousExams.map((p) => p.examBaseId),
  ]) {
    handlers[`/exam-bases/${exam}/attempts`] = { body: opts.attempts ?? [] }
  }
  for (const [examBaseId, stats] of Object.entries(opts.statsBySubject ?? {})) {
    handlers[`/exam-bases/${examBaseId}/questions/stats-by-subject`] = {
      body: stats,
    }
  }
  installFetchMock(handlers)
}

/** Detail de prova futura com uma edição anterior treinável. */
function makeFutureDetail(studyPlan?: Partial<CargoDetail['studyPlan']>) {
  return makeCargoDetail({
    concurso: { status: 'future', year: 2026 },
    cargo: { examDate: '2099-01-01T00:00:00.000Z', questionCount: 0 },
    syllabusGroups: [
      {
        name: 'Enfermagem em Saúde Pública',
        topics: 'SUS, vigilância, imunização.',
        order: 1,
      },
      {
        name: 'Fundamentos de Enfermagem',
        topics: 'Semiologia e semiotécnica.',
        order: 2,
      },
    ],
    previousExams: [
      {
        examBaseId: 'exam-prev',
        slug: 'enfermeiro-2023',
        year: 2023,
        questionCount: 40,
        userStats: { attemptCount: 0, bestScore: null },
      },
    ],
    studyPlan,
  })
}

const historicalDistribution = makeDistribution({
  mode: 'historical',
  sourceExams: [{ examBaseId: 'exam-prev', year: 2023 }],
})

describe('página do cargo — prova passada', () => {
  it('sem tentativas: ficha técnica + CTA "Treinar com esta prova" + diagnóstico como etapa atual', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' }),
    ).toBeTruthy()
    expect(screen.getByText('Prova aplicada em 14/05/2023')).toBeTruthy()

    // CTA primário (header + barra mobile) — primeira vez numa prova passada
    expect(
      screen.getAllByRole('button', { name: /Treinar com esta prova/ }),
    ).toHaveLength(2)

    // Plano: Diagnóstico é a etapa atual → único CTA de etapa visível
    expect(screen.getByRole('button', { name: /Fazer simulado/ })).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: /Treinar pontos fracos/ }),
    ).toBeNull()
    // Sem tentativas → painel de prontidão não aparece
    expect(screen.queryByText(/melhor nota ·/)).toBeNull()

    // Bloco de matérias no modo fato (carrega async, depois do detail)
    expect(await screen.findByText('O que caiu na prova')).toBeTruthy()
    expect(
      screen.getByText(/Composição das 50 questões aplicadas em 14\/05\/2023/),
    ).toBeTruthy()
    expect(screen.getByText(/da prova\./)).toBeTruthy()
    expect(screen.queryByText(/das últimas provas\./)).toBeNull()

    // Prova passada nunca mostra conteúdo programático
    expect(screen.queryByText('Conteúdo programático')).toBeNull()
  })

  it('com tentativas: prontidão contra o corte + CTA "Continuar treino" + treino dirigido', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        studyPlan: {
          currentStep: 'treino_dirigido',
          attemptCount: 3,
          bestScore: 72,
          scoreDelta: 8,
          weakSubjects: [{ subject: 'Português', accuracy: 48 }],
        },
      }),
      distribution: makeDistribution({
        subjects: [
          { subject: 'Enfermagem', count: 25, share: 0.5, userAccuracy: 0.74 },
          { subject: 'SUS', count: 15, share: 0.3, userAccuracy: null },
          { subject: 'Português', count: 10, share: 0.2, userAccuracy: 0.48 },
        ],
        insight: {
          topSubjects: ['Enfermagem', 'SUS'],
          topShare: 0.8,
          weakestRelevant: { subject: 'Português', accuracy: 0.48 },
        },
      }),
      attempts: [{ id: 'a1', finishedAt: '2026-06-01T00:00:00.000Z' }],
      statsBySubject: { 'exam-1': [{ subject: 'Português', count: 10 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })

    // Já treinou → CTA primário muda para continuar
    expect(
      await screen.findAllByRole('button', { name: /Continuar treino/ }),
    ).toHaveLength(2)

    // Painel de prontidão: melhor nota, evolução e leitura contra o corte
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('+8 pt')).toBeTruthy()
    expect(screen.getByText('melhor nota · 3 simulados')).toBeTruthy()
    expect(screen.getByText('Acima do corte')).toBeTruthy()
    expect(screen.getByText('Corte 60%')).toBeTruthy()

    // currentStep=treino_dirigido → etapa 2 destacada com seu CTA; o da etapa 1 some
    expect(
      await screen.findByRole('button', { name: /Treinar pontos fracos/ }),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
    const stepBadge = screen
      .getByText('Treino dirigido')
      .closest('li')!
      .querySelector('.ring-cyan-100')
    expect(stepBadge?.textContent).toBe('2')
    // Matéria fraca citada na etapa do plano e no insight da distribuição
    expect(await screen.findAllByText(/Português \(48%\)/)).toHaveLength(2)

    // Acurácia por matéria + insight do ponto fraco vindos da API
    expect(screen.getByText('você: 74%')).toBeTruthy()
    expect(screen.getByText('você: 48%')).toBeTruthy()
    expect(screen.getByText(/Seu ponto mais fraco hoje é/)).toBeTruthy()
  })

  it('reta final: nenhuma etapa oferece CTA e as anteriores ficam concluídas', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        studyPlan: {
          currentStep: 'reta_final',
          attemptCount: 6,
          bestScore: 81,
          scoreDelta: 12,
          weakSubjects: [],
        },
      }),
      attempts: [{ id: 'a1', finishedAt: '2026-06-01T00:00:00.000Z' }],
      statsBySubject: { 'exam-1': [] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Treinar pontos fracos/ }),
    ).toBeNull()
    const badge = screen
      .getByText('Reta final')
      .closest('li')!
      .querySelector('.ring-cyan-100')
    expect(badge?.textContent).toBe('3')
  })
})

describe('página do cargo — prova futura', () => {
  it('sem tentativas: programático + distribuição preditiva + CTA "Fazer primeiro simulado"', async () => {
    mockCargoApi({
      detail: makeFutureDetail(),
      distribution: historicalDistribution,
      statsBySubject: {
        'exam-prev': [
          { subject: 'Enfermagem', count: 20 },
          { subject: 'SUS', count: 10 },
        ],
      },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })

    // 1ª vez numa prova futura → treina na edição anterior
    expect(
      screen.getAllByRole('button', { name: /Fazer primeiro simulado/ }),
    ).toHaveLength(2)

    // Conteúdo programático aparece (só em prova não-passada) como details/summary
    expect(screen.getByText('Conteúdo programático')).toBeTruthy()
    expect(screen.getByText('Enfermagem em Saúde Pública')).toBeTruthy()

    // Distribuição preditiva: título/verbos de estimativa, nunca de fato
    expect(await screen.findByText('O que VUNESP costuma cobrar')).toBeTruthy()
    expect(screen.getByText(/estimativa, não garantia/)).toBeTruthy()
    expect(screen.getByText(/das últimas provas\./)).toBeTruthy()
    expect(screen.queryByText('O que caiu na prova')).toBeNull()

    // Treina por matéria só onde a prova-fonte tem questões
    expect(
      await screen.findByRole('button', { name: 'Treinar Enfermagem' }),
    ).toBeTruthy()
    expect(
      screen.queryByRole('button', { name: 'Treinar Português' }),
    ).toBeNull()

    // Sidebar: prova anterior linkada para o player
    expect(
      screen.getByRole('link', { name: /Prova 2023/ }).getAttribute('href'),
    ).toBe('/exams/board-1/exam-prev')
  })

  it('com tentativas: prontidão abaixo do corte + CTA "Continuar treino"', async () => {
    mockCargoApi({
      detail: makeFutureDetail({
        currentStep: 'treino_dirigido',
        attemptCount: 2,
        bestScore: 55,
        scoreDelta: -3,
        weakSubjects: [{ subject: 'SUS', accuracy: 40 }],
      }),
      distribution: historicalDistribution,
      attempts: [{ id: 'a1', finishedAt: '2026-06-01T00:00:00.000Z' }],
      statsBySubject: { 'exam-prev': [{ subject: 'SUS', count: 10 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    expect(
      await screen.findAllByRole('button', { name: /Continuar treino/ }),
    ).toHaveLength(2)
    expect(screen.getByText('55%')).toBeTruthy()
    expect(screen.getByText('5 pt para o corte')).toBeTruthy()
    expect(screen.getByText('-3 pt')).toBeTruthy()
  })

  it('sem prova treinável: CTA vira link para o treino genérico', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        concurso: { status: 'future' },
        cargo: { examDate: '2099-01-01T00:00:00.000Z', questionCount: 0 },
        previousExams: [],
      }),
      distribution: makeDistribution({
        mode: 'historical',
        subjects: [],
        totalQuestions: 0,
      }),
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    const ctas = screen.getAllByRole('link', { name: /Começar a treinar/ })
    expect(ctas).toHaveLength(2)
    expect(ctas[0].getAttribute('href')).toBe('/treino')
  })
})

describe('página do cargo — estados de erro', () => {
  it('404 → cargo não encontrado com volta para o concurso', async () => {
    installFetchMock({ [API]: { status: 404, body: { message: 'Not found' } } })
    renderPage(CARGO_PATH)

    expect(
      await screen.findByRole('heading', { name: 'Cargo não encontrado' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Voltar ao concurso' })
        .getAttribute('href'),
    ).toBe('/concursos/pmc-2026')
  })
})

describe('página do cargo — acessibilidade (axe)', () => {
  it('prova passada com tentativas: sem violações sérias/críticas', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        studyPlan: {
          currentStep: 'treino_dirigido',
          attemptCount: 3,
          bestScore: 72,
          scoreDelta: 8,
          weakSubjects: [{ subject: 'Português', accuracy: 48 }],
        },
      }),
      attempts: [{ id: 'a1', finishedAt: '2026-06-01T00:00:00.000Z' }],
      statsBySubject: { 'exam-1': [{ subject: 'Português', count: 10 }] },
    })
    const { container } = renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    await screen.findByText('O que caiu na prova')
    await expectNoSeriousAxeViolations(container)
  })

  it('prova futura com programático: sem violações sérias/críticas', async () => {
    mockCargoApi({
      detail: makeFutureDetail(),
      distribution: historicalDistribution,
      statsBySubject: { 'exam-prev': [{ subject: 'Enfermagem', count: 20 }] },
    })
    const { container } = renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    await screen.findByText('Conteúdo programático')
    await expectNoSeriousAxeViolations(container)
  })
})
