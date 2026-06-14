// @vitest-environment jsdom

/**
 * Página do cargo (nível 2): matriz {past, future} × {com/sem tentativas},
 * plano de estudos guiado por `currentStep` e passe de axe (MAX-26).
 */
import { screen, within } from '@testing-library/react'
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
  /** Sessões de treino do usuário (GET /training), p/ "Continuar treino". */
  trainings?: Array<{
    trainingId: string
    examBaseId: string
    currentStage: string
  }>
}) {
  const handlers: Record<string, { body: unknown }> = {
    [API]: { body: opts.detail },
    '/stripe/access': {
      body: { status: 'inactive', canDoFreeTraining: false },
    },
    '/training': { body: opts.trainings ?? [] },
    [`/exam-bases/${opts.detail.cargo.id}/competition-history`]: {
      body: { editions: [] },
    },
  }
  // O seletor de prova re-escopa subject-distribution/attempts para a prova
  // escolhida, então registramos handlers para todas as provas do cargo.
  for (const exam of [
    opts.detail.cargo.id,
    ...opts.detail.provas.map((p) => p.examBaseId),
    ...opts.detail.relatedProvas.map((p) => p.examBaseId),
    ...opts.detail.previousExams.map((p) => p.examBaseId),
  ]) {
    handlers[`/exam-bases/${exam}/subject-distribution`] = {
      body: opts.distribution ?? makeDistribution(),
    }
    handlers[`/exam-bases/${exam}/attempts`] = { body: opts.attempts ?? [] }
  }
  for (const [examBaseId, stats] of Object.entries(opts.statsBySubject ?? {})) {
    handlers[`/exam-bases/${examBaseId}/questions/stats-by-subject`] = {
      body: stats,
    }
  }
  installFetchMock(handlers)
}

/** Detail de prova futura: sem questões próprias, treina numa prova
 *  relacionada (edição anterior). A edição também aparece no sidebar
 *  (previousExams), como na resposta real do backend. */
function makeFutureDetail(studyPlan?: Partial<CargoDetail['studyPlan']>) {
  const plan: CargoDetail['studyPlan'] = {
    currentStep: 'diagnostico',
    attemptCount: 0,
    bestScore: null,
    scoreDelta: null,
    weakSubjects: [],
    ...studyPlan,
  }
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
    relatedProvas: [
      {
        examBaseId: 'exam-prev',
        slug: 'enfermeiro-2023',
        institution: 'Prefeitura de Campinas',
        year: 2023,
        examBoardId: 'board-1',
        examBoardAlias: 'VUNESP',
        tier: 1,
        questionCount: 40,
        userStats: {
          attemptCount: plan.attemptCount,
          bestScore: plan.bestScore,
        },
        studyPlan: plan,
      },
    ],
    previousExams: [
      {
        examBaseId: 'exam-prev',
        slug: 'enfermeiro-2023',
        year: 2023,
        questionCount: 40,
        userStats: {
          attemptCount: plan.attemptCount,
          bestScore: plan.bestScore,
        },
      },
    ],
    studyPlan: plan,
  })
}

const historicalDistribution = makeDistribution({
  mode: 'historical',
  sourceExams: [{ examBaseId: 'exam-prev', year: 2023 }],
})

