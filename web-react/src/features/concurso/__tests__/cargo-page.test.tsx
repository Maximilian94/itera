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
import type { FetchHandler } from './page-test-utils'
import type { CargoDetail, SubjectDistribution } from '../domain/concurso.types'

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

const CARGO_PATH = '/concursos/pmc-2026/enfermeiro'
const API = '/concursos/pmc-2026/cargos/enfermeiro'

/** Abre a aba Detalhes (a página entra na aba Detalhes por padrão, mas o clique
 *  é inofensivo e deixa o teste explícito). */
function goToDetalhes() {
  fireEvent.click(screen.getByRole('tab', { name: /Detalhes/ }))
}

/** Abre a aba Treino (a página entra na aba Detalhes por padrão). */
function goToTreino() {
  fireEvent.click(screen.getByRole('tab', { name: /Treino/ }))
}

/** A aba Treino abre na mesa do treinador; clicar "Treinar" numa prova entra
 *  na vista de treino daquela prova (dentro do concurso). Os CTAs têm nome
 *  acessível "Treinar: <prova>" para terem significado isolado. */
async function enterTraining(name: RegExp | string = /^Treinar: /) {
  fireEvent.click(await screen.findByRole('button', { name }))
}

/** Monta o mapa de handlers da página: detail + blocos satélites.
 *  Retorna o record (mutável) para testes que trocam um handler no meio. */
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
  /** Handler bruto de GET /training (estados pending/erro do gating T2.1). */
  trainingsRaw?: FetchHandler
}) {
  const handlers: Record<string, FetchHandler> = {
    [API]: { body: opts.detail },
    '/stripe/access': {
      body: { status: 'inactive', canDoFreeTraining: false },
    },
    '/training': opts.trainingsRaw ?? { body: opts.trainings ?? [] },
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
  return handlers
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

    goToTreino()
    // Quadro de provas: a prova oficial do concurso é a âncora.
    expect(screen.getByText('Prova do concurso')).toBeTruthy()

    // Treinar a prova oficial → entra na vista de treino em página cheia.
    await enterTraining()

    // Stepper das 5 fases + a fase atual (Prova) ocupa a página.
    expect(screen.getByText('Diagnóstico')).toBeTruthy() // etapa do stepper
    expect(
      screen.getByRole('heading', { name: 'Prova diagnóstica' }),
    ).toBeTruthy()
    // Sem treino iniciado → começar pela prova diagnóstica.
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
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
    goToTreino()

    // No quadro, a prova oficial já mostra a prontidão (melhor nota).
    expect(screen.getByText('72%')).toBeTruthy()

    // Entra no treino da prova oficial (página cheia).
    await enterTraining()

    // A barra de contexto repete a prontidão; sem sessão ainda → "Começar treino".
    expect(screen.getAllByText('72%').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Fazer simulado/ })).toBeNull()
    // Em modo treino as abas saem de cena; sair é pelo "Voltar às provas".
    expect(screen.queryByRole('tab', { name: /Detalhes/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Voltar às provas/ }))

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
    goToTreino()
    // A sessão (FINAL) chega via GET /training → a oficial vira "Treinar novamente".
    await enterTraining(/Treinar novamente/)
    // Vista de treino na fase Final → começar um novo ciclo.
    expect(
      await screen.findByRole('button', { name: /Começar novo ciclo/ }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Resultado final' })).toBeTruthy()
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
    // Default inteligente: com sessão em andamento a página abre na aba Treino.
    expect(treinoTab.getAttribute('aria-selected')).toBe('true')
    // A prova oficial está em andamento → "Continuar" entra na vista de treino.
    await enterTraining(/^Continuar: /)
    // Estágio STUDY → a página abre direto na fase Estudo.
    expect(
      await screen.findByRole('heading', { name: 'Estudar pontos fracos' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', { name: /Ir para a re-tentativa/ }),
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
    goToTreino()

    // Prova oficial futura: explica que ainda não tem questões próprias.
    expect(screen.getByText(/Esta prova ainda não foi aplicada/)).toBeTruthy()
    // Recomenda treinar numa prova equivalente.
    expect(screen.getByText(/VUNESP · 2023/)).toBeTruthy()
    await enterTraining(/Treinar: VUNESP/)
    expect(screen.getByRole('button', { name: /Começar treino/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Voltar às provas/ }))

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
    goToTreino()
    // A oficial é futura (sem questões) → treina na equivalente.
    await enterTraining(/Treinar: VUNESP/)
    // A barra de contexto mostra a prontidão da prova equivalente, abaixo do corte.
    expect(screen.getByText('55%')).toBeTruthy()
    expect(screen.getByText(/faltam 5 pts/)).toBeTruthy()
  })

  it('sem prova treinável: aba Treino vira link de volta aos concursos', async () => {
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
    goToTreino()
    // A navegação agora parte sempre dos concursos (as páginas /treino
    // viraram redirects de compatibilidade).
    const cta = screen.getByRole('link', { name: /Ver concursos/ })
    expect(cta.getAttribute('href')).toBe('/concursos')
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
    goToTreino()
    // A primária (Tipo 1, com tentativas) é a prova oficial: prontidão 70%.
    expect(screen.getByText('Prova do concurso')).toBeTruthy()
    expect(screen.getByText('70%')).toBeTruthy()

    // Tipo 2 aparece na lista de outras provas, com CTA próprio.
    const rec = screen
      .getByRole('heading', { name: 'Outras provas para treinar' })
      .closest('section')!
    expect(within(rec).getByText('Tipo 2')).toBeTruthy()
    expect(within(rec).getByRole('button', { name: /Treinar: Tipo 2/ })).toBeTruthy()
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
    goToTreino()
    // Oficial futura sem questões → a melhor relacionada (tier 1) vira a
    // recomendação "Treine agora"; a outra vai para a lista de outras provas.
    const now = screen
      .getByRole('heading', { name: 'Treine agora' })
      .closest('section')!
    expect(within(now).getByText(/CEBRASPE · 2024/)).toBeTruthy()
    expect(within(now).getByText('mesma banca')).toBeTruthy()

    const rec = screen
      .getByRole('heading', { name: 'Outras provas para treinar' })
      .closest('section')!
    expect(within(rec).getByText('FGV · 2023')).toBeTruthy()
    expect(within(rec).getByText('outra banca')).toBeTruthy()
  })

  it('cargo de prova única: só o plano em foco, sem seção de outras provas', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    goToTreino()
    // Mesa: só a prova oficial, sem "Treine agora" apartado nem outras provas.
    expect(screen.getByText('Prova do concurso')).toBeTruthy()
    expect(screen.queryByText('Treine agora')).toBeNull()
    expect(screen.queryByText('Outras provas para treinar')).toBeNull()
    expect(screen.queryByText('outra banca')).toBeNull()
    // Ao treinar a oficial, abre a vista de treino em página cheia.
    await enterTraining()
    expect(
      screen.getByRole('heading', { name: 'Prova diagnóstica' }),
    ).toBeTruthy()
  })
})

