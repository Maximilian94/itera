// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AcademicCapIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { FichaCard } from './FichaCard'
import { ReadinessBar } from './ReadinessBar'
import { StatusPill } from './StatusPill'
import { SubjectDistribution, accuracyChipClass } from './SubjectDistribution'
import {
  VerticalTimeline,
  buildConcursoTimelineSteps,
  buildEtapaTimelineSteps,
  condenseEtapas,
  isEtapaMajor,
} from './VerticalTimeline'
import type { SubjectDistribution as SubjectDistributionData } from '../domain/concurso.types'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('StatusPill', () => {
  it('mostra o dot pulsante só em open', () => {
    const { container, rerender } = render(
      <StatusPill status="open" label="Inscrições abertas" />,
    )
    expect(container.querySelector('.animate-ping')).not.toBeNull()

    rerender(<StatusPill status="future" label="Prova em 72 dias" />)
    expect(container.querySelector('.animate-ping')).toBeNull()
  })

  it('open e future usam tom cyan com o rótulo vindo de fora', () => {
    const { rerender } = render(
      <StatusPill status="open" label="Inscrições abertas" />,
    )
    expect(screen.getByText('Inscrições abertas').className).toContain(
      'bg-cyan-50',
    )

    rerender(<StatusPill status="future" label="Prova em 72 dias" />)
    expect(screen.getByText('Prova em 72 dias').className).toContain(
      'bg-cyan-50',
    )
  })

  it('usa tom slate para prova passada', () => {
    render(<StatusPill status="past" label="Prova aplicada" />)
    expect(screen.getByText('Prova aplicada').className).toContain(
      'bg-slate-100',
    )
  })

  it('o ping respeita prefers-reduced-motion', () => {
    const { container } = render(
      <StatusPill status="open" label="Inscrições abertas" />,
    )
    expect(container.querySelector('.animate-ping')?.className).toContain(
      'motion-reduce:hidden',
    )
  })
})

describe('FichaCard', () => {
  const hero = { icon: BanknotesIcon, label: 'Salário base', value: 'R$ 8.500' }

  it('esconde linhas com value null — nunca "não informado"', () => {
    render(
      <FichaCard
        title="Ficha do cargo"
        hero={hero}
        rows={[
          {
            icon: AcademicCapIcon,
            label: 'Requisitos',
            value: 'Superior em Enfermagem',
          },
          { icon: AcademicCapIcon, label: 'Jornada', value: null },
        ]}
        editalUrl="https://example.com/edital.pdf"
        enterIdx={0}
      />,
    )
    expect(screen.getByText('Requisitos')).toBeTruthy()
    expect(screen.queryByText('Jornada')).toBeNull()
    expect(screen.queryByText(/não informado/i)).toBeNull()
  })

  it('esconde o botão de edital quando editalUrl é null', () => {
    const { rerender } = render(
      <FichaCard
        title="Ficha"
        hero={hero}
        rows={[]}
        editalUrl="https://example.com/e.pdf"
        enterIdx={0}
      />,
    )
    expect(
      screen.getByText('Ver edital oficial').closest('a')?.getAttribute('href'),
    ).toBe('https://example.com/e.pdf')

    rerender(
      <FichaCard
        title="Ficha"
        hero={hero}
        rows={[]}
        editalUrl={null}
        enterIdx={0}
      />,
    )
    expect(screen.queryByText('Ver edital oficial')).toBeNull()
  })

  it('mantém a semântica dl/dt/dd', () => {
    const { container } = render(
      <FichaCard
        title="Ficha"
        hero={hero}
        rows={[{ icon: AcademicCapIcon, label: 'Jornada', value: '40h' }]}
        editalUrl={null}
        enterIdx={0}
      />,
    )
    expect(container.querySelector('dl dt')?.textContent).toBe('Jornada')
    expect(container.querySelector('dl dd')?.textContent).toBe('40h')
  })
})

