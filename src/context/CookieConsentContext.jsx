import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import { applyConsentToTracking } from '../tracking/consentRegistry'

const STORAGE_KEY = 'cunzati_cookie_consent_v1'
const CONSENT_VERSION = 1

/** @typedef {{ technical: true, analytics: boolean, marketing: boolean }} CookieCategories */

/**
 * @typedef {{
 *   version: number
 *   decision: 'all' | 'essential' | 'custom'
 *   categories: CookieCategories
 *   updatedAt: string
 * }} ConsentRecord
 */

function readStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (o?.version !== CONSENT_VERSION || !o?.categories || !o?.updatedAt) return null
    if (o.categories.technical !== true) return null
    return /** @type {ConsentRecord} */ (o)
  } catch {
    return null
  }
}

function writeStoredConsent(record) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    /* ignore */
  }
}

const CookieConsentContext = createContext(null)

export function CookieConsentProvider({ children }) {
  const [record, setRecord] = useState(() =>
    typeof window !== 'undefined' ? readStoredConsent() : null
  )
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [draft, setDraft] = useState(() => ({
    analytics: false,
    marketing: false,
  }))

  useEffect(() => {
    if (record) {
      applyConsentToTracking(record.categories)
    }
  }, [record])

  const hasAnswered = record != null
  const bannerVisible = !hasAnswered

  const persist = useCallback((partial) => {
    const categories = {
      technical: true,
      analytics: Boolean(partial.analytics),
      marketing: Boolean(partial.marketing),
    }
    const decision =
      categories.analytics && categories.marketing
        ? 'all'
        : !categories.analytics && !categories.marketing
          ? 'essential'
          : 'custom'
    const next = {
      version: CONSENT_VERSION,
      decision,
      categories,
      updatedAt: new Date().toISOString(),
    }
    writeStoredConsent(next)
    setRecord(next)
    applyConsentToTracking(categories)
    setPreferencesOpen(false)
  }, [])

  const acceptAll = useCallback(() => {
    persist({ analytics: true, marketing: true })
  }, [persist])

  const rejectNonEssential = useCallback(() => {
    persist({ analytics: false, marketing: false })
  }, [persist])

  const openPreferences = useCallback(() => {
    if (record) {
      setDraft({
        analytics: Boolean(record.categories.analytics),
        marketing: Boolean(record.categories.marketing),
      })
    } else {
      setDraft({ analytics: false, marketing: false })
    }
    setPreferencesOpen(true)
  }, [record])

  const closePreferences = useCallback(() => setPreferencesOpen(false), [])

  const saveCustomPreferences = useCallback(() => {
    persist({ analytics: draft.analytics, marketing: draft.marketing })
  }, [draft.analytics, draft.marketing, persist])

  const value = useMemo(
    () => ({
      record,
      hasAnswered,
      bannerVisible,
      preferencesOpen,
      draft,
      setDraft,
      acceptAll,
      rejectNonEssential,
      openPreferences,
      closePreferences,
      saveCustomPreferences,
    }),
    [
      record,
      hasAnswered,
      bannerVisible,
      preferencesOpen,
      draft,
      acceptAll,
      rejectNonEssential,
      openPreferences,
      closePreferences,
      saveCustomPreferences,
    ]
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider')
  }
  return ctx
}
