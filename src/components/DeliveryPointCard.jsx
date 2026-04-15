import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

export default function DeliveryPointCard({ point, onSelect }) {
  const { t, i18n } = useTranslation()
  const [anim, setAnim] = useState(false)
  const timerRef = useRef(null)

  const singleRestaurant = Array.isArray(point.deliveredBy) && point.deliveredBy.length === 1 ? point.deliveredBy[0] : null

  const restaurantTimeZone = singleRestaurant?.timezone || 'Europe/Athens'
  const uiLocale = (() => {
    const lang = String(i18n.resolvedLanguage || i18n.language || 'en').toLowerCase()
    if (lang.startsWith('it')) return 'it-IT'
    return 'en-US'
  })()

  const parseTimeToMinutes = (value) => {
    if (!value) return null
    const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
    return hours * 60 + minutes
  }

  const formatDisplayTime = (value) => {
    const minutes = parseTimeToMinutes(value)
    if (minutes == null) return value
    const date = new Date(Date.UTC(2020, 0, 1, 0, 0, 0))
    date.setUTCMinutes(minutes)
    return new Intl.DateTimeFormat(uiLocale, {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: minutes % 60 === 0 ? undefined : '2-digit',
    }).format(date)
  }

  const scheduleState = (() => {
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const now = new Date()
    const partsFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: restaurantTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      weekday: 'long',
    })
    const parts = Object.fromEntries(partsFormatter.formatToParts(now).map((part) => [part.type, part.value]))
    const currentMinutes = Number(parts.hour) * 60 + Number(parts.minute)
    const todayName = parts.weekday
    const todayIndex = weekdayNames.findIndex((name) => name === todayName)
    const openingHours = Array.isArray(singleRestaurant?.openingHours) ? singleRestaurant.openingHours : []
    const todayWindows = openingHours
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
      weekdayNames,
      openingHours,
      todayIndex,
      currentMinutes,
      activeWindow,
      nextTodayWindow,
      todayWindows,
    }
  })()

  const isRestaurantClosed = (() => {
    if (!singleRestaurant) return false
    if (scheduleState.openingHours.length > 0) return !scheduleState.activeWindow
    return singleRestaurant.isOpen === false
  })()

  const todayHours = scheduleState.activeWindow || scheduleState.nextTodayWindow

  const nextOpeningLabel = (() => {
    if (!isRestaurantClosed || scheduleState.openingHours.length === 0 || scheduleState.todayIndex === -1) return null

    for (let offset = 0; offset < 7; offset += 1) {
      const targetIndex = (scheduleState.todayIndex + offset) % 7
      const dayName = scheduleState.weekdayNames[targetIndex]
      const windows = scheduleState.openingHours
        .filter((h) => h?.day && String(h.day).toLowerCase() === dayName.toLowerCase())
        .map((h) => ({
          opensAt: h.open ?? null,
          openMinutes: parseTimeToMinutes(h.open),
        }))
        .filter((h) => h.openMinutes != null)
        .sort((a, b) => a.openMinutes - b.openMinutes)
      const nextWindow = offset === 0
        ? windows.find((h) => h.openMinutes > scheduleState.currentMinutes)
        : windows[0]
      if (!nextWindow) continue

      const formattedTime = formatDisplayTime(nextWindow.opensAt)
      if (offset === 0) return t('deliveryPoint.opensTodayAt', { time: formattedTime })
      if (offset === 1) return t('deliveryPoint.opensTomorrowAt', { time: formattedTime })

      const dayLabel = new Intl.DateTimeFormat(uiLocale, { weekday: 'long' }).format(
        new Date(Date.UTC(2020, 0, 5 + targetIndex))
      )
      return t('deliveryPoint.opensDayAt', { day: dayLabel, time: formattedTime })
    }

    if (singleRestaurant?.nextOpeningTime) {
      return t('deliveryPoint.opensAt', { time: singleRestaurant.nextOpeningTime })
    }
    if (singleRestaurant?.opensAt) {
      return t('deliveryPoint.opensAt', { time: formatDisplayTime(singleRestaurant.opensAt) })
    }

    return null
  })()

  const closedLabel = (() => {
    if (!isRestaurantClosed) return null
    if (nextOpeningLabel) return t('deliveryPoint.closedOpensAt', { nextOpening: nextOpeningLabel })
    if (singleRestaurant?.opensAt) return t('deliveryPoint.closedOpensAt', { nextOpening: t('deliveryPoint.opensAt', { time: formatDisplayTime(singleRestaurant.opensAt) }) })
    if (singleRestaurant?.nextOpeningTime) return t('deliveryPoint.closedOpensAt', { nextOpening: t('deliveryPoint.opensAt', { time: singleRestaurant.nextOpeningTime }) })
    if (todayHours?.opensAt) return t('deliveryPoint.closedOpensAt', { nextOpening: t('deliveryPoint.opensAt', { time: formatDisplayTime(todayHours.opensAt) }) })
    return t('deliveryPoint.restaurantClosed')
  })()

  const pointImageSrc = point?.image
    ? `${import.meta.env.VITE_API_BASE}/images/${point.image}`
    : null

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
      className={`flex h-full w-full max-w-[280px] flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white transition-all active:scale-[0.98] shadow-sm hover:shadow-md cursor-pointer ${
        anim
          ? 'ring-2 ring-orange-300 border-orange-400'
          : 'hover:border-orange-200 active:border-orange-300'
      }`}
    >
      <div className="relative w-full aspect-[4/3] bg-slate-100">
        {pointImageSrc ? (
          <img
            className="absolute inset-0 w-full h-full object-cover"
            src={pointImageSrc}
            alt={point.name}
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 bg-orange-200 p-3">
        <div className="font-bold text-lg text-slate-900 truncate">
          {point.name}
        </div>
        {isRestaurantClosed ? (
          <div className="text-sm text-red-600 font-medium flex items-center gap-1">
            <span>🕐</span>
            <span>{closedLabel}</span>
          </div>
        ) : point.isActive === false ? (
          <div className="text-sm text-orange-600 font-medium flex items-center gap-1">
            <span>⚠️</span>
            <span>{t('deliveryPoint.temporarilyClosed')}</span>
          </div>
        ) : null}

        {singleRestaurant && (
          <div className="mt-0.5 flex flex-1 flex-col gap-1 border-t border-slate-300 pt-1.5 text-sm text-slate-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                {t('deliveryPoint.deliveryFee')}: <strong className="text-slate-800">{singleRestaurant.deliveryFee}€</strong>
              </span>
              {(() => {
                const fee = parseFloat(singleRestaurant.deliveryFee) || 0
                const from = parseFloat(singleRestaurant.minOrder) || 0
                if (fee <= 0 || from <= 0) return null
                return (
                  <span>
                    <strong className="text-slate-800">
                      {t('deliveryPoint.freeDeliveryOver', { amount: from.toFixed(2) })}
                    </strong>
                  </span>
                )
              })()}
            </div>
            {todayHours?.closesAt != null && !isRestaurantClosed && (
              <span>
                {t('deliveryPoint.closesAt', { time: formatDisplayTime(todayHours.closesAt) })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
