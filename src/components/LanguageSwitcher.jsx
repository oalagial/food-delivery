import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'it', label: 'IT' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const setLanguage = (code) => {
    i18n.changeLanguage(code)
    try {
      localStorage.setItem('lang', code)
    } catch {
      /* ignore */
    }
  }

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]
  const next = current.code === 'en' ? 'it' : 'en'
  const nextLabel = next.toUpperCase()

  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      className="inline-flex items-center justify-center rounded-xl border border-app-border bg-app-surface2 px-3 py-2 text-xs font-semibold tracking-wide text-app-text/80 transition-colors hover:bg-app-surface2/70 active:bg-brand-50"
      aria-label={`Switch language to ${nextLabel}`}
    >
      {current.label}
    </button>
  )
}
