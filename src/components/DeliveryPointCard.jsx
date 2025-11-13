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
    <div className={`flex items-center gap-4 p-4 lg:p-6 rounded-lg border border-gray-200 bg-white w-full transition-transform duration-150 ${anim ? 'scale-95 ring-2 ring-sky-100' : 'hover:scale-[1.01]'}`}>
      <img className="w-20 h-20 lg:w-32 lg:h-32 rounded-md object-cover" src={point.image} alt={point.name} />
      <div className="flex-1 text-left">
        <div className="font-semibold text-lg lg:text-2xl">{point.name}</div>
      </div>
      <div className="text-right">
        <button
          onClick={handleChoose}
          disabled={anim}
          className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-500 text-white rounded-md font-semibold hover:bg-gray-600 lg:text-lg disabled:opacity-60"
        >
          Choose
        </button>
      </div>
    </div>
  )
}