describe('VerticalTimeline', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('esconde etapas com data null', () => {
    const { container } = render(
      <VerticalTimeline
        steps={[
          {
            label: 'Inscrições',
            startIso: '2026-06-02',
            endIso: '2026-06-30',
            state: 'done',
          },
          { label: 'Prova objetiva', startIso: null, state: 'upcoming' },
          { label: 'Resultado final', startIso: '2026-09-30', state: 'upcoming' },
        ]}
      />,
    )
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(screen.queryByText('Prova objetiva')).toBeNull()
  })

  it('colapsa etapas burocráticas atrás de "Ver cronograma completo"', () => {
    const { container } = render(
      <VerticalTimeline
        steps={[
          {
            label: 'Inscrições',
            startIso: '2026-07-27',
            endIso: '2026-08-17',
            state: 'current',
          },
          {
            label: 'Data limite para pagamento do boleto',
            startIso: '2026-08-17',
            state: 'upcoming',
            major: false,
          },
          { label: 'Prova Objetiva', startIso: '2026-09-06', state: 'upcoming' },
        ]}
        keepUndated
      />,
    )
    // Colapsado: só os marcos.
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(screen.queryByText('Data limite para pagamento do boleto')).toBeNull()

    const toggle = screen.getByRole('button', {
      name: 'Ver cronograma completo (3 etapas)',
    })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)

    expect(container.querySelectorAll('ol li')).toHaveLength(3)
    expect(screen.getByText('Data limite para pagamento do boleto')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mostrar só os marcos' })).toBeTruthy()
  })

  it('etapa corrente aparece mesmo sendo burocrática; sem escondidas não há botão', () => {
    render(
      <VerticalTimeline
        steps={[
          {
            label: 'Prazo de recursos do gabarito',
            startIso: '2026-09-08',
            state: 'current',
            major: false,
          },
          { label: 'Prova Prática', startIso: '2026-10-04', state: 'upcoming' },
        ]}
        keepUndated
      />,
    )
    expect(screen.getByText('Prazo de recursos do gabarito')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('bloco-calendário ancora a data e o marco corrente mostra a contagem regressiva', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'))
    render(
      <VerticalTimeline
        steps={[
          {
            label: 'Publicação do edital',
            startIso: '2026-07-20',
            state: 'done',
          },
          {
            label: 'Inscrições',
            startIso: '2026-07-27',
            endIso: '2026-08-17',
            state: 'current',
          },
          { label: 'Prova Objetiva', startIso: '2026-09-06', state: 'upcoming' },
        ]}
      />,
    )
    // Bloco-calendário: dia + mês abreviado do início da etapa.
    expect(screen.getByText('27')).toBeTruthy()
    expect(screen.getAllByText('jul')).toHaveLength(2) // 20/jul e 27/jul
    expect(screen.getByText('06')).toBeTruthy()
    expect(screen.getByText('set')).toBeTruthy()
    // Intervalo: o fim aparece como meta abaixo do rótulo.
    expect(screen.getByText('até 17/08/2026')).toBeTruthy()
    // Contagem regressiva só no marco corrente (17/08 - 02/08 = 15 dias).
    expect(screen.getByText('termina em 15 dias')).toBeTruthy()
  })

  it('sem contagem regressiva fora do corrente; pontual corrente usa "em N dias"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'))
    render(
      <VerticalTimeline
        steps={[
          { label: 'Prova Objetiva', startIso: '2026-09-06', state: 'current' },
          { label: 'Resultado final', startIso: '2026-10-23', state: 'upcoming' },
        ]}
      />,
    )
    expect(screen.getByText('em 5 dias')).toBeTruthy()
    expect(screen.queryByText(/em 52 dias/)).toBeNull()
  })
})

describe('isEtapaMajor', () => {
  it('marca os marcos do certame', () => {
    expect(isEtapaMajor('Inscrições')).toBe(true)
    expect(isEtapaMajor('Prova Objetiva')).toBe(true)
    expect(isEtapaMajor('Realização da prova prática')).toBe(true)
    expect(isEtapaMajor('Divulgação de gabarito das provas objetivas')).toBe(true)
    // Homologação final vence a regra de "retificação".
    expect(
      isEtapaMajor(
        'Publicação da retificação e/ou homologação da classificação final e HOMOLOGAÇÃO do Concurso Público',
      ),
    ).toBe(true)
  })

  it('rebaixa a burocracia (recursos, boletos, retificações, notas)', () => {
    expect(isEtapaMajor('Publicação do Edital')).toBe(false)
    expect(
      isEtapaMajor('Data limite para pagamento do boleto da taxa de inscrição'),
    ).toBe(false)
    expect(isEtapaMajor('Divulgação da relação de candidatos inscritos')).toBe(false)
    expect(
      isEtapaMajor('Prazo de recursos em relação ao gabarito das provas objetivas'),
    ).toBe(false)
    expect(isEtapaMajor('Divulgação da Nota da Prova Prática')).toBe(false)
    expect(
      isEtapaMajor(
        'Homologação da nota da prova objetiva e dos títulos e convocação para a prova prática',
      ),
    ).toBe(false)
  })
})

