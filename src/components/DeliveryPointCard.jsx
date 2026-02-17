import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function DeliveryPointCard({ point, onSelect }) {
  const { t } = useTranslation()
  const [anim, setAnim] = useState(false)
  const timerRef = useRef(null)

  const singleRestaurant = Array.isArray(point.deliveredBy) && point.deliveredBy.length === 1 ? point.deliveredBy[0] : null

  // Check if restaurant is closed (when deliveredBy has only one restaurant)
  const isRestaurantClosed = singleRestaurant ? singleRestaurant.isOpen === false : false

  // Today's closing time (current day) from openingHours
  const todayClosesAt = (() => {
    if (!singleRestaurant?.openingHours?.length) return null
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const todayName = dayNames[new Date().getDay()]
    const todayHours = singleRestaurant.openingHours.find(
      (h) => h?.day && String(h.day).toLowerCase() === todayName.toLowerCase()
    )
    return todayHours?.close ?? null
  })()

  useEffect(() => {
    return () => {
      try {
        if (timerRef.current) clearTimeout(timerRef.current)
      } catch {
        // ignore
      }
    }
  }, [])

  function handleChoose() {
    setAnim(true)
    try {
      if (timerRef.current) clearTimeout(timerRef.current)
    } catch {
      /* ignore */
    }
    timerRef.current = setTimeout(() => {
      setAnim(false)
      onSelect(point)
    }, 180)
  }

  return (
    <div
      onClick={handleChoose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleChoose() } }}
      className={`overflow-hidden rounded-xl border-2 border-slate-200 bg-white w-full max-w-[280px] transition-all active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer ${
        anim
          ? 'ring-2 ring-orange-300 border-orange-400'
          : 'hover:border-orange-200 active:border-orange-300'
      }`}
    >
      <div className="relative w-full aspect-[4/3] bg-slate-100">
        <img
          className="absolute inset-0 w-full h-full object-cover"
          src={`${import.meta.env.VITE_API_BASE}/images/${point.image}`}
          alt={point.name}
        />
      </div>

      <div className="p-3 flex flex-col gap-1.5 bg-slate-100">
        <div className="font-bold text-lg text-slate-900 truncate">
          {point.name}
        </div>
        {isRestaurantClosed ? (
          <div className="text-sm text-red-600 font-medium flex items-center gap-1">
            <span>🕐</span>
            <span>{t('deliveryPoint.restaurantClosed')}</span>
          </div>
        ) : point.isActive === false ? (
          <div className="text-sm text-red-600 font-medium flex items-center gap-1">
            <span>⚠️</span>
            <span>{t('deliveryPoint.temporarilyClosed')}</span>
          </div>
        ) : null}

        {singleRestaurant && (
          <div className="flex flex-col gap-1 text-sm text-slate-600 pt-1.5 mt-0.5 border-t border-slate-200">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {t('deliveryPoint.minOrder')}: <strong className="text-slate-800">{singleRestaurant.minOrder}€</strong>
              </span>
              <span>
                {t('deliveryPoint.deliveryFee')}: <strong className="text-slate-800">{singleRestaurant.deliveryFee}€</strong>
              </span>
            </div>
            {todayClosesAt != null && (
              <span>
                {t('deliveryPoint.closesAt', { time: todayClosesAt })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