describe('página do cargo — prova passada', () => {
  it('sem tentativas: ficha técnica + diagnóstico como etapa atual', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' }),
    ).toBeTruthy()
    expect(screen.getByText('Prova aplicada em 14/05/2023')).toBeTruthy()

    // Sem treino iniciado → CTA "Começar treino"; timeline mostra os estágios.
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    expect(screen.getByText('Estudo')).toBeTruthy()
    // CTAs antigos de simulado avulso não existem mais.
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
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

  it('com tentativas: prontidão contra o corte + treino dirigido', async () => {
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

    // Painel de prontidão: melhor nota, evolução e leitura contra o corte
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('+8 pt')).toBeTruthy()
    expect(screen.getByText('melhor nota · 3 simulados')).toBeTruthy()
    expect(screen.getByText('Acima do corte')).toBeTruthy()
    expect(screen.getByText('Corte 60%')).toBeTruthy()

    // Programa de treino: sem sessão ainda → "Começar treino"; CTAs antigos
    // (simulado avulso / treinar pontos fracos) não existem mais.
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Treinar pontos fracos/ }),
    ).toBeNull()

    // Acurácia por matéria + insight do ponto fraco vindos da API (async)
    expect(await screen.findByText('você: 74%')).toBeTruthy()
    expect(screen.getByText('você: 48%')).toBeTruthy()
    expect(screen.getByText(/Seu ponto mais fraco hoje é/)).toBeTruthy()
  })

  it('treino finalizado: "Começar novo treino" + "Ver resultado"', async () => {
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
      // Treino concluído (FINAL) desta prova.
      trainings: [{ trainingId: 't1', examBaseId: 'exam-1', currentStage: 'FINAL' }],
      statsBySubject: { 'exam-1': [] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // A sessão de treino chega via GET /training (async).
    expect(
      await screen.findByRole('button', { name: /Começar novo treino/ }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ver resultado/ })).toBeTruthy()
  })
})

describe('página do cargo — prova futura', () => {
  it('sem tentativas: programático + distribuição preditiva + diagnóstico na edição anterior', async () => {
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

    // 1ª vez numa prova futura → treina numa edição anterior (relacionada)
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()

    // Conteúdo programático aparece (só em prova não-passada) como details/summary
    expect(screen.getByText('Conteúdo programático')).toBeTruthy()
    expect(screen.getByText('Enfermagem em Saúde Pública')).toBeTruthy()

    // Distribuição preditiva: título/verbos de estimativa, nunca de fato
    expect(await screen.findByText('O que VUNESP costuma cobrar')).toBeTruthy()
    expect(screen.getByText(/estimativa, não garantia/)).toBeTruthy()
    expect(screen.getByText(/das últimas provas\./)).toBeTruthy()
    expect(screen.queryByText('O que caiu na prova')).toBeNull()
    // CTAs de "treinar matéria" foram removidos (o Estudo do treino cobre isso).
    expect(
      screen.queryByRole('button', { name: 'Treinar Enfermagem' }),
    ).toBeNull()

    // Sidebar: prova anterior linkada para o player
    expect(
      screen.getByRole('link', { name: /Prova 2023/ }).getAttribute('href'),
    ).toBe('/exams/board-1/exam-prev')
  })

  it('com tentativas: prontidão abaixo do corte', async () => {
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
    // Sem provas treináveis (futura sem relacionadas) → treino genérico.
    const cta = screen.getByRole('link', { name: /Ir para o treino/ })
    expect(cta.getAttribute('href')).toBe('/treino')
  })
})

