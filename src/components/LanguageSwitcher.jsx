import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'el', label: 'EL' },
  { code: 'it', label: 'IT' },
]

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [open])

  const setLanguage = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
    try {
      localStorage.setItem('lang', code)
    } catch {
      /* ignore */
    }
  }

  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0]

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors text-sm font-semibold text-slate-700"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Επιλογή γλώσσας"
      >
        <span>{current.label}</span>
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute top-full right-0 mt-1 py-1 min-w-[140px] rounded-lg border border-slate-200 bg-white shadow-lg z-50"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option">
              <button
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`w-full text-left px-3 py-2 text-sm font-medium transition-colors ${
                  i18n.language === lang.code
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {lang.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
