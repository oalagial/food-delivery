import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { parsePrice, formatPrice } from '../utils/price'
import { getProductLabelIcons } from '../utils/productLabels'
import { getAllergyDisplayList } from '../utils/productAllergies'

export default function ProductDetail({ product, removeProductIngredients = false, isLocationInactive = false, onClose, onAdd }) {
  const { t } = useTranslation()
  const labelIcons = getProductLabelIcons(product.labels || product._original?.labels)
  const allergyLines = getAllergyDisplayList(product.allergies || product._original?.allergies)
  const [qty, setQty] = useState(1)
  const [descExpanded, setDescExpanded] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState({})
  const [selectedExtras, setSelectedExtras] = useState({}) // { extraId: 0 or 1 }
  const [removedIngredientNames, setRemovedIngredientNames] = useState([]) // names to remove from this product
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

  const ingredientsList = useMemo(() => {
    const raw = product.ingredients || product._original?.ingredients
    if (!raw) return []
    if (Array.isArray(raw)) return raw.map((i) => (i != null ? String(i).trim() : '')).filter(Boolean)
    if (typeof raw === 'string') return raw.split(',').map((i) => i.trim()).filter(Boolean)
    return []
  }, [product.ingredients, product._original?.ingredients])

  const descText = String(product?.desc || '').trim()
  const shouldShowMore = descText.length > 20

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-surface">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />
      <div
        className={`relative w-full h-full max-h-full flex flex-col bg-app-surface overflow-hidden transform transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`dialog-${product.id}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="relative flex-shrink-0 w-full h-[44vh] min-h-[240px] max-h-[380px] bg-app-surface2">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleClose}
            className="pb-1 absolute top-4 left-4 w-8 h-8 font-semibold rounded-full bg-black/60 text-white flex items-center justify-center text-xl font-light hover:bg-black/80 active:bg-black/80 transition-colors"
            aria-label={t('common.close')}
          >
            ×
          </button>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {product.isNew && (
              <span className="bg-app-surface/90 text-app-text px-2.5 py-1 rounded-full text-xs font-semibold">
                {t('common.new')}
              </span>
            )}
            {product.hasDiscount && (
              <span className="bg-brand-100 text-brand-900 px-2.5 py-1 rounded-full text-xs font-semibold">
                {t('common.offer')}
              </span>
            )}
          </div>
        </div>

        {/* Sheet */}
        <div className="-mt-6 flex flex-1 flex-col min-h-0">
          <div className="relative flex flex-1 flex-col min-h-0 overflow-hidden rounded-t-[28px] bg-app-surface shadow-[0_-18px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="flex-shrink-0 flex justify-center pt-3" aria-hidden>
              <div className="h-1 w-12 rounded-full bg-app-border" />
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-4 pt-3 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 id={`dialog-${product.id}-title`} className="text-[17px] font-semibold leading-snug tracking-tight text-app-text">
                    {product.name}
                  </h2>
                  {product._original?.category ? (
                    <p className="mt-0.5 text-xs text-app-muted">{String(product._original.category)}</p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  {product.priceAfterDiscount ? (
                    <div className="flex flex-col items-end leading-none">
                      <span className="text-xs font-semibold line-through text-app-muted/70">{product.originalPrice}</span>
                      <span className="mt-1 text-[17px] font-semibold text-brand-600">{product.priceAfterDiscount}</span>
                    </div>
                  ) : (
                    <div className="text-[17px] font-semibold text-brand-600">{product.price}</div>
                  )}
                </div>
              </div>

              {labelIcons.length > 0 ? (
                <div className="mt-3 rounded-2xl bg-app-surface2 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2" aria-label="Product labels">
                    {labelIcons.slice(0, 6).map((icon) =>
                      icon.src ? (
                        <span key={icon.key} className="inline-flex items-center gap-2 rounded-full bg-app-surface px-3 py-2 text-xs font-semibold text-app-text/80 shadow-sm ring-1 ring-app-border">
                          <img src={icon.src} alt={icon.alt} className="h-5 w-5" loading="lazy" />
                          <span className="truncate max-w-[10rem]">{icon.alt}</span>
                        </span>
                      ) : (
                        <span
                          key={icon.key}
                          className="inline-flex items-center rounded-full bg-app-surface px-3 py-2 text-xs font-semibold text-app-text/80 shadow-sm ring-1 ring-app-border"
                          title={icon.alt}
                        >
                          {icon.alt}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {/* Description */}
              {product.desc ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-app-text/90">Description</div>
                  <p
                    className="mt-2 text-sm leading-relaxed text-app-muted"
                    style={
                      descExpanded
                        ? undefined
                        : {
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }
                    }
                  >
                    {descText}
                  </p>
                  {shouldShowMore ? (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="mt-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {descExpanded ? 'Show less' : 'Show more'}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {/* Ingredients */}
              {ingredientsList.length > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-app-text/90">
                    <svg className="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21s10 0 10-10S12 3 12 3 3 8 3 14s4 7 4 7z" />
                    </svg>
                    <span>{t('product.ingredients')}</span>
                  </div>
                  {removeProductIngredients ? (
                    <>
                      <p className="mt-2 text-xs text-app-muted">{t('product.removeIngredientsHint')}</p>
                      <ul className="mt-2 space-y-1.5">
                        {ingredientsList.map((ingredient, index) => {
                          const isRemoved = removedIngredientNames.includes(ingredient)
                          const isIncluded = !isRemoved
                          return (
                            <li key={index} className="flex items-center gap-2">
                              <label className="flex items-center gap-2 cursor-pointer flex-1 py-1">
                                <input
                                  type="checkbox"
                                  checked={isIncluded}
                                  onChange={() => {
                                    setRemovedIngredientNames((prev) =>
                                      isRemoved ? prev.filter((n) => n !== ingredient) : [...prev, ingredient]
                                    )
                                  }}
                                  className="w-4 h-4 rounded border-app-border text-brand-600 focus:ring-brand-400"
                                />
                                <span className={`text-sm ${isRemoved ? 'text-app-muted/70 line-through' : 'text-app-text/80'}`}>
                                  {ingredient}
                                </span>
                              </label>
                            </li>
                          )
                        })}
                      </ul>
                    </>
                  ) : (
                    <ul className="mt-2 list-disc pl-5 text-sm text-app-text/80 space-y-0.5">
                      {ingredientsList.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              {/* Allergens */}
              {allergyLines.length > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-app-text/90">
                    <svg className="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86l-7.4 12.8A1.5 1.5 0 004.19 19h15.62a1.5 1.5 0 001.3-2.24l-7.4-12.9a1.5 1.5 0 00-2.62 0z" />
                    </svg>
                    <span>{t('product.allergens')}</span>
                  </div>
                  <ul className="mt-2 list-disc pl-5 text-xs text-app-muted space-y-0.5">
                    {allergyLines.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

            {/* Extras - κουμπί που ανοίγει modal */}
            {extrasGroup && extrasGroup.choices.length > 0 && (
              <div className="mb-4">
                <div className="font-semibold text-sm mb-1 text-app-text">{extrasGroup.title || 'Extras'}</div>
                <button
                  type="button"
                  onClick={openExtrasModal}
                  className="w-full py-2.5 px-3 rounded-full text-sm font-medium border border-app-border bg-app-surface2 text-app-text/80 active:bg-brand-50 transition-colors text-left"
                >
                  {Object.keys(selectedExtras).filter((id) => selectedExtras[id]).length > 0
                    ? extrasGroup.choices
                        .filter((c) => selectedExtras[parseInt(c.id.replace('extra_', ''))])
                        .map((c) => c.label)
                        .join(', ')
                    : 'Optional choice'}
                </button>
                {Object.keys(selectedExtras).filter((id) => selectedExtras[id]).length > 0 && (
                  <div className="mt-2 text-xs text-app-muted">
                    {extrasGroup.choices
                      .filter((c) => selectedExtras[parseInt(c.id.replace('extra_', ''))])
                      .map((c) => c.label)
                      .join(', ')}
                    {extrasTotal > 0 && (
                      <span className="font-medium text-app-text/80"> +{formatPrice(extrasTotal)}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Other option groups */}
            {otherOptionGroups.map((g) => (
              <div className="mb-4" key={g.id}>
                <div className="font-semibold text-sm mb-2 text-app-text">
                  {g.title}
                  {g.required && <span className="text-red-500 ml-1">*</span>}
                </div>
                <div className="space-y-2">
                  {g.choices.map((choice) => (
                    <label 
                      className="flex items-center p-2.5 border border-app-border rounded-lg cursor-pointer active:bg-brand-50 transition-colors" 
                      key={choice.id}
                    >
                      <input
                        type="radio"
                        name={`opt_${g.id}`}
                        className="w-4 h-4 flex-shrink-0"
                        checked={selectedOptions[g.id] === choice.id}
                        onChange={() => setSelectedOptions((p) => ({ ...p, [g.id]: choice.id }))}
                      />
                      <span className="ml-3 text-sm text-app-text">
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

            {/* Footer - qty + Add (fixed at bottom of sheet) */}
            <div className="flex-shrink-0 border-t border-app-border bg-app-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
              {isLocationInactive && (
                <div className="mb-3 p-3 bg-brand-50 border border-brand-200 rounded-lg">
                  <p className="text-sm text-brand-900 font-semibold text-center">
                    Location temporarily closed
                  </p>
                </div>
              )}
              <div className="flex items-center gap-4">
                {/* Quantity */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={isOutOfStock}
                    className={`w-10 h-10 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center ${isOutOfStock ? 'bg-app-surface2 text-app-muted cursor-not-allowed' : 'bg-app-surface2 text-app-text/80 active:bg-brand-50'}`}
                  >
                    −
                  </button>
                  <span className="text-lg font-bold w-8 text-center tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => (maxQty != null ? Math.min(maxQty, q + 1) : q + 1))}
                    disabled={isOutOfStock || (maxQty != null && qty >= maxQty)}
                    className={`w-10 h-10 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center ${isOutOfStock || (maxQty != null && qty >= maxQty) ? 'bg-app-surface2 text-app-muted cursor-not-allowed' : 'bg-app-surface2 text-app-text/80 active:bg-brand-50'}`}
                  >
                    +
                  </button>
                </div>
                {/* Add button */}
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
                    const productIngredients = (product.ingredients || product._original?.ingredients)
                      ? (Array.isArray(product.ingredients || product._original?.ingredients)
                          ? (product.ingredients || product._original?.ingredients).map((i) => String(i).trim()).filter(Boolean)
                          : String(product.ingredients || product._original?.ingredients).split(',').map((i) => i.trim()).filter(Boolean))
                      : []
                    const validRemoved = removeProductIngredients
                      ? (removedIngredientNames || []).filter((name) =>
                          productIngredients.some((p) => p.toLowerCase() === name.toLowerCase())
                        )
                      : []
                    const item = {
                      id: product.id,
                      name: product.name,
                      price: base + otherOptionsTotal + extrasTotal,
                      qty: effectiveQty,
                      options,
                      extraIds,
                      extraNames,
                      removedIngredientNames: validRemoved.length > 0 ? validRemoved : undefined,
                    }
                    onAdd(item)
                  }}
                  className={`flex-1 py-3 rounded-lg font-semibold text-base transition-all ${isValid && !isLocationInactive && !isOutOfStock ? 'bg-brand-500 text-white active:bg-brand-600 active:scale-[0.98]' : 'bg-app-surface2 text-app-muted cursor-not-allowed'}`}
                >
                  {t('product.add', { price: formatPrice(total) })}
                </button>
              </div>
            </div>
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
              className="fixed left-0 right-0 bottom-0 z-[70] bg-app-surface rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="extras-modal-title"
            >
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-app-border">
              <h2 id="extras-modal-title" className="text-base font-semibold text-app-text/80">
                {extrasGroup?.title || t('common.extras')}
              </h2>
                <button
                  type="button"
                  onClick={closeExtrasModal}
                  className="w-8 h-8 flex items-center justify-center text-app-muted hover:bg-app-surface2 rounded-full transition-colors"
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
                      className="flex items-center gap-3 px-4 py-3 active:bg-brand-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleDraftExtra(extraId)}
                        className="w-5 h-5 rounded border-app-border text-brand-600 focus:ring-brand-400"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-app-text">{choice.label}</span>
                        {choice.price != null && choice.price > 0 && (
                          <div className="text-xs text-app-muted mt-0.5">
                            {formatPrice(choice.price)}
                          </div>
                        )}
                      </div>
                    </label>
                  )
                })}
              </div>
              <div className="flex-shrink-0 flex gap-3 px-4 py-3 border-t border-app-border bg-app-surface">
                <button
                  type="button"
                  onClick={closeExtrasModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm bg-app-surface2 text-app-text/80 active:bg-brand-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={applyExtrasModal}
                  className="flex-1 py-3 rounded-lg font-semibold text-sm bg-brand-500 text-white active:bg-brand-600 transition-colors"
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
