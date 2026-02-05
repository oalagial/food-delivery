import { formatPrice } from '../utils/price'

export default function CartPanel({ open, onClose, cart, updateQty, removeItem, total, lastAddedKey, onCheckout }) {
  const offerSelectionSummary = (it) => {
    if (!it?.isOffer) return null
    const selections = Array.isArray(it.selectedGroups) ? it.selectedGroups : []
    if (selections.length === 0) return null

    const grouped = new Map()
    for (const sel of selections) {
      const groupLabel = sel?.groupName || (sel?.groupId !== undefined ? `Group ${sel.groupId}` : 'Selected')
      const itemLabel = sel?.selectedItemName || (sel?.selectedItemId !== undefined ? `Item ${sel.selectedItemId}` : 'Item')
      if (!grouped.has(groupLabel)) grouped.set(groupLabel, [])
      grouped.get(groupLabel).push(itemLabel)
    }

    return Array.from(grouped.entries())
      .map(([groupLabel, items]) => `${groupLabel}: ${items.join(', ')}`)
      .join(' • ')
  }

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={onClose} />}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-40 transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-bold text-xl">Cart</div>
          <button onClick={onClose} className="text-3xl hover:opacity-70">×</button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="text-base text-slate-500">Your cart is empty</div>
          ) : (
            cart.map((it) => (
              <div key={it.key} className={`flex items-start justify-between gap-3 mb-4 pb-4 border-b last:border-0 transition-all ${it.key === lastAddedKey ? 'bg-orange-50 ring-1 ring-orange-200 rounded-md p-2 -m-2' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-base font-semibold truncate">{it.name}</div>
                    {it.isOffer && (
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">Offer</span>
                    )}
                  </div>
                  {it.isOffer && offerSelectionSummary(it) && (
                    <div className="text-xs text-slate-500 mb-1">
                      {offerSelectionSummary(it)}
                    </div>
                  )}
                  {(it.extraNames && it.extraNames.length > 0) && (
                    <div className="text-xs text-orange-600 mb-1">
                      Extras: {it.extraNames.join(', ')}
                    </div>
                  )}
                  {it.options && Object.keys(it.options).length > 0 && (
                    <div className="text-xs text-slate-500 mb-1">
                      {Object.values(it.options).filter(v => v).join(', ')}
                    </div>
                  )}
                  <div className="text-sm text-slate-600">{formatPrice(it.price)} × {it.qty}</div>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} 
                      className="w-8 h-8 rounded bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
                    >
                      −
                    </button>
                    <div className="w-6 text-center text-sm font-semibold">{it.qty}</div>
                    <button 
                      onClick={() => updateQty(it.key, it.qty + 1)} 
                      className="w-8 h-8 rounded bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(it.key)} 
                    className="text-xs text-red-500 active:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Total</div>
            <div className="text-xl font-bold">{formatPrice(total)}</div>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => { if (cart.length > 0 && onCheckout) onCheckout() }} 
            className={`w-full py-3 text-base font-semibold rounded-lg transition-all ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]'}`}
          >
            Checkout
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Sheet */}
      <div className={`lg:hidden fixed left-0 right-0 bottom-0 bg-white shadow-2xl z-40 transform transition-transform duration-300 rounded-t-2xl ${open ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '85vh' }}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <div className="text-lg font-bold">Cart</div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-2xl text-slate-600 active:bg-slate-100 rounded-full transition-colors"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {cart.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-8">Your cart is empty</div>
          ) : (
            cart.map((it) => (
              <div 
                key={it.key} 
                className={`flex items-start justify-between gap-3 mb-3 pb-3 border-b border-slate-200 last:border-0 transition-all ${it.key === lastAddedKey ? 'bg-orange-50 ring-1 ring-orange-200 rounded-md p-2 -m-2' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="text-sm font-semibold truncate">{it.name}</div>
                    {it.isOffer && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0">Offer</span>
                    )}
                  </div>
                  {it.isOffer && offerSelectionSummary(it) && (
                    <div className="text-xs text-slate-500 mb-0.5">
                      {offerSelectionSummary(it)}
                    </div>
                  )}
                  {(it.extraNames && it.extraNames.length > 0) && (
                    <div className="text-xs text-orange-600 mb-0.5">
                      Extras: {it.extraNames.join(', ')}
                    </div>
                  )}
                  {it.options && Object.keys(it.options).length > 0 && (
                    <div className="text-xs text-slate-500 mb-0.5">
                      {Object.values(it.options).filter(v => v).join(', ')}
                    </div>
                  )}
                  <div className="text-xs text-slate-600">{formatPrice(it.price)} × {it.qty}</div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} 
                      className="w-7 h-7 rounded bg-slate-100 text-slate-700 text-sm active:bg-slate-200 transition-colors"
                    >
                      −
                    </button>
                    <div className="w-5 text-center text-xs font-semibold">{it.qty}</div>
                    <button 
                      onClick={() => updateQty(it.key, it.qty + 1)} 
                      className="w-7 h-7 rounded bg-slate-100 text-slate-700 text-sm active:bg-slate-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeItem(it.key)} 
                    className="text-[10px] text-red-500 active:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-4 py-3 rounded-b-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-semibold">Total</div>
            <div className="text-lg font-bold">{formatPrice(total)}</div>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => { if (cart.length > 0 && onCheckout) onCheckout() }} 
            className={`w-full py-3 text-base font-semibold rounded-lg transition-all ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]'}`}
          >
            Checkout
          </button>
        </div>
      </div>
    </>
  )
}
