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
    <div className={`flex items-center gap-5 lg:gap-7 p-5 lg:p-8 rounded-2xl border-2 bg-white/90 backdrop-blur-sm w-full transition-all duration-300 shadow-lg hover:shadow-2xl ${
      anim 
        ? 'scale-95 ring-4 ring-orange-200 border-orange-300 shadow-xl' 
        : 'hover:scale-[1.02] border-orange-200/50 hover:border-orange-300'
    }`}>
      <div className="relative">
        <img className="w-24 h-24 lg:w-40 lg:h-40 rounded-xl object-cover shadow-md ring-2 ring-orange-100" src={point.image} alt={point.name} />
        <div className="absolute -top-2 -right-2 bg-gradient-to-br from-orange-100 to-amber-400 text-white text-xs lg:text-sm px-2 py-1 lg:px-3 lg:py-1.5 rounded-full font-bold shadow-md">
          📍
        </div>
      </div>
      <div className="flex-1 text-left">
        <div className="font-bold text-xl lg:text-3xl text-gray-800 mb-1">{point.name}</div>
        <div className="text-sm lg:text-base text-amber-600 font-semibold flex items-center gap-1">
          <span>⚡</span>
          <span>Fast Delivery Available</span>
        </div>
      </div>
      <div className="text-right">
        <button
          onClick={handleChoose}
          disabled={anim}
          className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-base lg:text-xl shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-amber-700 disabled:opacity-60 transition-all duration-300 transform hover:scale-105"
        >
          Choose
        </button>
      </div>
    </div>
  )
}