describe('página do cargo — fluxo embutido invalida studyItems (T2.2)', () => {
  /* No fluxo embutido o TrainingFlow não remonta entre as fases: sem invalidar
   * trainingKeys.studyItems ao avançar para STUDY, a fase Estudo mostraria
   * "Nenhuma recomendação ainda" com a lista já criada no backend. */
  it('avançar Diagnóstico → Estudo refaz o GET de study-items e mostra a lista', async () => {
    // UUID real: useTrainingQuery (feedback do diagnóstico) exige UUID válido.
    const tid = '11111111-2222-4333-8444-555555555555'
    const trainingState = {
      trainingId: tid,
      currentStage: 'DIAGNOSIS',
      immediateFeedback: true,
      attemptId: 'a1',
      examBaseId: 'exam-1',
      examBoardId: 'board-1',
      examTitle: 'Prova Enfermeiro',
      studyCompletedSubjects: [],
      attemptFinishedAt: '2026-06-01T00:00:00.000Z',
      retryFinishedAt: null,
      feedback: {
        examTitle: 'Prova Enfermeiro',
        minPassingGradeNonQuota: 60,
        overall: { correct: 30, total: 50, percentage: 60 },
        passed: true,
        subjectStats: [
          { subject: 'SUS', correct: 5, total: 15, percentage: 33 },
        ],
        subjectFeedback: {
          SUS: { evaluation: 'Reforce a Lei 8.080.', recommendations: [] },
        },
      },
    }
    const handlers = mockCargoApi({
      detail: makeCargoDetail(),
      trainings: [{ trainingId: tid, examBaseId: 'exam-1', currentStage: 'DIAGNOSIS' }],
      statsBySubject: { 'exam-1': [{ subject: 'SUS', count: 15 }] },
    })
    handlers[`/training/${tid}`] = { body: trainingState }
    // Estado do servidor ANTES do avanço: itens ainda não criados.
    handlers[`/training/${tid}/study-items`] = { body: [] }
    // PATCH /stage responde a sessão já em STUDY (o backend cria os itens aqui).
    handlers[`/training/${tid}/stage`] = {
      body: { ...trainingState, currentStage: 'STUDY' },
    }

    renderPage(CARGO_PATH)
    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    // Sessão em andamento → retomar entra na fase Diagnóstico.
    await enterTraining(/^Continuar: /)
    expect(
      await screen.findByRole('button', { name: /Ir para o estudo/ }),
    ).toBeTruthy()

    // O avanço cria os itens no backend; o refetch (invalidation) deve trazê-los.
    handlers[`/training/${tid}/study-items`] = {
      body: [
        {
          id: 'si-1',
          subject: 'SUS',
          topic: 'Lei 8.080',
          linkedQuestionIds: ['q1'],
          recommendationTitle: 'Revisar a Lei 8.080',
          recommendationText: 'Foque nos princípios do SUS.',
          explanation: null,
          completedAt: null,
          exercises: [],
        },
      ],
    }
    fireEvent.click(screen.getByRole('button', { name: /Ir para o estudo/ }))

    // Fase Estudo SEM remount/refocus: a lista chega populada.
    expect(
      await screen.findByRole('heading', { name: 'Estudar pontos fracos' }),
    ).toBeTruthy()
    expect(await screen.findByText('Revisar a Lei 8.080')).toBeTruthy()
    expect(screen.queryByText(/Nenhuma recomendação de estudo ainda/)).toBeNull()
  })
})

