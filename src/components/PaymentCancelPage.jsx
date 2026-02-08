import { useTranslation } from 'react-i18next'

export default function PaymentCancelPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
          <span className="text-4xl">✕</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">{t('payment.cancelTitle')}</h1>
        <p className="text-slate-600 mb-6">
          {t('payment.cancelMessage')}
        </p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all"
        >
          ← {t('payment.backToHome')}
        </a>
      </div>
    </div>
  )
}
