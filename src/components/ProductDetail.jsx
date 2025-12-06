import { useState, useEffect, useRef } from 'react'
import { parsePrice, formatPrice } from '../utils/price'

export default function ProductDetail({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const optionGroups = product.optionGroups || []
  const modalRef = useRef(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true))
    const prevActive = document.activeElement

    const focusFirst = () => {
      try {
        const el = modalRef.current
        if (!el) return
        const focusable = el.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length) focusable[0].focus()
        else el.focus()
      } catch {
        // ignore
      }
    }

    focusFirst()

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setMounted(false)
        setTimeout(() => onClose(), 180)
      }

      if (e.key === 'Tab') {
        const el = modalRef.current
        if (!el) return
        const focusable = Array.from(
          el.querySelectorAll(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      }
    }

    document.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKey)
      try {
        if (prevActive && prevActive.focus) prevActive.focus()
      } catch {
        // ignore
      }
    }
  }, [onClose])

  const isValid = optionGroups.every((g) => !g.required || Boolean(selectedOptions[g.id]))
  const base = parsePrice(product.price)
  const optionExtras = optionGroups.reduce((s, g) => {
    const choiceId = selectedOptions[g.id]
    if (!choiceId) return s
    const choice = g.choices.find((c) => c.id === choiceId)
    return s + (choice?.price || 0)
  }, 0)
  const total = (base + optionExtras) * qty

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 lg:p-8">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          setMounted(false)
          setTimeout(() => onClose(), 180)
        }}
      />
      <div
        className={`relative bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-auto max-h-[90vh] transform transition-all duration-200 ${mounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-${product.id}-title`}
      >
        <div className="p-4 lg:p-6">
          <div className="flex items-start gap-4">
            <button onClick={onClose} className="text-2xl p-1 border rounded-full">×</button>
            <div className="flex-1">
              <img src={product.image} alt={product.name} className="w-full h-64 lg:h-80 object-cover rounded-md mb-6" />
              <div className="flex items-center gap-2 mb-4">
                <span className="bg-sky-100 text-sky-800 px-3 py-2 rounded-full text-base font-medium">New</span>
                <span className="bg-amber-100 text-amber-800 px-3 py-2 rounded-full text-base font-medium">Offer</span>
              </div>
              <h2 id={`dialog-${product.id}-title`} className="text-2xl lg:text-3xl font-bold mb-3">{product.name}</h2>
              <div className="text-base lg:text-lg text-slate-700 mb-6 leading-relaxed">{product.desc}</div>

              <div className="flex items-center gap-4 my-6">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 text-lg font-semibold">−</button>
                <div className="text-2xl font-semibold w-8 text-center">{qty}</div>
                <button onClick={() => setQty((q) => q + 1)} className="w-10 h-10 rounded-full bg-sky-100 text-sky-800 text-lg font-semibold">+</button>
              </div>

              <div className="mb-6">
                <div className="font-semibold text-lg mb-3">Allergens:</div>
                <ul className="list-disc pl-5 text-base text-slate-700 space-y-1">
                  <li>Milk and dairy</li>
                  <li>Fish and derivatives (Mediterranean)</li>
                </ul>
              </div>

              {optionGroups.map((g) => (
                <div className="mb-6" key={g.id}>
                  <div className="font-semibold text-lg mb-3">
                    {g.title}
                    {g.required && <span className="text-red-500"> *</span>}
                  </div>
                  <div className="space-y-3 text-base">
                    {g.choices.map((choice) => (
                      <label className="block flex items-center cursor-pointer" key={choice.id}>
                        <input
                          type="radio"
                          name={`opt_${g.id}`}
                          className="w-5 h-5"
                          onChange={() => setSelectedOptions((p) => ({ ...p, [g.id]: choice.id }))}
                        />
                        <span className="ml-3">
                          {choice.label}
                          {choice.price ? ` (+${formatPrice(choice.price)})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                    {g.required && !selectedOptions[g.id] && (
                      <div className="text-base text-red-500 mt-3 font-medium">Please choose a {g.title.toLowerCase()} option.</div>
                    )}
                </div>
              ))}

              <div className="sticky bottom-0 left-0 right-0 py-6 bg-white border-t">
                <button
                  disabled={!isValid}
                  onClick={() => {
                    if (!isValid) return
                    const options = {}
                    optionGroups.forEach((g) => {
                      const choiceId = selectedOptions[g.id]
                      const choice = g.choices.find((c) => c.id === choiceId)
                      options[g.id] = choice ? choice.label : null
                    })

                    const item = {
                      id: product.id,
                      name: product.name,
                      price: base + optionExtras,
                      qty,
                      options,
                    }
                    onAdd(item)
                  }}
                  className={`w-full py-4 rounded-lg font-semibold text-lg lg:text-xl ${isValid ? 'bg-orange-500 text-white hover:bg-orange-600 transition-colors' : 'bg-orange-200 text-white/60 cursor-not-allowed'}`}>
                  Add to cart ( + {formatPrice(total)} )
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
