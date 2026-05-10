/**
 * Consent-aware tracking injection (GTM, GA4, Meta Pixel, etc.).
 * Do not add hardcoded third-party scripts in index.html — register loaders here instead.
 *
 * Example (later): registerAnalyticsLoader(() => { window.loadGtm?.() })
 */

const analyticsLoaders = []
const marketingLoaders = []

let analyticsLoaded = false
let marketingLoaded = false

export function registerAnalyticsLoader(fn) {
  if (typeof fn === 'function') analyticsLoaders.push(fn)
}

export function registerMarketingLoader(fn) {
  if (typeof fn === 'function') marketingLoaders.push(fn)
}

function runLoaders(loaders) {
  for (const fn of loaders) {
    try {
      fn()
    } catch (e) {
      console.error('[tracking]', e)
    }
  }
}

/**
 * Call when cookie consent changes. Only runs loaders once per category when consent is granted.
 */
export function applyConsentToTracking(categories) {
  const a = Boolean(categories?.analytics)
  const m = Boolean(categories?.marketing)

  if (a && !analyticsLoaded) {
    analyticsLoaded = true
    runLoaders(analyticsLoaders)
  }

  if (m && !marketingLoaded) {
    marketingLoaded = true
    runLoaders(marketingLoaders)
  }

  // Revoking consent does not remove already-injected scripts; extend here with
  // vendor-specific APIs (e.g. gtag consent update) when you integrate them.
}

/** Test / future use: reset flags in dev only */
export function __resetTrackingLoadersForTests() {
  analyticsLoaded = false
  marketingLoaded = false
}
