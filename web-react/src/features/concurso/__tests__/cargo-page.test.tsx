// @vitest-environment jsdom

/**
 * Página do cargo (nível 2): duas abas — Treino (cronograma guiado, default) e
 * Detalhes (ficha + programático + distribuição). Matriz {past, future} ×
 * {com/sem tentativas}, próximo passo guiado pelo estágio do treino, e passe
 * de axe nas duas abas (MAX-26 / redesign do cronograma).
 */
import { fireEvent, screen, within } from '@testing-library/react'
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

/** Abre a aba Detalhes (a página entra na aba Treino por padrão). */
function goToDetalhes() {
  fireEvent.click(screen.getByRole('tab', { name: /Detalhes/ }))
}

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
        userStats: { attemptCount: plan.attemptCount, bestScore: plan.bestScore },
        studyPlan: plan,
      },
    ],
    previousExams: [
      {
        examBaseId: 'exam-prev',
        slug: 'enfermeiro-2023',
        year: 2023,
        questionCount: 40,
        userStats: { attemptCount: plan.attemptCount, bestScore: plan.bestScore },
      },
    ],
    studyPlan: plan,
  })
}

const historicalDistribution = makeDistribution({
  mode: 'historical',
  sourceExams: [{ examBaseId: 'exam-prev', year: 2023 }],
})

describe('página do cargo — aba Treino (prova passada)', () => {
  it('sem tentativas: próximo passo é a prova diagnóstica + plano de 5 etapas', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' }),
    ).toBeTruthy()
    expect(screen.getByText('Prova aplicada em 14/05/2023')).toBeTruthy()

    // Próximo passo: sem treino iniciado → começar pela prova diagnóstica.
    expect(screen.getByText('Seu próximo passo')).toBeTruthy()
    expect(screen.getByText('Fazer a prova diagnóstica')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()

    // Plano de treino com os 5 estágios.
    expect(
      screen.getByRole('heading', { name: 'Seu plano de treino' }),
    ).toBeTruthy()
    expect(screen.getByText('Estudo')).toBeTruthy()

    // Sem tentativas → prontidão convida ao diagnóstico (sem número de nota).
    expect(screen.getByText(/Faça a prova diagnóstica para medir/)).toBeTruthy()
    // CTAs antigos de simulado avulso não existem mais.
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
  })

  it('Detalhes: distribuição real (fato) + sem conteúdo programático', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    goToDetalhes()

    expect(await screen.findByText('O que caiu na prova')).toBeTruthy()
    expect(
      screen.getByText(/Composição das 50 questões aplicadas em 14\/05\/2023/),
    ).toBeTruthy()
    // Prova passada nunca mostra conteúdo programático.
    expect(screen.queryByText('Conteúdo programático')).toBeNull()
    expect(screen.queryByText('O que VUNESP costuma cobrar')).toBeNull()
  })

  it('com tentativas: prontidão acima do corte (aba Treino) + acurácia (Detalhes)', async () => {
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

    // Prontidão: melhor nota, evolução e leitura contra o corte (aba Treino).
    expect(screen.getByText('72%')).toBeTruthy()
    expect(screen.getByText('+8 pt')).toBeTruthy()
    expect(screen.getByText(/Acima da nota de corte/)).toBeTruthy()
    expect(screen.getByText('corte 60%')).toBeTruthy()

    // Próximo passo guiado: sem sessão ainda → "Começar treino".
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /Treinar pontos fracos/ }),
    ).toBeNull()

    // Domínio por matéria (aba Treino): acerto por matéria com farol (async).
    expect(
      await screen.findByRole('heading', { name: 'Domínio por matéria' }),
    ).toBeTruthy()

    // Acurácia por matéria + insight do ponto fraco ficam na aba Detalhes.
    goToDetalhes()
    expect(await screen.findByText('você: 74%')).toBeTruthy()
    expect(screen.getByText('você: 48%')).toBeTruthy()
    expect(screen.getByText(/Seu ponto mais fraco hoje é/)).toBeTruthy()
  })

  it('treino finalizado: "Começar novo ciclo" + "Ver resultado"', async () => {
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
      trainings: [{ trainingId: 't1', examBaseId: 'exam-1', currentStage: 'FINAL' }],
      statsBySubject: { 'exam-1': [] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // A sessão de treino chega via GET /training (async).
    expect(
      await screen.findByRole('button', { name: /Começar novo ciclo/ }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ver resultado/ })).toBeTruthy()
  })

  it('treino em andamento: aba Treino ganha o selo "em andamento" e o próximo passo retoma', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      trainings: [{ trainingId: 't1', examBaseId: 'exam-1', currentStage: 'STUDY' }],
      distribution: makeDistribution({
        subjects: [
          { subject: 'Enfermagem', count: 25, share: 0.5, userAccuracy: 0.8 },
          { subject: 'Português', count: 25, share: 0.5, userAccuracy: 0.4 },
        ],
        insight: {
          topSubjects: ['Enfermagem'],
          topShare: 0.5,
          weakestRelevant: { subject: 'Português', accuracy: 0.4 },
        },
      }),
      statsBySubject: { 'exam-1': [{ subject: 'Português', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // Selo "em andamento" na aba Treino aparece após GET /training resolver.
    const treinoTab = screen.getByRole('tab', { name: /Treino/ })
    expect(await within(treinoTab).findByText('em andamento')).toBeTruthy()
    // Estágio STUDY → próximo passo é estudar a matéria mais fraca.
    expect(await screen.findByText(/Estudar: Português/)).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Continuar estudando/ }),
    ).toBeTruthy()
  })
})

