import { useTranslation } from 'react-i18next'

export default function LegalDocumentPage({ html, titleKey }) {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/80 via-white to-slate-50 pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <a href="/" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
            ← {t('legal.backHome')}
          </a>
          <span className="text-sm font-medium text-slate-500">{t(titleKey)}</span>
        </div>
      </header>
      <main className="legal-doc mx-auto max-w-3xl px-4 py-8" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
