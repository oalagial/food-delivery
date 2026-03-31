import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import ProductDetail from './ProductDetail'
import OfferDetail from './OfferDetail'
import restaurantImage from '../assets/restaurant-image.png'
import logo from '../assets/logo.png'
import { getProductLabelIcons } from '../utils/productLabels'
import GeneralCouponsStrip from './GeneralCouponsStrip'
import LanguageSwitcher from './LanguageSwitcher'
import { useFloatingLanguageControl } from '../context/FloatingLanguageContext'

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
  const tabsRowRef = useRef(null)
  const heroImageRef = useRef(null)
  const scrollTargetRef = useRef(null) // όταν πατήθηκε pill, αγνοούμε scroll μέχρι να σταματήσει
  /** Ύψος sticky γραμμής κατηγοριών (για scroll-spy & scrollToCategory) */
  const STICKY_TABS_OFFSET = 52
  /** Έξτρα offset όταν η μπάρα πίσω/γλώσσα είναι fixed — ταιριάζει με ύψος toolbar (pt + h-9 + pb / sm:h-10) */
  const DOCKED_TOOLBAR_OFFSET = 52
  const [toolbarDocked, setToolbarDocked] = useState(false)
  const [visibleCategory, setVisibleCategory] = useState(offers.length > 0 ? 'Offers' : categories[0])
  const isLocationInactive = deliveryLocation?.isActive === false
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

  useEffect(() => {
    setToolbarDocked(false)
  }, [point?.id])

  const floatingLang = useFloatingLanguageControl()
  const setFloatingLanguageHidden = floatingLang?.setFloatingLanguageHidden
  useEffect(() => {
    if (!setFloatingLanguageHidden) return
    setFloatingLanguageHidden(true)
    return () => setFloatingLanguageHidden(false)
  }, [setFloatingLanguageHidden])

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
    ; (async () => {
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

  const rawDeliveryFeeNum = parseFloat(point?.deliveryFee || 0) || 0
  const deliveryFee = rawDeliveryFeeNum.toFixed(2)
  const freeDeliveryFrom = parseFloat(point?.minOrder || 0) || 0
  const freeDeliveryFromDisplay = freeDeliveryFrom.toFixed(2)
  const showFreeDeliveryHint = rawDeliveryFeeNum > 0 && freeDeliveryFrom > 0

  const scheduleState = (() => {
    const hours = Array.isArray(point?.openingHours) ? point.openingHours : []
    if (hours.length === 0) return null

    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: point?.timezone || 'Europe/Athens',
    })
    const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]))
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute)
    const todayName = parts.weekday
    const parseTimeToMinutes = (value) => {
      if (!value) return null
      const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
      if (!match) return null
      return Number(match[1]) * 60 + Number(match[2])
    }

    const todayWindows = hours
      .filter((h) => h?.day && String(h.day).toLowerCase() === String(todayName).toLowerCase())
      .map((h) => ({
        opensAt: h.open ?? null,
        closesAt: h.close ?? null,
        openMinutes: parseTimeToMinutes(h.open),
        closeMinutes: parseTimeToMinutes(h.close),
      }))
      .filter((h) => h.openMinutes != null && h.closeMinutes != null)
      .sort((a, b) => a.openMinutes - b.openMinutes)

    const activeWindow = todayWindows.find((h) => currentMinutes >= h.openMinutes && currentMinutes < h.closeMinutes) || null
    const nextTodayWindow = todayWindows.find((h) => currentMinutes < h.openMinutes) || null

    return {
      activeWindow,
      nextTodayWindow,
    }
  })()

  const todayHours = scheduleState?.activeWindow || scheduleState?.nextTodayWindow || null
  const isRestaurantClosed = scheduleState ? !scheduleState.activeWindow : point?.isOpen === false
  const cannotAddToCart = isLocationInactive || isRestaurantClosed

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

  const sectionTopInScrollContainer = (el) => {
    const container = productsContainerRef.current
    if (!container || !el) return 0
    return el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
  }

  // Οριζόντιο scroll των καρτελών — ΟΧΙ scrollIntoView (scroll-άρει και το vertical container και «τρώει» το scrollTo στο section)
  useEffect(() => {
    const root = tabsRowRef.current
    if (!root) return
    const btn = root.querySelector(`[data-store-category="${CSS.escape(String(visibleCategory))}"]`)
    if (!btn) return
    const targetLeft = btn.offsetLeft - root.clientWidth / 2 + btn.offsetWidth / 2
    const maxLeft = Math.max(0, root.scrollWidth - root.clientWidth)
    root.scrollTo({ left: Math.max(0, Math.min(targetLeft, maxLeft)), behavior: 'smooth' })
  }, [visibleCategory])

  const computeToolbarDocked = (scrollTop) => {
    const heroEl = heroImageRef.current
    if (!heroEl) return false
    const threshold = Math.max(0, heroEl.offsetHeight - 40)
    return scrollTop > threshold
  }

  const stickyStackOffset = (docked) => STICKY_TABS_OFFSET + (docked ? DOCKED_TOOLBAR_OFFSET : 0)

  // Detect which category is in view as user scrolls
  const handleProductsScroll = () => {
    const container = productsContainerRef.current
    if (!container) return

    const scrollTop = container.scrollTop
    const docked = computeToolbarDocked(scrollTop)
    setToolbarDocked((prev) => (prev !== docked ? docked : prev))

    if (scrollTargetRef.current) return

    const orderedKeys = [
      ...(offers.length > 0 ? ['Offers'] : []),
      ...categories,
    ]
    let currentVisible = orderedKeys[0]
    const spyPad = stickyStackOffset(docked) + 2
    for (const key of orderedKeys) {
      const ref = categoryRefs.current[key]
      if (!ref) continue
      const top = sectionTopInScrollContainer(ref)
      if (top <= scrollTop + spyPad) currentVisible = key
    }
    // When scrolled near the bottom, activate the last category
    if (scrollTop + container.clientHeight >= container.scrollHeight - 20) {
      currentVisible = orderedKeys[orderedKeys.length - 1]
    }
    if (currentVisible && currentVisible !== visibleCategory) {
      setVisibleCategory(currentVisible)
      setActiveCategory(currentVisible)
    }
  }

  const findSectionElement = (category) => {
    const container = productsContainerRef.current
    if (!container) return null
    const fromRef = categoryRefs.current[category]
    if (fromRef && container.contains(fromRef)) return fromRef
    try {
      return container.querySelector(`[data-store-section="${CSS.escape(String(category))}"]`)
    } catch {
      return null
    }
  }

  const scrollToCategory = (category) => {
    const container = productsContainerRef.current
    if (!container) return
    const element = findSectionElement(category)
    if (!element) return

    setVisibleCategory(category)
    setActiveCategory(category)
    scrollTargetRef.current = category

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const c = productsContainerRef.current
        const el = findSectionElement(category)
        if (!c || !el) {
          scrollTargetRef.current = null
          return
        }
        const rawTop = sectionTopInScrollContainer(el)
        const undockedTarget = Math.max(0, rawTop - stickyStackOffset(false))
        const willBeDocked = computeToolbarDocked(undockedTarget)
        const targetScrollTop = Math.max(0, rawTop - stickyStackOffset(willBeDocked))
        c.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
      })
    })

    let idleTimer = null
    const onScrollIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        scrollTargetRef.current = null
        container.removeEventListener('scroll', onScrollIdle)
      }, 80)
    }
    container.addEventListener('scroll', onScrollIdle)
    setTimeout(() => {
      scrollTargetRef.current = null
      container.removeEventListener('scroll', onScrollIdle)
      clearTimeout(idleTimer)
    }, 1500)
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <div
        ref={productsContainerRef}
        onScroll={handleProductsScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]"
      >
        {/* Hero: φωτο + πίσω/γλώσσα από πάνω· με scroll κάτω η μπάρα γίνεται fixed */}
        <div className="relative w-full bg-white">
          <div
            ref={heroImageRef}
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
          </div>

          <div
            className={`left-0 right-0 z-40 flex items-center justify-between gap-3 px-3 transition-[background-color,box-shadow,border-color] duration-200 ${toolbarDocked
              ? 'fixed top-0 border-b border-slate-200 bg-white pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-sm [isolation:isolate]'
              : 'absolute top-0 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]'
              }`}
          >
            <button
              type="button"
              onClick={onBack}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base shadow-sm ring-1 transition-colors sm:h-10 sm:w-10 sm:text-lg ${toolbarDocked
                ? 'bg-slate-100 text-slate-800 ring-slate-200/80 active:bg-slate-200'
                : 'bg-white/95 text-slate-800 ring-slate-200/80 active:bg-white'
                }`}
              aria-label={t('store.goBack')}
            >
              ←
            </button>
            <div className={toolbarDocked ? '' : 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]'}>
              <LanguageSwitcher />
            </div>
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
            {deliveryLocation?.name ? (
              <p className="mt-1.5 max-w-[min(100%,22rem)] text-center text-[11px] leading-snug text-slate-500 sm:text-xs">
                <span className="text-slate-400">{t('checkout.deliveryTo')}</span>{' '}
                <span className="font-medium text-slate-600">{deliveryLocation.name}</span>
              </p>
            ) : null}
            <div className="mt-2 w-full max-w-sm space-y-1 text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
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
                <span className="font-semibold text-slate-700">{isLocationInactive ? t('store.deliveryUnavailable') : openLabel}</span>
              </p>
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden className="opacity-90">
                    🚴
                  </span>
                  <span className="font-semibold text-slate-700">{t('store.deliveryFee', { fee: deliveryFee })}</span>
                </span>
                {showFreeDeliveryHint ? (
                  <>
                    <span className="text-slate-300" aria-hidden>
                      ·
                    </span>
                    <span className="font-semibold text-slate-700">{t('store.freeDeliveryOver', { amount: freeDeliveryFromDisplay })}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky κατηγορίες — κάτω από fixed μπάρα όταν έχει κουμπώσει */}
        <div
          ref={tabsRowRef}
          className={`sticky z-30 flex gap-5 overflow-x-auto border-b border-slate-200 bg-white px-3 py-3 shadow-sm scrollbar-hide supports-[backdrop-filter]:bg-white/95 supports-[backdrop-filter]:backdrop-blur-sm ${toolbarDocked
            ? '-mt-px top-[calc(max(0.5rem,env(safe-area-inset-top,0px))+2.75rem)] sm:top-[calc(max(0.5rem,env(safe-area-inset-top,0px))+3rem)]'
            : 'top-0'
            }`}
        >
          {offers.length > 0 && (
            <button
              type="button"
              data-store-category="Offers"
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
              type="button"
              key={c}
              data-store-category={c}
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

        <div className="pb-20">
          <GeneralCouponsStrip coupons={generalCoupons} />

          {/* Offers Section */}
          {offers.length > 0 && (
            <div key="Offers" className="px-3 pt-4">
              <div
                ref={(el) => {
                  if (el) {
                    categoryRefs.current['Offers'] = el
                  } else {
                    delete categoryRefs.current['Offers']
                  }
                }}
                data-store-section="Offers"
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
                    if (el) {
                      categoryRefs.current[category] = el
                    } else {
                      delete categoryRefs.current[category]
                    }
                  }}
                  data-store-section={category}
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
