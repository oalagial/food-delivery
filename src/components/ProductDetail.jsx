import { useState, useEffect, useRef } from 'react'
import { parsePrice, formatPrice } from '../utils/price'

export default function ProductDetail({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [selectedExtras, setSelectedExtras] = useState({}) // { extraId: 0 or 1 }
  const optionGroups = product.optionGroups || []
  const extrasGroup = optionGroups.find(g => g.id === 'extras')
  const otherOptionGroups = optionGroups.filter(g => g.id !== 'extras')
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

  const isValid = otherOptionGroups.every((g) => !g.required || Boolean(selectedOptions[g.id]))
  // Use priceAfterDiscount if available, otherwise use original price
  const base = product.priceAfterDiscountNum !== null && product.priceAfterDiscountNum !== undefined 
    ? product.priceAfterDiscountNum 
    : parsePrice(product.price)
  
  const extrasTotal = Object.entries(selectedExtras).reduce((sum, [extraId, count]) => {
    if (count > 0 && extrasGroup) {
      const extraIdNum = parseInt(extraId)
      const choice = extrasGroup.choices.find(c => {
        const id = parseInt(c.id.replace('extra_', ''))
        return id === extraIdNum
      })
      return sum + (choice?.price || 0) * count
    }
    return sum
  }, 0)
  
  const otherOptionsTotal = otherOptionGroups.reduce((s, g) => {
    const choiceId = selectedOptions[g.id]
    if (!choiceId) return s
    const choice = g.choices.find((c) => c.id === choiceId)
    return s + (choice?.price || 0)
  }, 0)
  
  const total = (base + otherOptionsTotal + extrasTotal) * qty
  
  const handleExtraChange = (extraId, delta) => {
    setSelectedExtras(prev => {
      const current = prev[extraId] || 0
      const newValue = Math.max(0, Math.min(1, current + delta))
      if (newValue === 0) {
        const { [extraId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [extraId]: newValue }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          setMounted(false)
          setTimeout(() => onClose(), 180)
        }}
      />
      <div
        className={`relative bg-white w-full max-w-lg max-h-[80vh] sm:max-h-[90vh] h-auto rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full sm:translate-y-4'}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-${product.id}-title`}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20 relative">
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-2xl text-slate-600 active:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            ×
          </button>
          <div className="flex items-center gap-2">
            {product.isNew && (
              <span className="bg-sky-100 text-sky-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                New
              </span>
            )}
            {product.hasDiscount && (
              <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                Offer
              </span>
            )}
          </div>
          <div className="w-8"></div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div className="p-4">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-48 sm:h-64 object-cover rounded-lg mb-4" 
            />
            
            <h2 id={`dialog-${product.id}-title`} className="text-xl font-bold mb-2 text-slate-900">
              {product.name}
            </h2>
            
            {/* Price Display */}
            <div className="mb-3">
              {product.priceAfterDiscount ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold line-through text-slate-400">
                    {product.originalPrice}
                  </span>
                  <span className="text-xl font-bold text-orange-600">
                    {product.priceAfterDiscount}
                  </span>
                </div>
              ) : (
                <div className="text-xl font-bold text-orange-600">
                  {product.price}
                </div>
              )}
            </div>
            
            {product.desc && (
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {product.desc}
              </p>
            )}

            {/* Quantity Selector */}
            <div className="flex items-center justify-center gap-4 my-4 py-3 border-y border-slate-200">
              <button 
                onClick={() => setQty((q) => Math.max(1, q - 1))} 
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 text-lg font-semibold active:bg-slate-200 transition-colors"
              >
                −
              </button>
              <div className="text-xl font-bold w-12 text-center">{qty}</div>
              <button 
                onClick={() => setQty((q) => q + 1)} 
                className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 text-lg font-semibold active:bg-slate-200 transition-colors"
              >
                +
              </button>
            </div>

            {/* Ingredients */}
            {(product.ingredients || product._original?.ingredients) && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2 text-slate-900">Ingredients:</div>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                  {(() => {
                    const ingredients = product.ingredients || product._original?.ingredients
                    if (Array.isArray(ingredients)) {
                      return ingredients.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))
                    } else if (typeof ingredients === 'string') {
                      // If it's a comma-separated string, split it
                      const ingredientList = ingredients.split(',').map(i => i.trim()).filter(i => i)
                      return ingredientList.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))
                    } else {
                      return <li>{ingredients}</li>
                    }
                  })()}
                </ul>
              </div>
            )}

            {/* Allergens */}
            {(product.allergies || product._original?.allergies) && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2 text-slate-900">Allergens:</div>
                <ul className="list-disc pl-5 text-xs text-slate-600 space-y-0.5">
                  {(() => {
                    const allergies = product.allergies || product._original?.allergies
                    if (Array.isArray(allergies)) {
                      return allergies.map((allergy, index) => (
                        <li key={index}>{allergy}</li>
                      ))
                    } else if (typeof allergies === 'string') {
                      // If it's a comma-separated string, split it
                      const allergyList = allergies.split(',').map(a => a.trim()).filter(a => a)
                      return allergyList.map((allergy, index) => (
                        <li key={index}>{allergy}</li>
                      ))
                    } else {
                      return <li>{allergies}</li>
                    }
                  })()}
                </ul>
              </div>
            )}

            {/* Extras */}
            {extrasGroup && extrasGroup.choices.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2 text-slate-900">Extras</div>
                <div className="space-y-2">
                  {extrasGroup.choices.map((choice) => {
                    const extraId = parseInt(choice.id.replace('extra_', ''))
                    const count = selectedExtras[extraId] || 0
                    return (
                      <div key={choice.id} className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm text-slate-900">{choice.label}</span>
                          {choice.price > 0 && (
                            <span className="ml-2 text-xs text-slate-600">+{formatPrice(choice.price)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExtraChange(extraId, -1)}
                            disabled={count === 0}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                              count === 0
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-orange-100 text-orange-600 active:bg-orange-200'
                            }`}
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{count}</span>
                          <button
                            onClick={() => handleExtraChange(extraId, 1)}
                            disabled={count >= 1}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                              count >= 1
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-orange-100 text-orange-600 active:bg-orange-200'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Other option groups */}
            {otherOptionGroups.map((g) => (
              <div className="mb-4" key={g.id}>
                <div className="font-semibold text-sm mb-2 text-slate-900">
                  {g.title}
                  {g.required && <span className="text-red-500 ml-1">*</span>}
                </div>
                <div className="space-y-2">
                  {g.choices.map((choice) => (
                    <label 
                      className="flex items-center p-2.5 border border-slate-200 rounded-lg cursor-pointer active:bg-slate-50 transition-colors" 
                      key={choice.id}
                    >
                      <input
                        type="radio"
                        name={`opt_${g.id}`}
                        className="w-4 h-4 flex-shrink-0"
                        checked={selectedOptions[g.id] === choice.id}
                        onChange={() => setSelectedOptions((p) => ({ ...p, [g.id]: choice.id }))}
                      />
                      <span className="ml-3 text-sm text-slate-900">
                        {choice.label}
                        {choice.price ? ` (+${formatPrice(choice.price)})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
                {g.required && !selectedOptions[g.id] && (
                  <div className="text-xs text-red-500 mt-2 font-medium">
                    Please choose a {g.title.toLowerCase()} option.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Button - Fixed */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          <button
            disabled={!isValid}
            onClick={() => {
              if (!isValid) return
              const options = {}
              const extraIds = []
              
              otherOptionGroups.forEach((g) => {
                const choiceId = selectedOptions[g.id]
                const choice = g.choices.find((c) => c.id === choiceId)
                if (choice) {
                  options[g.id] = choice.label
                }
              })
              
              const extraNames = []
              Object.entries(selectedExtras).forEach(([extraId, count]) => {
                if (count > 0) {
                  const extraIdNum = parseInt(extraId)
                  extraIds.push(extraIdNum)
                  if (extrasGroup) {
                    const choice = extrasGroup.choices.find(c => {
                      const id = parseInt(c.id.replace('extra_', ''))
                      return id === extraIdNum
                    })
                    if (choice) {
                      extraNames.push(choice.label)
                    }
                  }
                }
              })

              const item = {
                id: product.id,
                name: product.name,
                price: base + otherOptionsTotal + extrasTotal,
                qty,
                options,
                extraIds,
                extraNames,
              }
              onAdd(item)
            }}
            className={`w-full py-3.5 rounded-lg font-semibold text-base transition-all ${
              isValid 
                ? 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Add to cart (+ {formatPrice(total)})
          </button>
        </div>
      </div>
    </div>
  )
}