describe('condenseEtapas', () => {
  it('funde pares "— início"/"— fim" num intervalo único', () => {
    const out = condenseEtapas([
      { name: 'Inscrições — início', description: null, date: '2026-07-27' },
      { name: 'Inscrições — fim', description: null, date: '2026-08-17' },
      { name: 'Prova Objetiva', description: 'Manhã.', date: '2026-09-06' },
    ])
    expect(out).toEqual([
      {
        name: 'Inscrições',
        description: null,
        dateStart: '2026-07-27',
        dateEnd: '2026-08-17',
      },
      {
        name: 'Prova Objetiva',
        description: 'Manhã.',
        dateStart: '2026-09-06',
        dateEnd: null,
      },
    ])
  })

  it('metade sem par mantém a data que tiver', () => {
    const out = condenseEtapas([
      { name: 'Prazo de recursos - fim', description: null, date: '2026-09-10' },
    ])
    expect(out).toEqual([
      {
        name: 'Prazo de recursos',
        description: null,
        dateStart: '2026-09-10',
        dateEnd: null,
      },
    ])
  })
})

describe('buildEtapaTimelineSteps', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('ordena, funde intervalos e deriva estados de hoje (intervalo aberto = current)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'))
    const steps = buildEtapaTimelineSteps([
      { name: 'Prova Objetiva', description: null, date: '2026-09-06' },
      { name: 'Publicação do Edital', description: null, date: '2026-07-20' },
      { name: 'Inscrições — início', description: null, date: '2026-07-27' },
      { name: 'Inscrições — fim', description: null, date: '2026-08-17' },
      { name: 'Homologação do Concurso', description: null, date: null },
    ])
    expect(steps).toEqual([
      {
        label: 'Publicação do Edital',
        description: null,
        startIso: '2026-07-20',
        endIso: null,
        major: false,
        state: 'done',
      },
      {
        label: 'Inscrições',
        description: null,
        startIso: '2026-07-27',
        endIso: '2026-08-17',
        major: true,
        state: 'current',
      },
      {
        label: 'Prova Objetiva',
        description: null,
        startIso: '2026-09-06',
        endIso: null,
        major: true,
        state: 'upcoming',
      },
      {
        label: 'Homologação do Concurso',
        description: null,
        startIso: null,
        endIso: null,
        major: true,
        state: 'upcoming',
      },
    ])
  })
})

describe('buildConcursoTimelineSteps', () => {
  const timeline = {
    registrationStart: '2026-06-02T00:00:00.000Z',
    registrationEnd: '2026-06-30T00:00:00.000Z',
    examDate: '2026-08-23T00:00:00.000Z',
    resultDate: null,
  }

  it('repassa as datas ISO e deriva estados do status', () => {
    const steps = buildConcursoTimelineSteps(timeline, 'open')
    expect(steps).toEqual([
      {
        label: 'Inscrições',
        startIso: '2026-06-02T00:00:00.000Z',
        endIso: '2026-06-30T00:00:00.000Z',
        state: 'current',
      },
      {
        label: 'Prova objetiva',
        startIso: '2026-08-23T00:00:00.000Z',
        endIso: null,
        state: 'upcoming',
      },
      { label: 'Resultado final', startIso: null, endIso: null, state: 'upcoming' },
    ])
  })

  it('marca tudo como done para concurso passado', () => {
    const steps = buildConcursoTimelineSteps(
      { ...timeline, resultDate: '2026-09-30T00:00:00.000Z' },
      'past',
    )
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'done'])
  })
})

describe('ReadinessBar', () => {
  it('fica verde acima do corte e mostra o marcador', () => {
    const { container } = render(<ReadinessBar value={72} cut={60} meters />)
    const track = container.firstElementChild!
    expect(track.querySelector('.bg-emerald-500')).not.toBeNull()
    expect(track.children).toHaveLength(2) // fill + marcador de corte
  })

  it('abaixo do corte → barra cyan (sem verde) mas com o marcador do corte', () => {
    const { container } = render(<ReadinessBar value={40} cut={60} meters />)
    const track = container.firstElementChild!
    expect(track.querySelector('.bg-cyan-500')).not.toBeNull()
    expect(track.querySelector('.bg-emerald-500')).toBeNull()
    expect(track.children).toHaveLength(2) // fill + marcador de corte
  })

  it('sem corte → barra cyan simples, sem marcador', () => {
    const { container } = render(<ReadinessBar value={40} cut={null} meters />)
    const track = container.firstElementChild!
    expect(track.querySelector('.bg-cyan-500')).not.toBeNull()
    expect(track.querySelector('.bg-emerald-500')).toBeNull()
    expect(track.children).toHaveLength(1) // só o fill
  })
})

