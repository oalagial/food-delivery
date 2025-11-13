import { useState } from 'react'
import { formatPrice } from '../utils/price'

export default function CheckoutPage({ point, cart, total, onClose, updateQty, removeItem, onConfirm }) {
  const [promo, setPromo] = useState('')
  const [agree, setAgree] = useState(false)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 lg:p-8">
      <div className="bg-white max-w-3xl w-full rounded-md shadow-lg overflow-auto max-h-[90vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-lg font-bold">Your order</div>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="font-bold text-orange-500">{point?.name || 'Location'}</div>
            <button className="text-sm text-slate-500 mt-1">↔ Change location</button>
          </div>

          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="text-sm text-slate-500">Your cart is empty</div>
            ) : (
              cart.map((it) => (
                <div key={it.key} className="flex items-center justify-between gap-4 pb-3 border-b">
                  <div className="flex-1">
                    <div className="font-semibold">{it.name} <span className="text-sm text-slate-500">({formatPrice(it.price)})</span></div>
                    {it.options && Object.keys(it.options).length > 0 && (
                      <div className="text-sm text-slate-600">{Object.values(it.options).join(', ')}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} className="w-7 h-7 rounded-full bg-slate-100">−</button>
                    <div className="w-6 text-center">{it.qty}</div>
                    <button onClick={() => updateQty(it.key, it.qty + 1)} className="w-7 h-7 rounded-full bg-slate-100">+</button>
                    <div className="ml-4 font-semibold">{formatPrice(it.total)}</div>
                    <button onClick={() => removeItem(it.key)} className="ml-4 text-red-500">🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="mb-4 text-sm">Delivery costs: <span className="float-right">€ 0.00</span></div>

            <div className="mb-4">
              <div className="font-semibold mb-2">Do you have a promo code?</div>
              <div className="flex gap-2">
                <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Promo code" className="flex-1 border px-3 py-2 rounded" />
                <button className="bg-orange-500 text-white px-4 rounded">Verify</button>
              </div>
            </div>

            <div className="bg-sky-100 p-3 rounded mb-4 flex items-center justify-between">
              <div className="font-semibold">Total:</div>
              <div className="font-bold text-lg">{formatPrice(total)}</div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <div>Check this box to confirm that the selected delivery location is <span className="font-semibold">{point?.name || ''}</span></div>
            </label>

            <div className="mt-4">
              <button disabled={!agree} onClick={() => { if (agree) onConfirm && onConfirm() }} className={`w-full py-3 rounded ${agree ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-300 cursor-not-allowed'}`}>Continue</button>
            </div>

            <p className="mt-3 text-xs text-slate-600">You will receive a call from the rider immediately before delivery, to meet us at the entrance of the location.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
