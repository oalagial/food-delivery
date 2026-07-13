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

export default function StorePage({
  point,
  deliveryLocation,
  deliveryLocations = [],
  onChangeDeliveryLocation,
  cartCount = 0,
  menu,
  categories,
  offers = [],
  activeCategory,
  setActiveCategory,
  onBack,
  addToCart,
}) {
  const { t } = useTranslation()
  const [selectedProductDetail, setSelectedProductDetail] = useState(null)
  const [selectedOfferDetail, setSelectedOfferDetail] = useState(null)
  const [locationSheetOpen, setLocationSheetOpen] = useState(false)
  const categoryRefs = useRef({})
  const productsContainerRef = useRef(null)
  const tabsRowRef = useRef(null)
  const heroImageRef = useRef(null)
  const scrollTargetRef = useRef(null) // όταν πατήθηκε pill, αγνοούμε scroll μέχρι να σταματήσει
  /** Fallback height for sticky category row (used before first layout). */
  const STICKY_TABS_OFFSET = 52
  const [visibleCategory, setVisibleCategory] = useState(offers.length > 0 ? 'Offers' : categories[0])
  const isLocationInactive = deliveryLocation?.isActive === false
  const removeProductIngredients = point?.config?.removeProductIngredients === true

  // Prevent nested scrollbars (lock page scroll; only the store list scrolls).
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [])

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
  }, [point?.id])

  const floatingLang = useFloatingLanguageControl()
  const setFloatingLanguageHidden = floatingLang?.setFloatingLanguageHidden
  useEffect(() => {
    if (!setFloatingLanguageHidden) return
    setFloatingLanguageHidden(true)
    return () => setFloatingLanguageHidden(false)
  }, [setFloatingLanguageHidden])

  // Close location sheet on Escape
  useEffect(() => {
    if (!locationSheetOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setLocationSheetOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [locationSheetOpen])

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

  const stickyStackOffset = () => {
    const tabsH = tabsRowRef.current?.offsetHeight ?? STICKY_TABS_OFFSET
    // Aim to align section headers right under the sticky row.
    // Slightly undercut the height so we don't stop "too early" (leaving the section lower on screen).
    return Math.max(0, tabsH - 4)
  }

  // Detect which category is in view as user scrolls
  const handleProductsScroll = () => {
    const container = productsContainerRef.current
    if (!container) return

    const scrollTop = container.scrollTop

    if (scrollTargetRef.current) return

    const orderedKeys = [
      ...(offers.length > 0 ? ['Offers'] : []),
      ...categories,
    ]
    let currentVisible = orderedKeys[0]
    const spyPad = stickyStackOffset() + 2
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
        // Sections live inside wrappers with padding-top (pt-4). Subtract a bit extra so the header
        // snaps right under the sticky category pills without leaving a visible gap.
        const targetScrollTop = Math.max(0, rawTop - stickyStackOffset() - 16)
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
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain bg-app-bg [-webkit-overflow-scrolling:touch]"
      >
        {/* Header / hero */}
        <div className="relative w-full bg-app-surface">
          <div
            className="px-3 pt-3"
          >
            <div
              ref={heroImageRef}
              className="relative h-44 w-full overflow-hidden rounded-[24px] shadow-[0_10px_30px_-12px_rgba(15,23,42,0.35)] sm:h-52"
            >
              <div
                className="absolute inset-0 scale-105 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-black/5" aria-hidden="true" />
            </div>
          </div>
          {/* No top controls (serious). Controls live in bottom menu. */}

          <div className="relative z-20 mx-auto flex max-w-lg flex-col items-center px-4 pb-3 pt-0">
            <div className="relative z-30 -mt-10 flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-[0_10px_40px_-4px_rgba(15,23,42,0.18)] sm:-mt-11 sm:h-[5.5rem] sm:w-[5.5rem] sm:rounded-[1.125rem]">
              <img
                src={logoLoadFailed ? logo : restaurantLogoUrl}
                alt=""
                className="max-h-[78%] max-w-[78%] object-contain object-center"
                loading="eager"
                decoding="async"
                onError={() => setLogoLoadFailed(true)}
              />
            </div>
            <h1 className="mt-3 max-w-[min(100%,18rem)] text-center text-base font-semibold leading-tight tracking-tight text-app-text sm:mt-3.5 sm:max-w-[22rem] sm:text-lg">
              {point?.name}
            </h1>
            {deliveryLocation?.name ? (
              <p className="mt-1.5 max-w-[min(100%,22rem)] text-center text-[11px] leading-snug text-app-muted sm:text-xs">
                <span className="text-app-muted/80">{t('checkout.deliveryTo')}</span>{' '}
                <span className="font-medium text-app-text/80">{deliveryLocation.name}</span>
              </p>
            ) : null}
            <div className="mt-2 w-full max-w-sm space-y-1 text-center text-xs leading-relaxed text-app-muted sm:text-sm">
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                {ratingText != null && (
                  <>
                    <span className="inline-flex items-center gap-0.5 font-medium text-app-text/80">
                      {ratingText}
                    </span>
                    <span className="text-app-border" aria-hidden>
                      ·
                    </span>
                  </>
                )}
                <span className="font-semibold text-app-text/90">{isLocationInactive ? t('store.deliveryUnavailable') : openLabel}</span>
              </p>
              <p className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-app-text/90">{t('store.deliveryFee', { fee: deliveryFee })}</span>
                </span>
                {showFreeDeliveryHint ? (
                  <>
                    <span className="text-app-border" aria-hidden>
                      ·
                    </span>
                    <span className="font-semibold text-app-text/90">{t('store.freeDeliveryOver', { amount: freeDeliveryFromDisplay })}</span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky categories menu (always visible) */}
        <div className="sticky top-0 z-30 bg-app-bg/60 px-3 pt-3 backdrop-blur supports-[backdrop-filter]:bg-app-bg/40">
          <div
            ref={tabsRowRef}
            className="mx-auto flex max-w-lg items-center gap-2 overflow-x-auto rounded-2xl border border-app-border bg-app-surface/95 px-2 py-2 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)] scrollbar-hide supports-[backdrop-filter]:bg-app-surface/80 supports-[backdrop-filter]:backdrop-blur-sm"
          >
            {offers.length > 0 && (
              <button
                type="button"
                data-store-category="Offers"
                onClick={() => scrollToCategory('Offers')}
                className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors sm:h-10 sm:text-sm ${
                  visibleCategory === 'Offers'
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-transparent text-app-text/80 hover:bg-app-surface2 active:bg-brand-50'
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
                className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-colors sm:h-10 sm:text-sm ${
                  visibleCategory === c
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-transparent text-app-text/80 hover:bg-app-surface2 active:bg-brand-50'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="pb-28">
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
                className="mb-3 pb-3 border-b border-app-border"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                  <h2 className="text-base font-semibold tracking-tight text-app-text">{t('store.specialOffers')}</h2>
                </div>
              </div>
              <div className="space-y-3">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => setSelectedOfferDetail(offer)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedOfferDetail(offer)
                  }}
                  className="group relative flex gap-3 rounded-2xl border border-app-border bg-sky-50/60 p-3 shadow-sm transition-colors hover:bg-sky-50/80 active:bg-brand-50 cursor-pointer"
                >
                  {offer.image ? (
                    <img src={offer.image} alt={offer.name} className="h-20 w-20 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-20 w-20 flex-shrink-0 rounded-xl bg-app-surface2" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-900">
                      {t('common.offer')}
                    </span>
                    <div className="mt-1 pr-14 text-sm font-semibold leading-snug tracking-tight text-app-text line-clamp-2">
                      {offer.name}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-app-text">€ {parseFloat(offer.price || 0).toFixed(2)}</div>
                    {offer.description ? (
                      <p className="mt-1 line-clamp-2 pr-14 text-xs leading-snug text-app-muted">{offer.description}</p>
                    ) : null}
                  </div>
                  <button
                    disabled={cannotAddToCart}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!cannotAddToCart) setSelectedOfferDetail(offer)
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-colors ${
                      cannotAddToCart
                        ? 'border-app-border bg-app-surface2 text-app-muted cursor-not-allowed'
                        : 'border-brand-200 bg-app-surface text-brand-700 hover:bg-brand-50 active:bg-brand-100'
                    }`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </div>
              ))}
              </div>
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
                  className="mb-3 pb-3 border-b border-app-border"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
                    <h2 className="text-base font-semibold tracking-tight text-app-text">{category}</h2>
                  </div>
                </div>
              )}
              <div className="space-y-3">
              {menu[category] && menu[category].map((item) => {
                const original = item._original || {}
                const labelIcons = getProductLabelIcons(item.labels || original.labels)
                const isInactive = original.isAvailable === false || original.isActive === false
                const isOutOfStock = item.stockQuantity != null && Number(item.stockQuantity) === 0
                const cannotSelect = isInactive || isOutOfStock
                const description = (item.desc || original.description || original.desc || '').trim()

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
                    className={`group relative flex gap-3 rounded-2xl border border-app-border bg-sky-50/60 p-3 shadow-sm transition-colors hover:bg-sky-50/80 ${
                      cannotSelect ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:bg-brand-50'
                    }`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`h-[76px] w-[76px] flex-shrink-0 rounded-xl object-cover ${cannotSelect ? 'grayscale' : ''}`}
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1 pr-14">
                      <div className="text-[13px] font-semibold leading-snug tracking-tight text-app-text line-clamp-2">
                        {item.name}
                      </div>
                      {description ? (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-app-muted">{description}</p>
                      ) : null}
                      {labelIcons.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1">
                          {labelIcons.slice(0, 3).map((icon) =>
                            icon.src ? (
                              <img key={icon.key} src={icon.src} alt={icon.alt} title={icon.alt} className="h-5 w-5" loading="lazy" />
                            ) : (
                              <span
                                key={icon.key}
                                title={icon.alt}
                                className="inline-flex max-w-[9rem] items-center rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-semibold leading-tight text-brand-900"
                              >
                                {icon.alt}
                              </span>
                            )
                          )}
                        </div>
                      ) : null}
                      <div className="mt-2 text-sm font-semibold text-app-text">
                        {item.priceAfterDiscount ? (
                          <>
                            <span className="mr-2 text-app-muted/70 line-through">{item.originalPrice}</span>
                            <span>{item.priceAfterDiscount}</span>
                          </>
                        ) : (
                          <span>{item.price}</span>
                        )}
                      </div>
                      {isInactive ? (
                        <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wide text-red-500">{t('store.notAvailable')}</span>
                      ) : isOutOfStock ? (
                        <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wide text-brand-700/80">{t('store.outOfStock')}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={cannotSelect || cannotAddToCart}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!cannotSelect && !cannotAddToCart) setSelectedProductDetail(item)
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-colors ${
                        cannotSelect || cannotAddToCart
                          ? 'border-app-border bg-app-surface2 text-app-muted cursor-not-allowed'
                          : 'border-brand-200 bg-app-surface text-brand-700 hover:bg-brand-50 active:bg-brand-100'
                      }`}
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>
                )
              })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom menu */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-app-border bg-app-surface/95 backdrop-blur supports-[backdrop-filter]:bg-app-surface/80">
        <div className="mx-auto flex max-w-lg items-stretch justify-between px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-app-muted transition-colors hover:text-app-text/80 active:bg-app-surface2"
            aria-label="Locations"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
            <span>Locations</span>
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('ui:open-cart'))
              } catch {
                /* ignore */
              }
            }}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-app-muted transition-colors hover:text-app-text/80 active:bg-app-surface2"
            aria-label="Cart"
          >
            <span className="relative">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h15l-1.2 12H7.2L6 7z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7a3 3 0 016 0" />
              </svg>
              {cartCount > 0 ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              ) : null}
            </span>
            <span>Cart</span>
          </button>

          <button
            type="button"
            onClick={() => setLocationSheetOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-app-muted transition-colors hover:text-app-text/80 active:bg-app-surface2"
            aria-label="Change location"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21l-7-8a7 7 0 1114 0l-7 8z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
            <span>Location</span>
          </button>

          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold text-app-muted">
            <LanguageSwitcher />
            <span className="leading-none">Language</span>
          </div>
        </div>
      </nav>

      {/* Location bottom sheet */}
      {locationSheetOpen && onChangeDeliveryLocation && Array.isArray(deliveryLocations) && deliveryLocations.length > 0 ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setLocationSheetOpen(false)}
            aria-hidden
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-lg">
            <div className="rounded-t-[1.5rem] border border-app-border bg-app-surface shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="text-sm font-semibold text-app-text">Choose location</div>
                <button
                  type="button"
                  onClick={() => setLocationSheetOpen(false)}
                  className="rounded-lg px-2 py-1 text-sm font-semibold text-app-muted hover:bg-app-surface2 active:bg-brand-50"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[55vh] overflow-y-auto px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {deliveryLocations.map((p) => {
                  const active = String(p.id) === String(deliveryLocation?.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onChangeDeliveryLocation({ id: p.id, name: p.name, token: p.token })
                        setLocationSheetOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                        active ? 'bg-brand-50 text-app-text' : 'bg-transparent text-app-text hover:bg-app-surface2 active:bg-brand-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {active ? <span className="ml-3 text-brand-700">✓</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}

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
