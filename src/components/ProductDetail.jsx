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
              <img src={product.image} alt={product.name} className="w-full h-48 lg:h-64 object-cover rounded-md mb-4" />
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-sky-100 text-sky-800 px-2 py-1 rounded-full text-sm">New</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm">Offer</span>
              </div>
              <h2 id={`dialog-${product.id}-title`} className="text-xl lg:text-2xl font-bold mb-2">{product.name}</h2>
              <div className="text-sm lg:text-base text-slate-700 mb-4">{product.desc}</div>

              <div className="flex items-center gap-4 my-4">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-8 h-8 rounded-full bg-sky-100 text-sky-800">−</button>
                <div className="text-lg font-semibold">{qty}</div>
                <button onClick={() => setQty((q) => q + 1)} className="w-8 h-8 rounded-full bg-sky-100 text-sky-800">+</button>
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-2">Allergens:</div>
                <ul className="list-disc pl-5 text-sm text-slate-700">
                  <li>Milk and dairy</li>
                  <li>Fish and derivatives (Mediterranean)</li>
                </ul>
              </div>

              {optionGroups.map((g) => (
                <div className="mb-4" key={g.id}>
                  <div className="font-semibold mb-2">
                    {g.title}
                    {g.required && <span className="text-red-500"> *</span>}
                  </div>
                  <div className="space-y-2 text-sm">
                    {g.choices.map((choice) => (
                      <label className="block" key={choice.id}>
                        <input
                          type="radio"
                          name={`opt_${g.id}`}
                          onChange={() => setSelectedOptions((p) => ({ ...p, [g.id]: choice.id }))}
                        />
                        <span className="ml-2">
                          {choice.label}
                          {choice.price ? ` (+${formatPrice(choice.price)})` : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                    {g.required && !selectedOptions[g.id] && (
                      <div className="text-sm text-red-500 mt-2">Please choose a {g.title.toLowerCase()} option.</div>
                    )}
                </div>
              ))}

              <div className="sticky bottom-0 left-0 right-0 py-4">
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
                  className={`w-full py-3 rounded-lg font-semibold lg:text-lg ${isValid ? 'bg-orange-500 text-white' : 'bg-orange-200 text-white/60 cursor-not-allowed'}`}>
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
