import { useState, useRef, useEffect } from 'react'
import ProductDetail from './ProductDetail'
import OfferDetail from './OfferDetail'
import restaurantImage from '../assets/restaurant-image.png'
import logo from '../assets/logo.png'

export default function StorePage({ point, deliveryLocation, menu, categories, offers = [], activeCategory, setActiveCategory, onBack, addToCart }) {
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [selectedOfferDetail, setSelectedOfferDetail] = useState(null)
  const categoryRefs = useRef({})
  const productsContainerRef = useRef(null)
  const scrollTargetRef = useRef(null) // όταν πατήθηκε pill, αγνοούμε scroll μέχρι να σταματήσει
  const [visibleCategory, setVisibleCategory] = useState(offers.length > 0 ? 'Offers' : categories[0])
  const isLocationInactive = deliveryLocation?.isActive === false
  const isRestaurantClosed = point?.isOpen === false
  const cannotAddToCart = isLocationInactive || isRestaurantClosed

  const deliveryFee = parseFloat(point?.deliveryFee || 0).toFixed(2)
  const minOrder = parseFloat(point?.minOrder || 0).toFixed(2)

  // Derive today's opening / closing from deliveredBy.openingHours (point.openingHours)
  const todayHours = (() => {
    const hours = point?.openingHours
    if (!Array.isArray(hours) || hours.length === 0) return null

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: point?.timezone || 'Europe/Athens',
    })
    const todayName = formatter.format(now) // e.g. "Monday"

    const matchToday = hours.find((h) => {
      if (!h?.day) return false
      return String(h.day).toLowerCase() === todayName.toLowerCase()
    })

    if (!matchToday) return null

    return {
      opensAt: matchToday.open,
      closesAt: matchToday.close,
    }
  })()

  const openLabel = (() => {
    if (isRestaurantClosed) {
      if (point?.opensAt) return `Opens at ${point.opensAt}`
      if (point?.nextOpeningTime) return `Opens at ${point.nextOpeningTime}`
      if (todayHours?.opensAt) return `Opens at ${todayHours.opensAt}`
      return 'Currently closed'
    }

    if (todayHours?.closesAt) {
      return `Open until ${todayHours.closesAt}`
    }

    if (point?.openUntil) return `Open until ${point.openUntil}`
    return 'Open now'
  })()

  // Detect which category is in view as user scrolls
  const handleProductsScroll = () => {
    const container = productsContainerRef.current
    if (!container) return
    if (scrollTargetRef.current) return

    const scrollTop = container.scrollTop
    const orderedKeys = [
      ...(offers.length > 0 ? ['Offers'] : []),
      ...categories,
    ]
    let currentVisible = orderedKeys[0]
    for (const key of orderedKeys) {
      const ref = categoryRefs.current[key]
      if (!ref) continue
      if (ref.offsetTop <= scrollTop + 70) currentVisible = key
      else break
    }
    if (currentVisible && currentVisible !== visibleCategory) {
      setVisibleCategory(currentVisible)
      setActiveCategory(currentVisible)
    }
  }

  const scrollToCategory = (category) => {
    const container = productsContainerRef.current
    const element = categoryRefs.current[category]
    if (!container || !element) return
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const targetScrollTop = Math.max(elementRect.top - containerRect.top + container.scrollTop - 8, 0)
    setVisibleCategory(category)
    setActiveCategory(category)
    scrollTargetRef.current = category
    container.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
    setTimeout(() => { scrollTargetRef.current = null }, 600)
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Σταθερή εικόνα restaurant + logo στη μέση + info κάτω */}
      <div
        className="relative flex-shrink-0 min-h-[240px] bg-cover bg-center bg-no-repeat flex items-center justify-center py-4"
        style={{ backgroundImage: `url(${restaurantImage})` }}
      >
        <div className="absolute inset-0 bg-black/25 rounded-b-lg" aria-hidden="true" />
        <button
          onClick={onBack}
          className="absolute top-3 left-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white text-lg active:bg-black/60 transition-colors"
          aria-label="Go back"
        >
          ←
        </button>
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-white drop-shadow-md">
            {point?.name}
          </div>
          <img
            src={logo}
            alt=""
            className="mt-2 w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-white/50 shadow-lg"
          />
          <div className="mt-2 text-white drop-shadow-md">
            <div className="text-xs sm:text-sm font-semibold text-white">
              {isLocationInactive ? 'Delivery temporarily unavailable' : openLabel}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-xs font-medium text-white flex-wrap">
              <span>Delivery {deliveryFee} €</span>
              <span className="w-1 h-1 rounded-full bg-white/80" />
              <span>Free delivery over {minOrder} €</span>
              <span className="w-1 h-1 rounded-full bg-white/80" />
              <span>Min order 0 €</span>
            </div>
          </div>
        </div>
      </div>

      {/* Σταθερά section buttons */}
      <div className="flex-shrink-0 flex gap-5 overflow-x-auto px-3 py-3 bg-white border-b border-slate-200 shadow-sm scrollbar-hide">
        {offers.length > 0 && (
          <button
            onClick={() => scrollToCategory('Offers')}
            className={`pb-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors border-b-2 -mb-px ${
              visibleCategory === 'Offers'
                ? 'text-orange-600 border-orange-500'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Offers
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => scrollToCategory(c)}
            className={`pb-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors border-b-2 -mb-px ${
              visibleCategory === c
                ? 'text-orange-600 border-orange-500'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Μόνο το περιεχόμενο κάνει scroll */}
      <div
        ref={productsContainerRef}
        onScroll={handleProductsScroll}
        className="flex-1 overflow-y-auto"
      >
      <div className="pb-20">
        {/* Offers Section */}
        {offers.length > 0 && (
          <div key="Offers" className="px-3 pt-4">
            <div 
              ref={(el) => {
                if (el) {
                  categoryRefs.current['Offers'] = el
                }
              }}
              id="section-Offers"
              className="mb-3 pb-2 border-b-2 border-[#f6a94b]"
            >
              <h2 className="text-base font-bold text-[#1f2933]">Special Offers</h2>
            </div>
            {offers.map((offer, index) => (
              <div 
                key={offer.id}
                onClick={() => setSelectedOfferDetail(offer)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedOfferDetail(offer)
                }}
                className="flex gap-3 pb-4 mb-4 border-b border-slate-200 last:border-0 last:mb-0 cursor-pointer active:bg-[#f4ebe1] rounded-lg px-2 -mx-2"
              >
                {offer.image && (
                  <div className="flex-shrink-0">
                    <img 
                      src={offer.image} 
                      alt={offer.name} 
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg" 
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-medium mb-1">
                        Offer
                      </span>
                      <h3 className="text-sm font-bold text-[#1f2933] leading-tight break-words">
                        {offer.name}
                      </h3>
                    </div>
                    <button
                      disabled={cannotAddToCart}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!cannotAddToCart) {
                          setSelectedOfferDetail(offer)
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className={`flex-shrink-0 w-9 h-9 rounded-full font-bold text-lg shadow-md transition-all flex items-center justify-center ${
                        cannotAddToCart
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-[#f6a94b] text-white active:scale-95 active:bg-[#e7952f]'
                      }`}
                      aria-label={cannotAddToCart ? (isLocationInactive ? 'Location temporarily closed' : 'Restaurant is closed') : 'Add to cart'}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-[#5a2b00] mb-1">
                    € {parseFloat(offer.price || 0).toFixed(2)}
                  </div>
                  {offer.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-snug">
                      {offer.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categories Products */}
        {categories.map((category) => (
          <div key={category} className="px-3 pt-4">
            {menu[category] && menu[category].length > 0 && (
              <div 
                ref={(el) => {
                  if (el && menu[category] && menu[category].length > 0) {
                    categoryRefs.current[category] = el
                  }
                }}
                id={`section-${category}`}
                className="mb-3 pb-2 border-b-2 border-[#f6a94b]"
              >
                <h2 className="text-base font-bold text-[#1f2933]">{category}</h2>
              </div>
            )}
            {menu[category] && menu[category].map((item, index) => {
              const original = item._original || {}
              const isInactive = original.isAvailable === false || original.isActive === false
              const isOutOfStock = item.stockQuantity != null && Number(item.stockQuantity) === 0
              const cannotSelect = isInactive || isOutOfStock

              return (
              <div 
                key={item.id}
                  onClick={() => {
                    if (!cannotSelect) setSelectedProductDetail(item)
                  }}
                  role={!cannotSelect ? 'button' : undefined}
                  tabIndex={!cannotSelect ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (cannotSelect) return
                    if (e.key === 'Enter' || e.key === ' ') setSelectedProductDetail(item)
                  }}
                  className={`flex gap-3 pb-4 mb-4 border-b border-slate-200 last:border-0 last:mb-0 rounded-lg px-2 -mx-2 ${
                    cannotSelect ? 'opacity-60' : ''
                  } ${cannotSelect ? 'cursor-not-allowed' : 'cursor-pointer active:bg-[#f4ebe1]'}`}
              >
                  <div className="flex-shrink-0">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg ${
                        cannotSelect ? 'grayscale' : ''
                      }`} 
                    />
                  </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#1f2933] leading-tight break-words mb-1">
                        {item.name}
                      </h3>
                        {isInactive && (
                          <span className="inline-block text-[10px] font-semibold text-red-500 uppercase tracking-wide">
                            Not available
                          </span>
                        )}
                        {!isInactive && isOutOfStock && (
                          <span className="inline-block text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                            Out of stock
                          </span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={cannotSelect || cannotAddToCart}
                        onClick={() => {
                          if (!cannotSelect && !cannotAddToCart) {
                            setSelectedProductDetail(item)
                          }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className={`flex-shrink-0 w-9 h-9 rounded-full font-bold text-lg shadow-md transition-all flex items-center justify-center ${
                          cannotSelect || cannotAddToCart
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-[#f6a94b] text-white active:scale-95 active:bg-[#e7952f]'
                        }`}
                        aria-label={cannotSelect ? (isOutOfStock ? 'Out of stock' : 'Product not available') : cannotAddToCart ? (isLocationInactive ? 'Location temporarily closed' : 'Restaurant is closed') : 'Add to cart'}
                    >
                      +
                    </button>
                  </div>
                    <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${
                      cannotSelect ? 'text-slate-500' : 'text-[#5a2b00]'
                    }`}>
                      {item.priceAfterDiscount ? (
                        <>
                          <span className="line-through text-slate-400">{item.originalPrice}</span>
                          <span>{item.priceAfterDiscount}</span>
                        </>
                      ) : (
                        <span>{item.price}</span>
                      )}
                    </div>
                  {item.desc && (
                      <p className={`text-xs line-clamp-2 leading-snug ${
                        cannotSelect ? 'text-slate-500' : 'text-slate-600'
                      }`}>
                        {item.desc}
                      </p>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        ))}
      </div>
      </div>

      {/* Modals */}
      {selectedProductDetail && (
        <ProductDetail
          key={selectedProductDetail.id}
          product={selectedProductDetail}
          isLocationInactive={cannotAddToCart}
          onClose={() => setSelectedProductDetail(null)}
          onAdd={(item) => {
            if (!cannotAddToCart) {
              addToCart(item)
              setSelectedProductDetail(null)
            }
          }}
        />
      )}

      {selectedOfferDetail && (
        <OfferDetail
          key={selectedOfferDetail.id}
          offer={selectedOfferDetail}
          isLocationInactive={cannotAddToCart}
          onClose={() => setSelectedOfferDetail(null)}
          onAdd={(item) => {
            if (!cannotAddToCart) {
              addToCart(item)
              setSelectedOfferDetail(null)
            }
          }}
        />
      )}
    </div>
  )
}
