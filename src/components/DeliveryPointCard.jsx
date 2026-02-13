import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function DeliveryPointCard({ point, onSelect }) {
  const { t } = useTranslation()
  const [anim, setAnim] = useState(false)
  const timerRef = useRef(null)

  // Check if restaurant is closed (when deliveredBy has only one restaurant)
  // This has priority over location isActive status
  // Use isOpen property from deliveredBy array
  const isRestaurantClosed = (() => {
    if (Array.isArray(point.deliveredBy) && point.deliveredBy.length === 1) {
      const restaurant = point.deliveredBy[0]
      return restaurant.isOpen === false
    }
    return false
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
      className={`flex items-center gap-3 p-3 rounded-xl border-2 bg-white w-full transition-all active:scale-[0.98] ${
        anim 
          ? 'ring-2 ring-orange-300 border-orange-400' 
          : 'border-slate-200 active:border-orange-300'
      }`}
    >
      <div className="relative flex-shrink-0">
        <img 
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg" 
          src={point.image} 
          alt={point.name} 
        />
        <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
          📍
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 mb-0.5 truncate">
          {point.name}
        </div>
        {isRestaurantClosed ? (
          <div className="text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1">
            <span>🕐</span>
            <span>{t('deliveryPoint.restaurantClosed')}</span>
          </div>
        ) : point.isActive === false ? (
          <div className="text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-1">
            <span>⚠️</span>
            <span>{t('deliveryPoint.temporarilyClosed')}</span>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
            <span>⚡</span>
            <span>{t('deliveryPoint.fastDelivery')}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleChoose()
          }}
          disabled={anim}
          className="px-4 py-2 sm:px-5 sm:py-2.5 bg-orange-500 text-white rounded-lg font-semibold text-xs sm:text-sm shadow-md active:bg-orange-600 active:scale-95 transition-all disabled:opacity-60"
        >
          {t('deliveryPoint.choose')}
        </button>
      </div>
    </div>
  )
}
