import { useState, useRef, useEffect } from 'react'
import ProductDetail from './ProductDetail'
import OfferDetail from './OfferDetail'

export default function StorePage({ point, deliveryLocation, menu, categories, offers = [], activeCategory, setActiveCategory, onBack, addToCart }) {
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [selectedOfferDetail, setSelectedOfferDetail] = useState(null)
  const categoryRefs = useRef({})
  const productsContainerRef = useRef(null)
  const [visibleCategory, setVisibleCategory] = useState(offers.length > 0 ? 'Offers' : categories[0])
  const isLocationInactive = deliveryLocation?.isActive === false
  const isRestaurantClosed = point?.isOpen === false
  const cannotAddToCart = isLocationInactive || isRestaurantClosed

  // Detect which category is in view as user scrolls
  const handleProductsScroll = () => {
    if (!productsContainerRef.current) return
    
    const scrollPos = productsContainerRef.current.scrollTop
    const allCategories = offers.length > 0 ? ['Offers', ...categories] : categories
    let currentVisible = allCategories[0]
    
    Object.entries(categoryRefs.current).forEach(([category, ref]) => {
      if (ref && ref.offsetTop <= scrollPos + 60) {
        currentVisible = category
      }
    })
    
    setVisibleCategory(currentVisible)
    setActiveCategory(currentVisible)
  }

  // Scroll to category when clicked
  const scrollToCategory = (category) => {
    setVisibleCategory(category)
    setActiveCategory(category)
    if (categoryRefs.current[category] && productsContainerRef.current) {
      const element = categoryRefs.current[category]
      const scrollTop = element.offsetTop - 10
      productsContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' })
    }
  }

  return (
    <div className="w-full h-screen bg-white flex flex-col overflow-hidden">
      {/* Header - Mobile Optimized */}
      <div className="flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2.5 z-20 shadow-md flex-shrink-0">
        <button 
          onClick={onBack} 
          className="mr-2 text-2xl leading-none active:opacity-70 transition-opacity"
          aria-label="Go back"
        >
          ←
        </button>
        <div className="flex-1 font-bold text-base sm:text-lg lg:text-xl truncate">🏪 {point.name}</div>
      </div>

      {/* Delivery Info - Mobile Optimized */}
      <div className="bg-gradient-to-r from-sky-400 to-blue-500 text-white px-3 py-2.5 shadow-sm flex-shrink-0">
        {isRestaurantClosed ? (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
            <span className="text-lg">🕐</span>
            <span className="font-semibold">Restaurant is closed</span>
          </div>
        ) : isLocationInactive ? (
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">Temporarily Closed</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1">
              <span className="text-sm">💰</span>
              <span className="font-semibold">
                Delivery fee:{' '}
                <span className="underline decoration-white/60">
                  € {parseFloat(point?.deliveryFee || 0).toFixed(2)}
                </span>
              </span>
            </div>
            <div className="h-3 w-px bg-white/50"></div>
            <div className="flex items-center gap-1">
              <span className="text-sm">📦</span>
              <span className="font-semibold">
                Free delivery from:{' '}
                <span className="underline decoration-white/60">
                  € {parseFloat(point?.minOrder || 0).toFixed(2)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Categories - Mobile Optimized Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2.5 bg-white border-b border-slate-200 z-10 flex-shrink-0 scrollbar-hide">
        {offers.length > 0 && (
          <button
            onClick={() => scrollToCategory('Offers')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              visibleCategory === 'Offers'
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 active:bg-slate-200'
            }`}
          >
            Offers
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => scrollToCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all ${
              visibleCategory === c
                ? 'bg-orange-500 text-white shadow-sm' 
                : 'bg-slate-100 text-slate-700 active:bg-slate-200'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Products List - Mobile Optimized */}
      <div 
        ref={productsContainerRef}
        onScroll={handleProductsScroll}
        className="flex-1 overflow-y-auto pb-20"
      >
        {/* Offers Section */}
        {offers.length > 0 && (
          <div key="Offers" className="px-3 pt-4">
            <div 
              ref={(el) => {
                if (el) {
                  categoryRefs.current['Offers'] = el
                }
              }}
              className="mb-3 pb-2 border-b-2 border-orange-500"
            >
              <h2 className="text-base font-bold text-slate-900">Special Offers</h2>
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
                className="flex gap-3 pb-4 mb-4 border-b border-slate-200 last:border-0 last:mb-0 cursor-pointer active:bg-slate-50 rounded-lg px-2 -mx-2"
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
                      <h3 className="text-sm font-bold text-slate-900 leading-tight break-words">
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
                          : 'bg-orange-500 text-white active:scale-95 active:bg-orange-600'
                      }`}
                      aria-label={cannotAddToCart ? (isLocationInactive ? 'Location temporarily closed' : 'Restaurant is closed') : 'Add to cart'}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-orange-600 mb-1">
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
                className="mb-3 pb-2 border-b-2 border-blue-500"
              >
                <h2 className="text-base font-bold text-slate-900">{category}</h2>
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
                  } ${cannotSelect ? 'cursor-not-allowed' : 'cursor-pointer active:bg-slate-50'}`}
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
                      <h3 className="text-sm font-bold text-slate-900 leading-tight break-words mb-1">
                        {item.name}
                      </h3>
                        {isInactive && (
                          <span className="inline-block text-[10px] font-semibold text-red-500 uppercase tracking-wide">
                            Μη διαθέσιμο
                          </span>
                        )}
                        {!isInactive && isOutOfStock && (
                          <span className="inline-block text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                            Εξαντλήθηκε
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
                            : 'bg-orange-500 text-white active:scale-95 active:bg-orange-600'
                        }`}
                        aria-label={cannotSelect ? (isOutOfStock ? 'Out of stock' : 'Product not available') : cannotAddToCart ? (isLocationInactive ? 'Location temporarily closed' : 'Restaurant is closed') : 'Add to cart'}
                    >
                      +
                    </button>
                  </div>
                    <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${
                      cannotSelect ? 'text-slate-500' : 'text-orange-600'
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
