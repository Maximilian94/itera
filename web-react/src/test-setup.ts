import { configure } from '@testing-library/dom'

/**
 * O default de 1s do waitFor/findBy* estoura quando todos os arquivos de
 * teste rodam em paralelo (primeiro mount de cada página passa de 1s sob
 * carga de CPU) — flakes intermitentes na suíte cheia. 5s não atrasa teste
 * que passa; só dá folga ao que montaria de qualquer jeito.
 */
configure({ asyncUtilTimeout: 5000 })

/**
 * jsdom não implementa `matchMedia` — componentes que consultam media queries
 * (ex.: `prefers-reduced-motion` no Coachmark) precisam de um stub. Default
 * `matches: false`; testes que dependem de um valor específico sobrescrevem.
 */
if (
  typeof window !== 'undefined' &&
  (window as { matchMedia?: unknown }).matchMedia == null
) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom também não implementa `scrollIntoView` (usado pelo coach-mark).
if (
  typeof Element !== 'undefined' &&
  (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView == null
) {
  Element.prototype.scrollIntoView = () => {}
}