describe('página do cargo — cargo com múltiplas provas', () => {
  /** Tipo 1 (primária) com tentativas; Tipo 2 sem tentativas. */
  function multiProvaDetail() {
    return makeCargoDetail({
      provas: [
        {
          examBaseId: 'exam-1',
          slug: 'enfermeiro-tipo-1',
          label: 'Tipo 1',
          isPrimary: true,
          examDate: '2023-05-14T00:00:00.000Z',
          questionCount: 50,
          userStats: { attemptCount: 3, bestScore: 70 },
          studyPlan: {
            currentStep: 'treino_dirigido',
            attemptCount: 3,
            bestScore: 70,
            scoreDelta: 10,
            weakSubjects: [],
          },
        },
        {
          examBaseId: 'exam-2',
          slug: 'enfermeiro-tipo-2',
          label: 'Tipo 2',
          isPrimary: false,
          examDate: '2023-05-14T00:00:00.000Z',
          questionCount: 48,
          userStats: { attemptCount: 0, bestScore: null },
          studyPlan: {
            currentStep: 'diagnostico',
            attemptCount: 0,
            bestScore: null,
            scoreDelta: null,
            weakSubjects: [],
          },
        },
      ],
    })
  }

  it('cada prova vira um cartão de programa próprio, todos visíveis ao mesmo tempo', async () => {
    mockCargoApi({
      detail: multiProvaDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    const card1 = screen
      .getByRole('heading', { level: 3, name: /Tipo 1/ })
      .closest('article')!
    const card2 = screen
      .getByRole('heading', { level: 3, name: /Tipo 2/ })
      .closest('article')!
    // Cada cartão tem seu próprio progresso: Tipo 1 já treinou (prontidão);
    // Tipo 2 ainda está no diagnóstico, com seu próprio CTA.
    expect(within(card1).getByText('melhor nota · 3 simulados')).toBeTruthy()
    expect(within(card2).queryByText(/melhor nota/)).toBeNull()
    // Cada cartão tem seu próprio CTA de treino (sem sessão → "Começar treino").
    expect(within(card2).getByRole('button', { name: /Começar treino/ })).toBeTruthy()
  })

  it('prova futura sem questões próprias: cartões só das provas relacionadas', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        concurso: { status: 'future' },
        cargo: { questionCount: 0, examDate: '2099-01-01T00:00:00.000Z' },
        // Prova futura: a própria não tem questões → fica fora do seletor.
        provas: [
          {
            examBaseId: 'exam-1',
            slug: 'enfermeiro',
            label: null,
            isPrimary: true,
            examDate: '2099-01-01T00:00:00.000Z',
            questionCount: 0,
            userStats: { attemptCount: 0, bestScore: null },
            studyPlan: {
              currentStep: 'diagnostico',
              attemptCount: 0,
              bestScore: null,
              scoreDelta: null,
              weakSubjects: [],
            },
          },
        ],
        relatedProvas: [
          {
            examBaseId: 'rel-1',
            slug: 'cebraspe-enfermeiro-2024',
            institution: 'Prefeitura de Campinas',
            year: 2024,
            examBoardId: 'board-1',
            examBoardAlias: 'CEBRASPE',
            tier: 1,
            questionCount: 60,
            userStats: { attemptCount: 0, bestScore: null },
            studyPlan: {
              currentStep: 'diagnostico',
              attemptCount: 0,
              bestScore: null,
              scoreDelta: null,
              weakSubjects: [],
            },
          },
          {
            examBaseId: 'rel-2',
            slug: 'fgv-enfermeiro-2023',
            institution: 'Prefeitura de Curitiba',
            year: 2023,
            examBoardId: 'board-2',
            examBoardAlias: 'FGV',
            tier: 2,
            questionCount: 50,
            userStats: { attemptCount: 0, bestScore: null },
            studyPlan: {
              currentStep: 'diagnostico',
              attemptCount: 0,
              bestScore: null,
              scoreDelta: null,
              weakSubjects: [],
            },
          },
        ],
      }),
      statsBySubject: { 'rel-1': [{ subject: 'Enfermagem', count: 30 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // Um cartão de programa por prova relacionada (a própria, futura, fica fora).
    expect(
      screen.getByRole('heading', { level: 3, name: /CEBRASPE · 2024/ }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: /FGV · 2023/ }),
    ).toBeTruthy()
    expect(screen.getAllByText('relacionada')).toHaveLength(2)
  })

  it('cargo de prova única: um único programa, sem relacionadas', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    expect(screen.getByRole('heading', { name: 'Seu plano de estudos' })).toBeTruthy()
    // Própria prova (label null → "Esta prova"); sem provas relacionadas.
    expect(screen.getByRole('heading', { level: 3, name: /Esta prova/ })).toBeTruthy()
    expect(screen.queryByText('relacionada')).toBeNull()
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
