import { useTranslation } from 'react-i18next'
import { useCookieConsent } from '../context/CookieConsentContext'

export default function AppFooter() {
  const { t } = useTranslation()
  const { openPreferences } = useCookieConsent()

  return (
    <footer className="border-t border-slate-200/80 bg-white/95 py-2.5 text-center text-[11px] sm:text-xs text-slate-600 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] backdrop-blur">
      <nav className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 sm:gap-x-4" aria-label={t('legal.footerNavLabel')}>
        <a href="/privacy-policy" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-orange-600">
          {t('legal.privacyLink')}
        </a>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <a href="/cookie-policy" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-orange-600">
          {t('legal.cookiesLink')}
        </a>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <a href="/terms-and-conditions" className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-orange-600">
          {t('legal.termsLink')}
        </a>
        <span className="text-slate-300" aria-hidden>
          ·
        </span>
        <button
          type="button"
          onClick={openPreferences}
          className="font-medium text-orange-600 underline decoration-orange-200 underline-offset-2 hover:text-orange-700"
        >
          {t('legal.cookieSettings')}
        </button>
      </nav>
    </footer>
  )
}
