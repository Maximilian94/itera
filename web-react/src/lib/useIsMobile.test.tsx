// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useIsMobile } from './useIsMobile'

function TestComponent() {
  const isMobile = useIsMobile()

  return <div>{isMobile ? 'mobile' : 'desktop'}</div>
}

type MatchMediaListener = (event: MediaQueryListEvent) => void

function installMatchMedia(width: number) {
  let currentWidth = width
  const mediaQueries = new Set<MediaQueryList>()

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => {
      const listeners = new Set<MatchMediaListener>()
      const mediaQuery = {
        media: query,
        matches: currentWidth <= 767,
        onchange: null,
        addListener: (listener: MatchMediaListener) => listeners.add(listener),
        removeListener: (listener: MatchMediaListener) =>
          listeners.delete(listener),
        addEventListener: (_: string, listener: MatchMediaListener) =>
          listeners.add(listener),
        removeEventListener: (_: string, listener: MatchMediaListener) =>
          listeners.delete(listener),
        dispatchEvent: () => true,
      } as MediaQueryList

      mediaQueries.add(mediaQuery)

      Object.defineProperty(mediaQuery, '__listeners', {
        value: listeners,
      })

      return mediaQuery
    },
  })

  return {
    resize(nextWidth: number) {
      currentWidth = nextWidth
      mediaQueries.forEach((mediaQuery) => {
        Object.defineProperty(mediaQuery, 'matches', {
          configurable: true,
          value: currentWidth <= 767,
        })

        ;(
          mediaQuery as MediaQueryList & {
            __listeners: Set<MatchMediaListener>
          }
        ).__listeners.forEach((listener) =>
          listener({
            matches: mediaQuery.matches,
            media: mediaQuery.media,
          } as MediaQueryListEvent),
        )
      })
    },
  }
}

describe('useIsMobile', () => {
  let viewport: ReturnType<typeof installMatchMedia>

  beforeEach(() => {
    viewport = installMatchMedia(360)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('returns true below the mobile breakpoint', () => {
    render(<TestComponent />)

    expect(screen.getByText('mobile')).toBeTruthy()
  })

  it('reacts to viewport changes', () => {
    render(<TestComponent />)
    expect(screen.getByText('mobile')).toBeTruthy()

    act(() => {
      viewport.resize(1024)
    })

    expect(screen.getByText('desktop')).toBeTruthy()
  })
})
