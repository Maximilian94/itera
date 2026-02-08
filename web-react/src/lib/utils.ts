export function formatBRL(value: string | number) {
    const number = typeof value === 'string' ? Number(value) : value
    if (!Number.isFinite(number)) return '—'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(number)
  }