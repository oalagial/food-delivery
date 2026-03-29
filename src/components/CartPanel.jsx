import { useTranslation } from 'react-i18next'
import { formatPrice } from '../utils/price'

function IconBag({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.25 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  )
}

function IconClose({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function CartLineItem({ it, lastAddedKey, updateQty, removeItem, t, offerSelectionSummary }) {
  const isNew = it.key === lastAddedKey
  const lineTotal = (it.price || 0) * (it.qty || 0)

  return (
    <div
      className={`group flex gap-4 py-4 first:pt-2 border-b border-slate-100 last:border-0 transition-colors ${
        isNew ? 'bg-amber-50/60 -mx-1 px-1 rounded-xl ring-1 ring-amber-200/60' : ''
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[15px] font-medium leading-snug text-slate-900">{it.name}</p>
          {it.isOffer ? (
            <span className="shrink-0 rounded-md border border-amber-200/80 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-900/80">
              {t('common.offer')}
            </span>
          ) : null}
        </div>
        {it.isOffer && offerSelectionSummary(it) ? (
          <p className="text-xs leading-relaxed text-slate-500">{offerSelectionSummary(it)}</p>
        ) : null}
        {it.extraNames && it.extraNames.length > 0 ? (
          <p className="text-xs text-slate-600">
            <span className="text-slate-400">{t('common.extras')}</span> {it.extraNames.join(', ')}
          </p>
        ) : null}
        {it.removedIngredientNames && it.removedIngredientNames.length > 0 ? (
          <p className="text-xs text-slate-500">
            <span className="text-slate-400">{t('cart.without')}</span> {it.removedIngredientNames.join(', ')}
          </p>
        ) : null}
        {it.options && Object.keys(it.options).length > 0 ? (
          <p className="text-xs text-slate-500">{Object.values(it.options).filter(Boolean).join(' · ')}</p>
        ) : null}
        <p className="pt-0.5 text-sm tabular-nums text-slate-600">
          {formatPrice(it.price)}
          <span className="text-slate-400"> × </span>
          {it.qty}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <p className="text-sm font-semibold tabular-nums text-slate-900">{formatPrice(lineTotal)}</p>
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
            aria-label={t('cart.decreaseQty')}
          >
            <span className="text-lg leading-none">−</span>
          </button>
          <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums text-slate-800">{it.qty}</span>
          <button
            type="button"
            onClick={() => updateQty(it.key, it.qty + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 active:bg-slate-200"
            aria-label={t('cart.increaseQty')}
          >
            <span className="text-lg leading-none">+</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => removeItem(it.key)}
          className="text-xs font-medium text-slate-400 transition hover:text-slate-700"
        >
          {t('common.remove')}
        </button>
      </div>
    </div>
  )
}

export default function CartPanel({ open, onClose, cart, updateQty, removeItem, total, lastAddedKey, onCheckout }) {
  const { t } = useTranslation()

  const offerSelectionSummary = (it) => {
    if (!it?.isOffer) return null
    const selections = Array.isArray(it.selectedGroups) ? it.selectedGroups : []
    if (selections.length === 0) return null

    const grouped = new Map()
    for (const sel of selections) {
      const groupLabel = sel?.groupName || (sel?.groupId !== undefined ? `${t('common.group')} ${sel.groupId}` : t('common.selected'))
      const itemLabel = sel?.selectedItemName || (sel?.selectedItemId !== undefined ? `${t('common.item')} ${sel.selectedItemId}` : t('common.item'))
      if (!grouped.has(groupLabel)) grouped.set(groupLabel, [])
      grouped.get(groupLabel).push(itemLabel)
    }

    return Array.from(grouped.entries())
      .map(([groupLabel, items]) => `${groupLabel}: ${items.join(', ')}`)
      .join(' · ')
  }

  const itemLabel = cart.length === 0 ? null : t('cart.itemSummary', { count: cart.length })

  const body =
    cart.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <IconBag className="h-7 w-7" />
        </div>
        <p className="max-w-[14rem] text-sm leading-relaxed text-slate-500">{t('cart.empty')}</p>
      </div>
    ) : (
      <div>
        {cart.map((it) => (
          <CartLineItem
            key={it.key}
            it={it}
            lastAddedKey={lastAddedKey}
            updateQty={updateQty}
            removeItem={removeItem}
            t={t}
            offerSelectionSummary={offerSelectionSummary}
          />
        ))}
      </div>
    )

  const footer = (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/80 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm font-medium text-slate-500">{t('common.total')}</span>
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatPrice(total)}</span>
      </div>
      <button
        type="button"
        disabled={cart.length === 0}
        onClick={() => {
          if (cart.length > 0 && onCheckout) onCheckout()
        }}
        className={`w-full rounded-xl py-3.5 text-[15px] font-semibold tracking-wide transition ${
          cart.length === 0
            ? 'cursor-not-allowed bg-slate-200 text-slate-400'
            : 'bg-slate-900 text-white shadow-md shadow-slate-900/15 hover:bg-slate-800 active:bg-slate-950'
        }`}
      >
        {t('cart.checkout')}
      </button>
    </div>
  )

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-slate-900/35 backdrop-blur-[2px] lg:bg-slate-900/20"
          onClick={onClose}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed z-40 flex max-h-[88vh] w-full max-w-md flex-col bg-white shadow-2xl shadow-slate-900/10 transition-transform duration-300 ease-out lg:max-h-none lg:max-w-[420px] ${
          open
            ? 'pointer-events-auto translate-y-0 lg:translate-x-0'
            : 'pointer-events-none translate-y-full lg:translate-y-0 lg:translate-x-full'
        } inset-x-0 bottom-0 rounded-t-[1.25rem] lg:inset-x-auto lg:bottom-auto lg:left-auto lg:right-0 lg:top-0 lg:h-full lg:rounded-none`}
        aria-hidden={!open}
      >
        <div className="flex shrink-0 justify-center pt-2 pb-0 lg:hidden" aria-hidden>
          <span className="h-1 w-10 rounded-full bg-slate-200" />
        </div>

        <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <IconBag className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">{t('cart.title')}</h2>
              {itemLabel ? <p className="truncate text-xs text-slate-500">{itemLabel}</p> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('cart.closeCart')}
          >
            <IconClose className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">{body}</div>

        <div className="shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-0">{footer}</div>
      </aside>
    </>
  )
}
