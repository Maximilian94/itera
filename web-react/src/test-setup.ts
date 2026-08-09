import { configure } from '@testing-library/dom'

/**
 * O default de 1s do waitFor/findBy* estoura quando todos os arquivos de
 * teste rodam em paralelo (primeiro mount de cada página passa de 1s sob
 * carga de CPU) — flakes intermitentes na suíte cheia. 5s não atrasa teste
 * que passa; só dá folga ao que montaria de qualquer jeito.
 */
configure({ asyncUtilTimeout: 5000 })