describe('página do cargo — aba Treino (prova futura)', () => {
  it('sem tentativas: treina numa prova relacionada; Detalhes traz programático + distribuição preditiva', async () => {
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

    // 1ª vez numa prova futura → o plano usa uma prova relacionada.
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    expect(screen.getByText(/Plano com base na prova/)).toBeTruthy()
    expect(screen.getByText(/VUNESP · 2023/)).toBeTruthy()

    // Detalhes: programático + distribuição preditiva.
    goToDetalhes()
    expect(await screen.findByText('Conteúdo programático')).toBeTruthy()
    expect(screen.getByText('Enfermagem em Saúde Pública')).toBeTruthy()
    expect(screen.getByText('O que VUNESP costuma cobrar')).toBeTruthy()
    expect(screen.getByText(/estimativa, não garantia/)).toBeTruthy()
    expect(screen.queryByText('O que caiu na prova')).toBeNull()

    // Sidebar: prova anterior linkada para o player.
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
    expect(screen.getByText(/Faltam 5 pts para o corte de 60%/)).toBeTruthy()
    expect(screen.getByText('-3 pt')).toBeTruthy()
  })

  it('sem prova treinável: aba Treino vira link para o treino genérico', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        concurso: { status: 'future' },
        cargo: { examDate: '2099-01-01T00:00:00.000Z', questionCount: 0 },
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
        relatedProvas: [],
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
    const cta = screen.getByRole('link', { name: /Ir para o treino/ })
    expect(cta.getAttribute('href')).toBe('/treino')
  })
})

describe('página do cargo — provas em foco vs. outras provas', () => {
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

  it('múltiplas provas: uma vira o plano em foco, as outras viram opções de treino', async () => {
    mockCargoApi({
      detail: multiProvaDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // Foco na Tipo 1 (primária, com tentativas): prontidão reflete a melhor nota.
    expect(screen.getByText('70%')).toBeTruthy()
    expect(screen.getByText(/Plano com base na prova/)).toBeTruthy()
    expect(screen.getByText('Tipo 1')).toBeTruthy()

    // Tipo 2 aparece como outra prova para treinar, com seu próprio CTA.
    const others = screen
      .getByRole('heading', { name: 'Treine com outras provas' })
      .closest('section')!
    expect(within(others).getByText('Tipo 2')).toBeTruthy()
    expect(
      within(others).getByRole('button', { name: /Treinar: Tipo 2/ }),
    ).toBeTruthy()
  })

  it('prova futura sem questões próprias: foco numa relacionada, a outra vira opção', async () => {
    mockCargoApi({
      detail: makeCargoDetail({
        concurso: { status: 'future' },
        cargo: { questionCount: 0, examDate: '2099-01-01T00:00:00.000Z' },
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
    // Foco na 1ª relacionada (CEBRASPE · 2024); a 2ª vira opção de treino.
    expect(screen.getByText(/CEBRASPE · 2024/)).toBeTruthy()
    const others = screen
      .getByRole('heading', { name: 'Treine com outras provas' })
      .closest('section')!
    expect(within(others).getByText('FGV · 2023')).toBeTruthy()
    expect(within(others).getByText('relacionada')).toBeTruthy()
  })

  it('cargo de prova única: só o plano em foco, sem seção de outras provas', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    expect(screen.getByRole('heading', { name: 'Seu plano de treino' })).toBeTruthy()
    expect(screen.queryByText('Treine com outras provas')).toBeNull()
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
  it('aba Treino (prova passada com tentativas): sem violações sérias/críticas', async () => {
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
    await screen.findByRole('heading', { name: 'Seu plano de treino' })
    await expectNoSeriousAxeViolations(container)
  })

  it('aba Detalhes (prova futura com programático): sem violações sérias/críticas', async () => {
    mockCargoApi({
      detail: makeFutureDetail(),
      distribution: historicalDistribution,
      statsBySubject: { 'exam-prev': [{ subject: 'Enfermagem', count: 20 }] },
    })
    const { container } = renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    goToDetalhes()
    await screen.findByText('Conteúdo programático')
    await expectNoSeriousAxeViolations(container)
  })
})
