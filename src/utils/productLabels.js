import glutenFreeIcon from '../assets/GLUTEN_FREE.svg'
import lactoseFreeIcon from '../assets/LACTOSE_FREE.svg'
import veganIcon from '../assets/VEGAN.svg'
import vegetarianIcon from '../assets/VEGETERIAN.svg'

const LABEL_ICON_MAP = {
  GLUTEN_FREE: { src: glutenFreeIcon, alt: 'Gluten free' },
  DAIRY_FREE: { src: lactoseFreeIcon, alt: 'Dairy free' },
  VEGAN: { src: veganIcon, alt: 'Vegan' },
  VEGETARIAN: { src: vegetarianIcon, alt: 'Vegetarian' },
}

function normalizeLabel(label) {
  return String(label || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

export function getProductLabelIcons(labels) {
  if (!labels) return []

  const values = Array.isArray(labels)
    ? labels
    : typeof labels === 'string'
      ? labels.split(',').map((entry) => entry.trim()).filter(Boolean)
      : []

  const seen = new Set()

  return values.reduce((acc, label) => {
    const normalized = normalizeLabel(label)
    const mapped = LABEL_ICON_MAP[normalized]
    if (!mapped || seen.has(normalized)) return acc
    seen.add(normalized)
    acc.push({
      key: normalized,
      src: mapped.src,
      alt: mapped.alt,
    })
    return acc
  }, [])
}