describe('página do cargo — ações de treino invalidam concursoKeys (T2.3)', () => {
  /* O detalhe do cargo tem staleTime de 5 min; sem invalidar nas ações de
   * treino, GoalCard/TrainingHeader/ReadinessBar mostram a prontidão antiga. */
  it('avançar de fase refaz o detalhe do cargo: a prontidão nova aparece sem reload', async () => {
    const tid = '11111111-2222-4333-8444-555555555555'
    const trainingState = {
      trainingId: tid,
      currentStage: 'DIAGNOSIS',
      immediateFeedback: true,
      attemptId: 'a1',
      examBaseId: 'exam-1',
      examBoardId: 'board-1',
      examTitle: 'Prova Enfermeiro',
      studyCompletedSubjects: [],
      attemptFinishedAt: '2026-06-01T00:00:00.000Z',
      retryFinishedAt: null,
      feedback: {
        examTitle: 'Prova Enfermeiro',
        minPassingGradeNonQuota: 60,
        overall: { correct: 30, total: 50, percentage: 60 },
        passed: true,
        subjectStats: [{ subject: 'SUS', correct: 5, total: 15, percentage: 33 }],
        subjectFeedback: {
          SUS: { evaluation: 'Reforce a Lei 8.080.', recommendations: [] },
        },
      },
    }
    // bestScore null → o header do treino ainda não mostra "Prontidão".
    const handlers = mockCargoApi({
      detail: makeCargoDetail(),
      trainings: [{ trainingId: tid, examBaseId: 'exam-1', currentStage: 'DIAGNOSIS' }],
      statsBySubject: { 'exam-1': [{ subject: 'SUS', count: 15 }] },
    })
    handlers[`/training/${tid}`] = { body: trainingState }
    handlers[`/training/${tid}/study-items`] = { body: [] }
    handlers[`/training/${tid}/stage`] = {
      body: { ...trainingState, currentStage: 'STUDY' },
    }

    renderPage(CARGO_PATH)
    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    await enterTraining(/^Continuar: /)
    await screen.findByRole('button', { name: /Ir para o estudo/ })
    expect(screen.queryByText('Prontidão')).toBeNull()

    // O servidor agora conhece a nota da prova → o refetch (invalidation)
    // deve trazer a prontidão nova para o header do treino.
    handlers[API] = {
      body: makeCargoDetail({
        studyPlan: {
          currentStep: 'treino_dirigido',
          attemptCount: 1,
          bestScore: 55,
          scoreDelta: null,
          weakSubjects: [],
        },
      }),
    }
    fireEvent.click(screen.getByRole('button', { name: /Ir para o estudo/ }))

    expect(await screen.findByText('Prontidão')).toBeTruthy()
    expect(await screen.findByText('55%')).toBeTruthy()
    expect(screen.getByText(/faltam 5 pts/)).toBeTruthy()
  })
})

describe('página do cargo — gating da mesa por GET /training (T2.1)', () => {
  /* Começar um treino consome cota: enquanto a lista de sessões não assenta,
   * a mesa NUNCA mostra "Treinar" — clicar às cegas com uma sessão em
   * andamento criaria outra sessão e cobraria o usuário. */

  it('lista de treinos carregando: mesa sem nenhum CTA de treino (skeleton)', async () => {
    mockCargoApi({
      detail: makeCargoDetail(),
      trainingsRaw: 'pending',
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    goToTreino()

    expect(screen.queryByRole('button', { name: /^Treinar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Continuar/ })).toBeNull()
    expect(screen.queryByText('Prova do concurso')).toBeNull()
  })

  it('erro na lista de treinos: estado de erro com retry; sem "Treinar" às cegas', async () => {
    const handlers = mockCargoApi({
      detail: makeCargoDetail(),
      trainingsRaw: { status: 500, body: { message: 'boom' } },
      statsBySubject: { 'exam-1': [{ subject: 'Enfermagem', count: 25 }] },
    })
    renderPage(CARGO_PATH)

    await screen.findByRole('heading', { level: 1, name: 'Enfermeiro' })
    goToTreino()

    expect(
      await screen.findByText('Não foi possível carregar seus treinos'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Treinar/ })).toBeNull()

    // A rede volta → retry carrega a mesa (a sessão em andamento aparece).
    handlers['/training'] = {
      body: [{ trainingId: 't1', examBaseId: 'exam-1', currentStage: 'STUDY' }],
    }
    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/ }))

    expect(await screen.findByText('Prova do concurso')).toBeTruthy()
    // Com a sessão em andamento revelada, o CTA é retomar — não "Treinar".
    expect(screen.getByRole('button', { name: /^Continuar: / })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Treinar: / })).toBeNull()
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
    goToTreino()
    await enterTraining()
    await screen.findByRole('heading', { name: 'Prova diagnóstica' })
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
