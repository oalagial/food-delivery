import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ProductDetail from './ProductDetail'
import OfferDetail from './OfferDetail'
import restaurantImage from '../assets/restaurant-image.png'
import logo from '../assets/logo.png'
import { getProductLabelIcons } from '../utils/productLabels'
import GeneralCouponsStrip from './GeneralCouponsStrip'

function resolveRestaurantMediaUrl(raw, fallback) {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) return fallback
  const s = String(raw).trim()
  if (s.startsWith('http')) return s
  const base = import.meta.env.VITE_API_BASE
  if (!base) return fallback
  return `${base}/images/${s}`
}

export default function StorePage({ point, deliveryLocation, menu, categories, offers = [], activeCategory, setActiveCategory, onBack, addToCart }) {
  const { t } = useTranslation()
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [selectedOfferDetail, setSelectedOfferDetail] = useState(null)
  const categoryRefs = useRef({})
  const productsContainerRef = useRef(null)
  const scrollTargetRef = useRef(null) // όταν πατήθηκε pill, αγνοούμε scroll μέχρι να σταματήσει
  const [visibleCategory, setVisibleCategory] = useState(offers.length > 0 ? 'Offers' : categories[0])
  const isLocationInactive = deliveryLocation?.isActive === false
  const isRestaurantClosed = point?.isOpen === false
  const cannotAddToCart = isLocationInactive || isRestaurantClosed
  const removeProductIngredients = point?.config?.removeProductIngredients === true

  const heroBackgroundUrl = useMemo(() => {
    return resolveRestaurantMediaUrl(point?.image, restaurantImage)
  }, [point?.image])

  const restaurantLogoUrl = useMemo(() => {
    return resolveRestaurantMediaUrl(point?.logo, logo)
  }, [point?.logo])

  const [logoLoadFailed, setLogoLoadFailed] = useState(false)
  useEffect(() => {
    setLogoLoadFailed(false)
  }, [point?.id, restaurantLogoUrl])

  const [generalCoupons, setGeneralCoupons] = useState([])

  useEffect(() => {
    if (point?.id == null) {
      setGeneralCoupons([])
      return
    }
    const ac = new AbortController()
    const API_BASE = import.meta.env.VITE_API_BASE
    if (!API_BASE) {
      setGeneralCoupons([])
      return
    }
    ;(async () => {
      try {
        const params = new URLSearchParams({
          page: '1',
          limit: '20',
          sortField: 'createdAt',
          sortDir: 'desc',
        })
        const res = await fetch(`${API_BASE}/public/general-coupons?${params}`, {
          signal: ac.signal,
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) return
        const json = await res.json()
        const rows = Array.isArray(json?.data) ? json.data : []
        const now = Date.now()
        const active = rows.filter((c) => {
          if (c.startsAt) {
            const t0 = new Date(c.startsAt).getTime()
            if (!Number.isNaN(t0) && now < t0) return false
          }
          if (c.endsAt) {
            const t1 = new Date(c.endsAt).getTime()
            if (!Number.isNaN(t1) && now > t1) return false
          }
          return true
        })
        if (ac.signal.aborted) return
        setGeneralCoupons(active)
      } catch (e) {
        if (e?.name === 'AbortError') return
        setGeneralCoupons([])
      }
    })()
    return () => ac.abort()
  }, [point?.id])

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
      if (point?.opensAt) return t('store.opensAt', { time: point.opensAt })
      if (point?.nextOpeningTime) return t('store.opensAt', { time: point.nextOpeningTime })
      if (todayHours?.opensAt) return t('store.opensAt', { time: todayHours.opensAt })
      return t('store.currentlyClosed')
    }

    if (todayHours?.closesAt) {
      return t('store.openUntil', { time: todayHours.closesAt })
    }

    if (point?.openUntil) return t('store.openUntil', { time: point.openUntil })
    return t('store.openNow')
  })()

  const ratingDisplay =
    point?.rating != null && point?.rating !== ''
      ? Number(point.rating)
      : point?.averageRating != null && point?.averageRating !== ''
        ? Number(point.averageRating)
        : null
  const ratingText =
    ratingDisplay != null && !Number.isNaN(ratingDisplay) ? ratingDisplay.toFixed(1) : null

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
      {/* Hero cover + overlapping square logo + info (Wolt-style) */}
      <div className="relative flex-shrink-0 w-full bg-white">
        {/* Hero: πιο ψηλό, στρογγυλό κάτω, ήπια κλίση — χωρίς επίπεδο κόψιμο */}
        <div
          className="relative min-h-[138px] h-[min(23vh,182px)] max-h-[200px] w-full overflow-hidden shadow-[0_4px_24px_rgba(15,23,42,0.08)] sm:min-h-[152px] sm:h-[min(22vh,198px)] sm:max-h-[220px]"
          style={{
            borderBottomLeftRadius: '50% 2%',
            borderBottomRightRadius: '50% 2%',
          }}
        >
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-black/5"
            aria-hidden="true"
          />
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-base text-slate-800 shadow-sm ring-1 ring-slate-200/80 transition-colors active:bg-white sm:left-4 sm:top-4 sm:h-10 sm:w-10 sm:text-lg"
            aria-label={t('store.goBack')}
          >
            ←
          </button>
        </div>

        <div className="relative z-20 mx-auto flex max-w-lg flex-col items-center px-4 pb-3 pt-0">
          <div className="relative z-30 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100/90 bg-white shadow-[0_10px_40px_-4px_rgba(15,23,42,0.18)] sm:-mt-11 sm:h-[5.5rem] sm:w-[5.5rem] sm:rounded-[1.125rem]">
            <img
              src={logoLoadFailed ? logo : restaurantLogoUrl}
              alt=""
              className="max-h-[78%] max-w-[78%] object-contain object-center"
              loading="eager"
              decoding="async"
              onError={() => setLogoLoadFailed(true)}
            />
          </div>
          <h1 className="mt-3 max-w-[min(100%,18rem)] text-center text-base font-semibold leading-tight tracking-tight text-slate-900 sm:mt-3.5 sm:max-w-[22rem] sm:text-lg">
            {point?.name}
          </h1>
          <div className="mt-2 w-full max-w-sm space-y-1 text-center text-[11px] leading-relaxed text-slate-500 sm:text-xs">
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
              {ratingText != null && (
                <>
                  <span className="inline-flex items-center gap-0.5 font-medium text-slate-600">
                    <span aria-hidden>😊</span>
                    {ratingText}
                  </span>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                </>
              )}
              <span>{isLocationInactive ? t('store.deliveryUnavailable') : openLabel}</span>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <span>{t('store.minOrderAmount', { min: minOrder })}</span>
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
              <span className="inline-flex items-center gap-1">
                <span aria-hidden className="opacity-90">
                  🚴
                </span>
                <span>{t('store.deliveryFee', { fee: deliveryFee })}</span>
              </span>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <span>{t('store.freeDeliveryOver', { min: minOrder })}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Σταθερά section buttons */}
      <div className="flex-shrink-0 flex gap-5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-3 shadow-sm scrollbar-hide">
        {offers.length > 0 && (
          <button
            onClick={() => scrollToCategory('Offers')}
            className={`pb-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors border-b-2 -mb-px ${visibleCategory === 'Offers'
              ? 'text-orange-600 border-orange-500'
              : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
          >
            {t('store.offers')}
          </button>
        )}
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => scrollToCategory(c)}
            className={`pb-1.5 text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-colors border-b-2 -mb-px ${visibleCategory === c
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
          <GeneralCouponsStrip coupons={generalCoupons} />

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
                className="mb-3 pb-2 border-b-2 border-orange-400"
              >
                <h2 className="text-base font-bold text-slate-800">{t('store.specialOffers')}</h2>
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
                  className="flex gap-3 pb-4 mb-4 border-b border-slate-200 last:border-0 last:mb-0 cursor-pointer active:bg-amber-50 rounded-lg px-2 -mx-2"
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
                          {t('common.offer')}
                        </span>
                        <h3 className="text-sm font-bold text-slate-800 leading-tight break-words">
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
                        className={`flex-shrink-0 w-8 h-8 rounded-full font-bold text-lg shadow-md transition-all flex items-center justify-center ${cannotAddToCart
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-orange-400 text-white active:scale-95 active:bg-orange-500'
                          }`}
                        aria-label={cannotAddToCart ? (isLocationInactive ? t('store.locationClosed') : t('store.restaurantClosed')) : t('store.addToCart')}
                      >
                        +
                      </button>
                    </div>
                    <div className="text-sm font-semibold text-amber-900 mb-1">
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
                  className="mb-3 pb-2 border-b-2 border-orange-400"
                >
                  <h2 className="text-base font-bold text-slate-800">{category}</h2>
                </div>
              )}
              {menu[category] && menu[category].map((item, index) => {
                const original = item._original || {}
                const labelIcons = getProductLabelIcons(item.labels || original.labels)
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
                    className={`flex gap-3 pb-4 mb-4 border-b border-slate-200 last:border-0 last:mb-0 rounded-lg px-2 -mx-2 ${cannotSelect ? 'opacity-60' : ''
                      } ${cannotSelect ? 'cursor-not-allowed' : 'cursor-pointer active:bg-amber-50'}`}
                  >
                    <div className="flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg ${cannotSelect ? 'grayscale' : ''
                          }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-800 leading-tight break-words mb-1">
                            {item.name}
                          </h3>
                          {labelIcons.length > 0 && (
                            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                              {labelIcons.map((icon) => (
                                <img
                                  key={icon.key}
                                  src={icon.src}
                                  alt={icon.alt}
                                  title={icon.alt}
                                  className="w-6 h-6"
                                  loading="lazy"
                                />
                              ))}
                            </div>
                          )}
                          {isInactive && (
                            <span className="inline-block text-xs font-semibold text-red-500 uppercase tracking-wide">
                              {t('store.notAvailable')}
                            </span>
                          )}
                          {!isInactive && isOutOfStock && (
                            <span className="inline-block text-xs font-semibold text-amber-600 uppercase tracking-wide">
                              {t('store.outOfStock')}
                            </span>
                          )}
                          {!isInactive && !isOutOfStock && (item.hasDiscount || item.priceAfterDiscount) && (
                            <span className="inline-block text-xs font-semibold text-amber-600 uppercase tracking-wide">
                              {t('common.offer')}
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
                          className={`flex-shrink-0 w-8 h-8 rounded-full font-bold text-lg shadow-md transition-all flex items-center justify-center ${cannotSelect || cannotAddToCart
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-orange-400 text-white active:scale-95 active:bg-orange-500'
                            }`}
                          aria-label={cannotSelect ? (isOutOfStock ? t('store.outOfStock') : t('store.productNotAvailable')) : cannotAddToCart ? (isLocationInactive ? t('store.locationClosed') : t('store.restaurantClosed')) : t('store.addToCart')}
                        >
                          +
                        </button>
                      </div>
                      <div className={`text-sm font-semibold mb-1 flex items-center gap-2 ${cannotSelect ? 'text-slate-500' : 'text-amber-900'
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
                        <p className={`text-xs line-clamp-2 leading-snug ${cannotSelect ? 'text-slate-500' : 'text-slate-600'
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
          removeProductIngredients={removeProductIngredients}
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
