import { formatPrice } from '../utils/price'

export default function CartPanel({ open, onClose, cart, updateQty, removeItem, total, lastAddedKey, onCheckout }) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}

      <aside className={`hidden lg:flex flex-col fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-40 transform transition-transform ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-bold text-xl lg:text-2xl">Cart</div>
          <button onClick={onClose} className="text-3xl lg:text-4xl">×</button>
        </div>
        <div className="p-4 flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="text-base lg:text-lg text-slate-500">Your cart is empty</div>
          ) : (
            cart.map((it) => (
              <div key={it.key} className={`flex items-center justify-between gap-4 mb-4 transition-all duration-300 ${it.key === lastAddedKey ? 'bg-orange-50 ring-1 ring-orange-200/60 rounded-md p-2' : ''}`}>
                <div className="flex-1">
                  <div className="text-lg lg:text-xl font-semibold">{it.name}</div>
                  <div className="text-base lg:text-lg text-slate-600">{formatPrice(it.price)} × {it.qty}</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} className="w-10 h-10 lg:w-12 lg:h-12 text-lg rounded bg-slate-100">−</button>
                    <div className="px-2 text-lg">{it.qty}</div>
                    <button onClick={() => updateQty(it.key, it.qty + 1)} className="w-10 h-10 lg:w-12 lg:h-12 text-lg rounded bg-slate-100">+</button>
                  </div>
                  <button onClick={() => removeItem(it.key)} className="text-base lg:text-lg text-red-500">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg lg:text-xl font-semibold">Total</div>
            <div className="text-xl lg:text-2xl font-bold">{formatPrice(total)}</div>
          </div>
          <button onClick={() => { if (onCheckout) onCheckout() }} className="w-full bg-orange-500 text-white py-4 text-lg lg:text-xl rounded">Checkout</button>
        </div>
      </aside>

      <div className={`lg:hidden fixed left-0 right-0 bottom-0 h-1/2 bg-white shadow-xl z-40 transform transition-transform ${open ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-xl font-bold">Cart</div>
          <button onClick={onClose} className="text-3xl">×</button>
        </div>
        <div className="p-4 overflow-auto h-[calc(50%-96px)]">
          {cart.length === 0 ? (
            <div className="text-base text-slate-500">Your cart is empty</div>
          ) : (
            cart.map((it) => (
              <div key={it.key} className={`flex items-center justify-between gap-4 mb-4 transition-all duration-300 ${it.key === lastAddedKey ? 'bg-orange-50 ring-1 ring-orange-200/60 rounded-md p-2' : ''}`}>
                <div className="flex-1">
                  <div className="text-lg font-semibold">{it.name}</div>
                  <div className="text-base text-slate-600">{formatPrice(it.price)} × {it.qty}</div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} className="w-10 h-10 text-lg rounded bg-slate-100">−</button>
                    <div className="px-2 text-lg">{it.qty}</div>
                    <button onClick={() => updateQty(it.key, it.qty + 1)} className="w-10 h-10 text-lg rounded bg-slate-100">+</button>
                  </div>
                  <button onClick={() => removeItem(it.key)} className="text-base text-red-500">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Total</div>
            <div className="text-xl font-bold">{formatPrice(total)}</div>
          </div>
          <button onClick={() => { if (onCheckout) onCheckout() }} className="w-full bg-orange-500 text-white py-4 text-lg rounded">Checkout</button>
        </div>
      </div>
    </>
  )
}
