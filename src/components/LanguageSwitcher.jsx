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
        className={
          `flex items-center gap-1 px-2 py-1.5 rounded-full border-2 border-orange-500 bg-orange-500 text-white shadow-md transition-all text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-300 hover:bg-orange-600 hover:border-orange-600 active:scale-95 ${open ? 'ring-2 ring-orange-300' : ''}`
        }
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select language"
        style={{ minWidth: 0 }}
      >
        <span className="tracking-widest drop-shadow-sm text-xs">{current.label}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
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
          className="absolute top-full right-0 mt-1 min-w-[70px] rounded-xl border-2  bg-white shadow-xl z-50 animate-fade-in"
        >
          {LANGUAGES.map((lang) => (
            <li key={lang.code} role="option">
              <button
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`w-full text-left px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                  i18n.language === lang.code
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
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
