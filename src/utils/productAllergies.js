import i18n from '../i18n'

/** Legacy English enums → backend canonical codes */
const LEGACY_ALLERGY_TO_CANONICAL = {
  GLUTEN: 'GLUTINE',
  DAIRY: 'LATTE',
  EGGS: 'UOVA',
  FISH: 'PESCE',
  SHELLFISH: 'CROSTACEI',
  TREE_NUTS: 'FRUTTA_A_GUSCIO',
  PEANUTS: 'ARACHIDI',
  SOY: 'SOIA',
  SESAME: 'SESAMO',
  SULPHITES: 'SOLFITI',
  LUPIN: 'LUPINO',
  MOLLUSCS: 'MOLLUSCHI',
  MUSTARD: 'SENAPE',
  CELERY: 'SEDANO',
}

const DISPLAY = {
  en: {
    GLUTINE: 'Gluten',
    LATTE: 'Milk',
    UOVA: 'Eggs',
    PESCE: 'Fish',
    CROSTACEI: 'Shellfish',
    FRUTTA_A_GUSCIO: 'Tree nuts',
    ARACHIDI: 'Peanuts',
    SOIA: 'Soy',
    SESAMO: 'Sesame',
    SOLFITI: 'Sulphites',
    LUPINO: 'Lupin',
    MOLLUSCHI: 'Molluscs',
    SENAPE: 'Mustard',
    SEDANO: 'Celery',
  },
  it: {
    GLUTINE: 'Glutine',
    LATTE: 'Latte',
    UOVA: 'Uova',
    PESCE: 'Pesce',
    CROSTACEI: 'Crostacei',
    FRUTTA_A_GUSCIO: 'Frutta a guscio',
    ARACHIDI: 'Arachidi',
    SOIA: 'Soia',
    SESAMO: 'Sesamo',
    SOLFITI: 'Solfiti',
    LUPINO: 'Lupino',
    MOLLUSCHI: 'Molluschi',
    SENAPE: 'Senape',
    SEDANO: 'Sedano',
  },
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
}

function toCanonical(normalized) {
  return LEGACY_ALLERGY_TO_CANONICAL[normalized] || normalized
}

function getLang() {
  const lng = i18n.language || 'en'
  return String(lng).toLowerCase().startsWith('it') ? 'it' : 'en'
}

function displayForCanonical(canonical) {
  const lang = getLang()
  const map = DISPLAY[lang]
  return map[canonical] || canonical.replace(/_/g, ' ').toLowerCase()
}

/**
 * Parse allergies (array, comma string, or single string) into display strings.
 * @param {string|string[]|null|undefined} allergies
 * @returns {string[]}
 */
export function getAllergyDisplayList(allergies) {
  if (allergies == null || allergies === '') return []

  const parts = Array.isArray(allergies)
    ? allergies
    : typeof allergies === 'string'
      ? allergies.split(',').map((a) => a.trim()).filter(Boolean)
      : [String(allergies)]

  const seen = new Set()
  const out = []

  for (const part of parts) {
    const canonical = toCanonical(normalizeCode(part))
    if (!canonical || seen.has(canonical)) continue
    seen.add(canonical)
    out.push(displayForCanonical(canonical))
  }

  return out
}
