export function parsePrice(p) {
  if (!p) return 0
  const cleaned = p.replace(/[^0-9.,]/g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}

export function formatPrice(n) {
  return `€ ${n.toFixed(2)}`
}
