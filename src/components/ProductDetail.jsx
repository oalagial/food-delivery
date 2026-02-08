import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { parsePrice, formatPrice } from '../utils/price'

export default function ProductDetail({ product, isLocationInactive = false, onClose, onAdd }) {
  const { t } = useTranslation()
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [selectedExtras, setSelectedExtras] = useState({}) // { extraId: 0 or 1 }
  const [extrasModalOpen, setExtrasModalOpen] = useState(false)
  const [draftExtras, setDraftExtras] = useState({}) // draft όταν ανοιχτό το modal
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
  const stockQty = product.stockQuantity != null ? Number(product.stockQuantity) : null
  const isOutOfStock = stockQty !== null && stockQty === 0
  const maxQty = stockQty != null && stockQty > 0 ? stockQty : null

  useEffect(() => {
    if (maxQty != null && qty > maxQty) setQty(maxQty)
  }, [maxQty])

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
  
  const openExtrasModal = () => {
    setDraftExtras({ ...selectedExtras })
    setExtrasModalOpen(true)
  }

  const applyExtrasModal = () => {
    setSelectedExtras({ ...draftExtras })
    setExtrasModalOpen(false)
  }

  const closeExtrasModal = () => {
    setExtrasModalOpen(false)
  }

  const toggleDraftExtra = (extraId) => {
    setDraftExtras(prev => {
      const next = prev[extraId] ? 0 : 1
      if (next === 0) {
        const { [extraId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [extraId]: 1 }
    })
  }

  const handleClose = () => {
    setMounted(false)
    setTimeout(() => onClose(), 180)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full h-full max-h-full flex flex-col bg-white overflow-hidden transform transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-${product.id}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo - full width, X πάνω αριστερά */}
        <div className="relative flex-shrink-0 w-full h-[40vh] min-h-[200px] max-h-[320px] bg-slate-200">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center text-xl font-light hover:bg-black/80 active:bg-black/80 transition-colors"
            aria-label={t('common.close')}
          >
            ×
          </button>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {product.isNew && (
              <span className="bg-white/90 text-slate-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                {t('common.new')}
              </span>
            )}
            {product.hasDiscount && (
              <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                {t('common.offer')}
              </span>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div className="p-4">
            
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

            {isOutOfStock && (
              <p className="text-sm font-semibold text-amber-600 mb-4">{t('product.outOfStock')}</p>
            )}
            {!isOutOfStock && maxQty != null && qty >= maxQty && (
              <p className="text-sm text-slate-600 mb-4">
                {t('product.maxAvailable', { n: maxQty })}
              </p>
            )}

            {/* Ingredients */}
            {(product.ingredients || product._original?.ingredients) && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-2 text-slate-900">{t('product.ingredients')}</div>
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
                <div className="font-semibold text-sm mb-2 text-slate-900">{t('product.allergens')}</div>
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

            {/* Extras - κουμπί που ανοίγει modal */}
            {extrasGroup && extrasGroup.choices.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-1 text-slate-900">{extrasGroup.title || 'Extras'}</div>
                <button
                  type="button"
                  onClick={openExtrasModal}
                  className="w-full py-2.5 px-3 rounded-full text-sm font-medium border border-slate-300 bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors text-left"
                >
                  {Object.keys(selectedExtras).filter((id) => selectedExtras[id]).length > 0
                    ? extrasGroup.choices
                        .filter((c) => selectedExtras[parseInt(c.id.replace('extra_', ''))])
                        .map((c) => c.label)
                        .join(', ')
                    : 'Optional choice'}
                </button>
                {Object.keys(selectedExtras).filter((id) => selectedExtras[id]).length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">
                    {extrasGroup.choices
                      .filter((c) => selectedExtras[parseInt(c.id.replace('extra_', ''))])
                      .map((c) => c.label)
                      .join(', ')}
                    {extrasTotal > 0 && (
                      <span className="font-medium text-slate-700"> +{formatPrice(extrasTotal)}</span>
                    )}
                  </div>
                )}
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
                    {t('product.pleaseChooseOption', { option: g.title.toLowerCase() })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer - αριστερά count, δεξιά Add */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          {isLocationInactive && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800 font-semibold text-center">
                ⚠️ Location Temporarily Closed - Cannot add items to cart
              </p>
            </div>
          )}
          <div className="flex items-center gap-4">
            {/* Quantity - αριστερά */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={isOutOfStock}
                className={`w-10 h-10 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center ${isOutOfStock ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-700 active:bg-slate-300'}`}
              >
                −
              </button>
              <span className="text-lg font-bold w-8 text-center tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => (maxQty != null ? Math.min(maxQty, q + 1) : q + 1))}
                disabled={isOutOfStock || (maxQty != null && qty >= maxQty)}
                className={`w-10 h-10 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center ${isOutOfStock || (maxQty != null && qty >= maxQty) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-700 active:bg-slate-300'}`}
              >
                +
              </button>
            </div>
            {/* Add button - δεξιά */}
            <button
              disabled={!isValid || isLocationInactive || isOutOfStock}
              onClick={() => {
                if (!isValid || isLocationInactive || isOutOfStock) return
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

                const effectiveQty = maxQty != null ? Math.min(qty, maxQty) : qty
                const item = {
                  id: product.id,
                  name: product.name,
                  price: base + otherOptionsTotal + extrasTotal,
                  qty: effectiveQty,
                  options,
                  extraIds,
                  extraNames,
                }
                onAdd(item)
              }}
              className={`flex-1 py-3 rounded-lg font-semibold text-base transition-all ${isValid && !isLocationInactive && !isOutOfStock ? 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {t('product.add', { price: formatPrice(total) })}
            </button>
          </div>
        </div>

        {/* Extras modal - bottom sheet με checkboxes */}
        {extrasModalOpen && (
          <>
            <div
              className="fixed inset-0 z-[60] bg-black/50"
              aria-hidden="true"
              onClick={closeExtrasModal}
            />
            <div
              className="fixed left-0 right-0 bottom-0 z-[70] bg-white rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="extras-modal-title"
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h2 id="extras-modal-title" className="text-base font-semibold text-slate-700">
                {extrasGroup?.title || t('common.extras')}
              </h2>
                <button
                  type="button"
                  onClick={closeExtrasModal}
                  className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label={t('common.close')}
                >
                  ×
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 py-2">
                {extrasGroup?.choices.map((choice) => {
                  const extraId = parseInt(choice.id.replace('extra_', ''))
                  const checked = !!draftExtras[extraId]
                  return (
                    <label
                      key={choice.id}
                      className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDraftExtra(extraId)}
                        className="w-5 h-5 rounded border-slate-300 text-orange-500 focus:ring-orange-400"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-slate-900">{choice.label}</span>
                        {choice.price != null && choice.price > 0 && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {formatPrice(choice.price)}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex-shrink-0 flex gap-3 px-4 py-3 border-t border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={closeExtrasModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm bg-slate-200 text-slate-700 active:bg-slate-300 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={applyExtrasModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm bg-orange-500 text-white active:bg-orange-600 transition-colors"
                >
                  {t('common.apply')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
