import i18n from '../i18n'
import glutenFreeIcon from '../assets/GLUTEN_FREE.svg'
import lactoseFreeIcon from '../assets/LACTOSE_FREE.svg'
import veganIcon from '../assets/VEGAN.svg'
import vegetarianIcon from '../assets/VEGETERIAN.svg'

/** Legacy English enums → backend canonical (Italian) codes */
const LEGACY_LABEL_TO_CANONICAL = {
  GLUTEN_FREE: 'SENZA_GLUTINE',
  DAIRY_FREE: 'SENZA_LATTE',
  LACTOSE_FREE: 'SENZA_LATTOSIO',
  VEGAN: 'VEGANO',
  VEGETARIAN: 'VEGETARIANO',
  NUT_FREE: 'SENZA_FRUTTA_A_GUSCIO',
  SUGAR_FREE: 'SENZA_ZUCCHERO',
  ORGANIC: 'BIOLOGICO',
  SPICY: 'PICCANTE',
}

/** Canonical code → { src, altEn, altIt } — alt used when no src (icon-only rows) */
const LABEL_CONFIG = {
  SENZA_GLUTINE: { src: glutenFreeIcon, altEn: 'Gluten-free', altIt: 'Senza glutine' },
  SENZA_LATTE: { src: lactoseFreeIcon, altEn: 'Dairy-free', altIt: 'Senza latte' },
  SENZA_LATTOSIO: { src: lactoseFreeIcon, altEn: 'Lactose-free', altIt: 'Senza lattosio' },
  VEGANO: { src: veganIcon, altEn: 'Vegan', altIt: 'Vegano' },
  VEGETARIANO: { src: vegetarianIcon, altEn: 'Vegetarian', altIt: 'Vegetariano' },
  SENZA_FRUTTA_A_GUSCIO: {
    src: null,
    altEn: 'Nut-free',
    altIt: 'Senza frutta a guscio',
  },
  SENZA_ZUCCHERO: { src: null, altEn: 'Sugar-free', altIt: 'Senza zucchero' },
  BIOLOGICO: { src: null, altEn: 'Organic', altIt: 'Biologico' },
  PICCANTE: { src: null, altEn: 'Spicy', altIt: 'Piccante' },
  HALAL: { src: null, altEn: 'Halal', altIt: 'Halal' },
  KOSHER: { src: null, altEn: 'Kosher', altIt: 'Kosher' },
}

function normalizeLabel(label) {
  return String(label || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function toCanonical(normalized) {
  return LEGACY_LABEL_TO_CANONICAL[normalized] || normalized
}

function getLang() {
  const lng = i18n.language || 'en'
  return String(lng).toLowerCase().startsWith('it') ? 'it' : 'en'
}

/**
 * @returns {Array<{ key: string, src: string | null, alt: string }>}
 */
export function getProductLabelIcons(labels) {
  if (!labels) return []

  const values = Array.isArray(labels)
    ? labels
    : typeof labels === 'string'
      ? labels.split(',').map((entry) => entry.trim()).filter(Boolean)
      : []

  const seen = new Set()
  const lang = getLang()

  return values.reduce((acc, label) => {
    const normalized = normalizeLabel(label)
    const canonical = toCanonical(normalized)
    if (!canonical || seen.has(canonical)) return acc
    seen.add(canonical)
    const cfg = LABEL_CONFIG[canonical]
    if (!cfg) {
      acc.push({
        key: canonical,
        src: null,
        alt: canonical.replace(/_/g, ' '),
      })
      return acc
    }
    const alt = lang === 'it' ? cfg.altIt : cfg.altEn
    acc.push({
      key: canonical,
      src: cfg.src,
      alt,
    })
    return acc
  }, [])
}