describe('accuracyChipClass', () => {
  it('verde ≥70, âmbar 60–69, rosa <60', () => {
    expect(accuracyChipClass(74)).toContain('emerald')
    expect(accuracyChipClass(66)).toContain('amber')
    expect(accuracyChipClass(48)).toContain('rose')
  })

  it('vira exatamente nas fronteiras das faixas (70 e 60)', () => {
    expect(accuracyChipClass(70)).toContain('emerald')
    expect(accuracyChipClass(69)).toContain('amber')
    expect(accuracyChipClass(60)).toContain('amber')
    expect(accuracyChipClass(59)).toContain('rose')
  })
})

describe('SubjectDistribution', () => {
  const data: SubjectDistributionData = {
    mode: 'actual',
    sourceExams: [],
    totalQuestions: 100,
    subjects: [
      { subject: 'Enfermagem', count: 50, share: 0.5, userAccuracy: 0.74 },
      { subject: 'SUS', count: 30, share: 0.3, userAccuracy: null },
      { subject: 'Português', count: 20, share: 0.2, userAccuracy: 0.48 },
    ],
    insight: {
      topSubjects: ['Enfermagem', 'SUS'],
      topShare: 0.8,
      weakestRelevant: { subject: 'Português', accuracy: 0.48 },
    },
  }

  it('renderiza shares/chips a partir do payload da API; sem handler, nenhuma linha é botão', () => {
    render(
      <SubjectDistribution
        title="O que caiu"
        subtitle="x"
        data={data}
        predictive={false}
        meters
        enterIdx={0}
      />,
    )
    // Sem onTrainSubject/trainableSubjects não há CTA de treino nas linhas.
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('você: 74%')).toBeTruthy()
    // SUS sem acurácia → sem chip
    expect(screen.queryByText('você: 30%')).toBeNull()
    expect(screen.getByText('50%')).toBeTruthy()
  })

  it('só matérias treináveis viram botão, e o clique devolve a matéria', () => {
    const clicked: Array<string> = []
    render(
      <SubjectDistribution
        title="t"
        subtitle="s"
        data={data}
        predictive={false}
        meters
        enterIdx={0}
        onTrainSubject={(subject) => clicked.push(subject)}
        trainableSubjects={new Set(['Enfermagem', 'SUS'])}
      />,
    )
    const btn = screen.getByRole('button', { name: 'Treinar Enfermagem' })
    fireEvent.click(btn)
    expect(clicked).toEqual(['Enfermagem'])
    // Português fora do set (ex.: sem questões na prova alvo) → linha sem CTA.
    expect(
      screen.queryByRole('button', { name: 'Treinar Português' }),
    ).toBeNull()
  })

  it('sem tentativas o insight degrada: pesos continuam, ponto fraco e chips somem', () => {
    const semTentativas: SubjectDistributionData = {
      ...data,
      subjects: data.subjects.map((s) => ({ ...s, userAccuracy: null })),
      insight: { ...data.insight, weakestRelevant: null },
    }
    render(
      <SubjectDistribution
        title="t"
        subtitle="s"
        data={semTentativas}
        predictive={false}
        meters
        enterIdx={0}
      />,
    )
    // A leitura de pesos (dado da prova) permanece…
    expect(screen.getByText('80%')).toBeTruthy()
    expect(screen.getByText(/da prova\./)).toBeTruthy()
    // …mas nada personalizado é inventado sem dados do usuário
    expect(screen.queryByText(/Seu ponto mais fraco/)).toBeNull()
    expect(screen.queryByText(/você:/)).toBeNull()
  })

  it('insight: verbo muda com predictive e o ponto fraco vem da API', () => {
    const { rerender } = render(
      <SubjectDistribution
        title="t"
        subtitle="s"
        data={data}
        predictive={false}
        meters
        enterIdx={0}
      />,
    )
    expect(screen.getByText(/da prova\./)).toBeTruthy()
    expect(screen.getByText(/Português \(48%\)/)).toBeTruthy()

    rerender(
      <SubjectDistribution
        title="t"
        subtitle="s"
        data={data}
        predictive
        meters
        enterIdx={0}
      />,
    )
    expect(screen.getByText(/das últimas provas\./)).toBeTruthy()
  })
})
