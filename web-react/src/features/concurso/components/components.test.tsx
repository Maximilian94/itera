// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AcademicCapIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { FichaCard } from './FichaCard'
import { institutionInitials } from './InstitutionMark'
import { ReadinessBar } from './ReadinessBar'
import { StatusPill } from './StatusPill'
import { SubjectDistribution, accuracyChipClass } from './SubjectDistribution'
import {
  VerticalTimeline,
  buildConcursoTimelineSteps,
} from './VerticalTimeline'
import type { SubjectDistribution as SubjectDistributionData } from '../domain/concurso.types'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('institutionInitials', () => {
  it('usa primeira e última palavra significativa', () => {
    expect(institutionInitials('Prefeitura Municipal de Campinas')).toBe('PC')
    expect(institutionInitials('Universidade de São Paulo')).toBe('UP')
  })

  it('usa as duas primeiras letras para nome de uma palavra', () => {
    expect(institutionInitials('Cebraspe')).toBe('CE')
  })

  it('ignora stopwords isoladas e string vazia', () => {
    expect(institutionInitials('')).toBe('')
    expect(institutionInitials('de')).toBe('')
  })
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
  it('esconde etapas com data null', () => {
    const { container } = render(
      <VerticalTimeline
        steps={[
          { label: 'Inscrições', date: '02/06 a 30/06', state: 'done' },
          { label: 'Prova objetiva', date: null, state: 'upcoming' },
          { label: 'Resultado final', date: '30/09/2026', state: 'upcoming' },
        ]}
      />,
    )
    expect(container.querySelectorAll('ol li')).toHaveLength(2)
    expect(screen.queryByText('Prova objetiva')).toBeNull()
  })
})

describe('buildConcursoTimelineSteps', () => {
  const timeline = {
    registrationStart: '2026-06-02T00:00:00.000Z',
    registrationEnd: '2026-06-30T00:00:00.000Z',
    examDate: '2026-08-23T00:00:00.000Z',
    resultDate: null,
  }

  it('formata datas em pt-BR e deriva estados do status', () => {
    const steps = buildConcursoTimelineSteps(timeline, 'open')
    expect(steps).toEqual([
      { label: 'Inscrições', date: '02/06 a 30/06', state: 'current' },
      { label: 'Prova objetiva', date: '23/08/2026', state: 'upcoming' },
      { label: 'Resultado final', date: null, state: 'upcoming' },
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
