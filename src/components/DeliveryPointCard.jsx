import { useState, useRef, useEffect } from 'react'

export default function DeliveryPointCard({ point, onSelect }) {
  const [anim, setAnim] = useState(false)
  const timerRef = useRef(null)

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
        <div className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
          <span>⚡</span>
          <span>Fast Delivery</span>
        </div>
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
          Choose
        </button>
      </div>
    </div>
  )
}
