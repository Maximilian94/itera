/**
 * Contraste WCAG 2.1 AA dos pares de cor usados nas páginas de concurso
 * (MAX-26). O axe roda em jsdom sem renderização real, então o passe de
 * contraste é garantido aqui, direto nos tokens do Tailwind: texto pequeno
 * (chips, rótulos xs/sm) precisa de ≥4.5:1; texto grande (score 4xl) ≥3:1.
 */
import { describe, expect, it } from 'vitest'
import { wcagContrast } from 'culori'
import colors from 'tailwindcss/colors'

const WHITE = '#ffffff'
const contrast = (fg: string, bg: string) => wcagContrast(fg, bg)

describe('contraste AA — texto pequeno (≥4.5:1)', () => {
  it.each([
    [
      'chip acerto alto: emerald-700 / emerald-50',
      colors.emerald[700],
      colors.emerald[50],
    ],
    [
      'chip acerto médio: amber-700 / amber-50',
      colors.amber[700],
      colors.amber[50],
    ],
    [
      'chip acerto baixo: rose-700 / rose-50',
      colors.rose[700],
      colors.rose[50],
    ],
    ['pill open/future: cyan-700 / cyan-50', colors.cyan[700], colors.cyan[50]],
    ['pill past: slate-600 / slate-100', colors.slate[600], colors.slate[100]],
    [
      'chip evolução: emerald-700 / emerald-50',
      colors.emerald[700],
      colors.emerald[50],
    ],
    ['chip queda: rose-700 / rose-50', colors.rose[700], colors.rose[50]],
    ['rótulo acima do corte: emerald-700 / branco', colors.emerald[700], WHITE],
    [
      'rótulo acima do corte: emerald-700 / slate-50',
      colors.emerald[700],
      colors.slate[50],
    ],
    ['rótulo abaixo do corte: rose-600 / branco', colors.rose[600], WHITE],
    [
      'rótulo abaixo do corte: rose-600 / slate-50',
      colors.rose[600],
      colors.slate[50],
    ],
    ['insight ponto fraco: rose-700 / branco', colors.rose[700], WHITE],
    ['CTA secundário: cyan-700 / branco', colors.cyan[700], WHITE],
    ['texto de apoio: slate-500 / branco', colors.slate[500], WHITE],
    [
      'prazo de inscrição: amber-700 / amber-50',
      colors.amber[700],
      colors.amber[50],
    ],
  ])('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('contraste AA — texto grande (≥3:1)', () => {
  it.each([
    [
      'score 4xl acima do corte: emerald-600 / slate-50',
      colors.emerald[600],
      colors.slate[50],
    ],
    [
      'score 4xl abaixo do corte: rose-600 / slate-50',
      colors.rose[600],
      colors.slate[50],
    ],
  ])('%s', (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3)
  })
})
