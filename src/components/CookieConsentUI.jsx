import { useTranslation } from 'react-i18next'
import { useCookieConsent } from '../context/CookieConsentContext'
import AppFooter from './AppFooter'

/** Fixed stack: cookie banner (if needed) above persistent legal footer */
export function BottomLegalShell() {
  const { t } = useTranslation()
  const { bannerVisible, acceptAll, rejectNonEssential, openPreferences } = useCookieConsent()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex flex-col-reverse pointer-events-none">
      <div className="pointer-events-auto">
        <AppFooter />
      </div>
      {bannerVisible ? (
        <div
          className="pointer-events-auto border-t border-slate-200 bg-white p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] sm:p-5"
          role="dialog"
          aria-labelledby="cookie-banner-title"
          aria-describedby="cookie-banner-desc"
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <div>
              <h2 id="cookie-banner-title" className="text-base font-semibold text-slate-900">
                {t('cookies.bannerTitle')}
              </h2>
              <p id="cookie-banner-desc" className="mt-2 text-sm leading-relaxed text-slate-600">
                {t('cookies.bannerBody')}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={rejectNonEssential}
                className="order-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 sm:order-1"
              >
                {t('cookies.reject')}
              </button>
              <button
                type="button"
                onClick={openPreferences}
                className="order-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-800 transition hover:bg-orange-100 sm:order-2"
              >
                {t('cookies.customize')}
              </button>
              <button
                type="button"
                onClick={acceptAll}
                className="order-1 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 sm:order-3"
              >
                {t('cookies.acceptAll')}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              <a href="/cookie-policy" className="font-medium text-orange-600 underline underline-offset-2 hover:text-orange-700">
                {t('legal.cookiesLink')}
              </a>
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function CookiePreferencesModal() {
  const { t } = useTranslation()
  const {
    preferencesOpen,
    draft,
    setDraft,
    closePreferences,
    saveCustomPreferences,
    hasAnswered,
  } = useCookieConsent()

  if (!preferencesOpen) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
      onClick={closePreferences}
    >
      <div
        className="max-h-[min(90vh,32rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-prefs-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cookie-prefs-title" className="text-lg font-bold text-slate-900">
          {t('cookies.prefsTitle')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{t('cookies.prefsIntro')}</p>

        <ul className="mt-6 space-y-4">
          <li className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{t('cookies.catTechnical')}</div>
                <p className="mt-1 text-xs text-slate-600">{t('cookies.catTechnicalDesc')}</p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {t('cookies.alwaysOn')}
              </span>
            </div>
          </li>
          <li className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{t('cookies.catAnalytics')}</div>
                <p className="mt-1 text-xs text-slate-600">{t('cookies.catAnalyticsDesc')}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(e) => setDraft((d) => ({ ...d, analytics: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
              </label>
            </div>
          </li>
          <li className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{t('cookies.catMarketing')}</div>
                <p className="mt-1 text-xs text-slate-600">{t('cookies.catMarketingDesc')}</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(e) => setDraft((d) => ({ ...d, marketing: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
              </label>
            </div>
          </li>
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closePreferences}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={saveCustomPreferences}
            className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
          >
            {t('cookies.savePreferences')}
          </button>
        </div>

        {!hasAnswered ? (
          <p className="mt-4 text-center text-xs text-slate-500">
            <a href="/cookie-policy" className="text-orange-600 underline underline-offset-2">
              {t('legal.cookiesLink')}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  )
}
