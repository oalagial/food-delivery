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

  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={`px-2.5 py-1.5 text-sm font-semibold transition-colors ${
            i18n.language === lang.code
              ? 'bg-orange-500 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          aria-label={lang.code === 'en' ? 'English' : 'Italiano'}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
