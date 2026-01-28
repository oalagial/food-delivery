import { useState, useEffect, useRef } from 'react'
import { parsePrice, formatPrice } from '../utils/price'

export default function OfferDetail({ offer, onClose, onAdd }) {
  const [selectedGroups, setSelectedGroups] = useState({}) // { groupId: [productIds] }
  const [qty, setQty] = useState(1)
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

  // Check if all groups meet min/max requirements
  const isValid = offer.groups.every(group => {
    const selected = selectedGroups[group.id] || []
    return selected.length >= group.minItems && selected.length <= group.maxItems
  })

  const basePrice = parsePrice(offer.price)
  const total = basePrice * qty

  // Toggle product selection in a group
  const toggleProduct = (groupId, offerGroupProductId) => {
    setSelectedGroups(prev => {
      const current = prev[groupId] || []
      const group = offer.groups.find(g => g.id === groupId)
      
      if (current.includes(offerGroupProductId)) {
        return { ...prev, [groupId]: current.filter(id => id !== offerGroupProductId) }
      } else {
        if (current.length >= group.maxItems) {
          return prev
        }
        return { ...prev, [groupId]: [...current, offerGroupProductId] }
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => {
          setMounted(false)
          setTimeout(() => onClose(), 180)
        }}
      />
      <div
        className={`relative bg-white w-full max-w-lg h-[95vh] sm:h-[90vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 flex flex-col ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full sm:translate-y-4'}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`offer-${offer.id}-title`}
      >
        {/* Header - Fixed */}
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-2xl text-slate-600 active:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            ×
          </button>
          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full text-xs font-semibold">
            Offer
          </span>
          <div className="w-8"></div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          <div className="p-4">
            {offer.image && (
              <img 
                src={offer.image} 
                alt={offer.name} 
                className="w-full h-48 sm:h-64 object-cover rounded-lg mb-4" 
              />
            )}
            
            <h2 id={`offer-${offer.id}-title`} className="text-xl font-bold mb-2 text-slate-900">
              {offer.name}
            </h2>
            
            {offer.description && (
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                {offer.description}
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

            {/* Offer Groups */}
            {offer.groups.map((group) => {
              const selected = selectedGroups[group.id] || []
              const API_BASE = import.meta.env.VITE_API_BASE
              
              return (
                <div className="mb-5" key={group.id}>
                  <div className="font-semibold text-sm mb-2 text-slate-900">
                    {group.name}
                    <span className="text-xs font-normal text-slate-500 ml-1">
                      (Select {group.minItems} {group.minItems === group.maxItems ? '' : `- ${group.maxItems}`})
                    </span>
                    {selected.length < group.minItems && (
                      <span className="text-red-500 ml-2 text-xs">* Required</span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {group.offerGroupProducts.map((ogp) => {
                      const product = ogp.product
                      const isSelected = selected.includes(ogp.id)
                      const isDisabled = !isSelected && selected.length >= group.maxItems
                      
                      let imageUrl = product.image
                      if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = `${API_BASE}/images/${imageUrl}`
                      }
                      
                      return (
                        <div
                          key={ogp.id}
                          onClick={() => !isDisabled && toggleProduct(group.id, ogp.id)}
                          className={`flex items-center gap-3 p-2.5 border-2 rounded-lg transition-all ${
                            isSelected
                              ? 'border-orange-500 bg-orange-50'
                              : isDisabled
                              ? 'border-slate-200 bg-slate-50 opacity-50'
                              : 'border-slate-200 active:border-orange-300 active:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => {}}
                            className="w-4 h-4 flex-shrink-0"
                          />
                          {imageUrl && (
                            <img 
                              src={imageUrl} 
                              alt={product.name} 
                              className="w-14 h-14 object-cover rounded flex-shrink-0" 
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {selected.length < group.minItems && (
                    <div className="text-xs text-red-500 mt-2 font-medium">
                      Please select at least {group.minItems} item{group.minItems > 1 ? 's' : ''}.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer Button - Fixed */}
        <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-3">
          <button
            disabled={!isValid}
            onClick={() => {
              if (!isValid) return
              
              const selectedGroupsArray = []
              Object.entries(selectedGroups).forEach(([groupId, offerGroupProductIds]) => {
                offerGroupProductIds.forEach(offerGroupProductId => {
                  selectedGroupsArray.push({
                    groupId: parseInt(groupId),
                    selectedItemId: offerGroupProductId,
                  })
                })
              })

              const item = {
                id: `offer_${offer.id}`,
                name: offer.name,
                price: basePrice,
                qty,
                options: {},
                extraIds: [],
                extraNames: [],
                isOffer: true,
                offerId: offer.id,
                quantity: qty,
                selectedGroups: selectedGroupsArray,
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
