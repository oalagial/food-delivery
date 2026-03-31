import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

function offerAmountOnly(coupon) {
  const type = String(coupon.type || '').toUpperCase()
  const v = coupon.value
  if (v == null || v === '') return null
  const num = Number(v)
  if (Number.isNaN(num)) return String(v)
  if (type === 'PERCENTAGE') return `${num}%`
  const euros = num % 1 === 0 ? String(num) : num.toFixed(2)
  return `${euros} €`
}

const NOTCH = 'h-2.5 w-2.5'

function CouponTicketCard({ coupon }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef(null)
  const codeRaw = typeof coupon.code === 'string' ? coupon.code.trim() : ''
  const codeForField = codeRaw || t('store.couponCodeMissing')
  const amount = offerAmountOnly(coupon) ?? '—'
  const type = String(coupon.type || '').toUpperCase()
  const isPercent = type === 'PERCENTAGE'
  const codeLine = t('store.couponCodeField', { code: codeForField })
  const discountLine = t('store.couponDiscountField', { discount: amount })
  const ariaLabel = `${codeLine}. ${discountLine}`

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  const handleCopy = async (e) => {
    e.stopPropagation()
    if (!codeRaw) return
    try {
      await navigator.clipboard.writeText(codeRaw)
      setCopied(true)
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <article
      aria-label={ariaLabel}
      className="relative flex min-w-[min(72vw,11rem)] max-w-[min(72vw,11rem)] flex-shrink-0 snap-start"
    >
      <div
        className={`pointer-events-none absolute left-0 top-1/2 z-10 ${NOTCH} -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(254,215,170,0.95)]`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute right-0 top-1/2 z-10 ${NOTCH} translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[inset_0_0_0_1px_rgba(254,215,170,0.95)]`}
        aria-hidden
      />

      <div className="relative flex w-full items-center gap-2.5 overflow-hidden rounded-lg border border-dashed border-orange-200 bg-orange-50/95 py-2 pl-2.5 pr-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold leading-none text-white shadow-[0_0_0_1px_rgba(255,255,255,0.9)]"
          aria-hidden
        >
          {isPercent ? '%' : '€'}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5 py-1 pr-8">
          <p className="text-[11px] font-semibold leading-snug text-slate-800">
            <span className="text-slate-500">{t('store.couponCodeLabel')}: </span>
            <span className="font-mono font-bold tracking-[0.02em] text-slate-900">{codeForField}</span>
          </p>
          <p className="text-[11px] font-semibold leading-snug text-orange-800">
            <span className="text-orange-600/90">{t('store.couponDiscountLabel')}: </span>
            <span className="font-bold text-orange-700">{amount}</span>
          </p>
        </div>
        {codeRaw ? (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-orange-200/90 bg-white/90 text-orange-700 transition-colors hover:bg-white active:bg-orange-100"
            aria-label={copied ? t('store.couponCopied') : t('store.copyCouponCode')}
            title={copied ? t('store.couponCopied') : t('store.copyCouponCode')}
          >
            <span aria-hidden className="text-[12px] leading-none">
              {copied ? '✓' : '⧉'}
            </span>
          </button>
        ) : null}
      </div>
    </article>
  )
}

export default function GeneralCouponsStrip({ coupons }) {
  const { t } = useTranslation()
  if (!coupons || coupons.length === 0) return null

  return (
    <section className="border-b border-slate-100 px-3 py-2.5" aria-label={t('store.generalCouponsSection')}>
      <h2 className="sr-only">{t('store.generalCouponsSection')}</h2>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        {coupons.map((c) => (
          <CouponTicketCard key={c.code || c.id || `${c.name}-${c.endsAt}`} coupon={c} />
        ))}
      </div>
    </section>
  )
}
