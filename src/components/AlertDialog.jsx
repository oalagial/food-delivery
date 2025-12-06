import { useEffect } from 'react'

export default function AlertDialog({ type = 'success', title, message, isOpen, onClose, autoCloseDuration = 5000 }) {
  useEffect(() => {
    if (!isOpen || !autoCloseDuration) return
    const timer = setTimeout(onClose, autoCloseDuration)
    return () => clearTimeout(timer)
  }, [isOpen, autoCloseDuration, onClose])

  if (!isOpen) return null

  const bgColor = type === 'success' ? 'bg-green-50' : 'bg-red-50'
  const borderColor = type === 'success' ? 'border-green-200' : 'border-red-200'
  const titleColor = type === 'success' ? 'text-green-800' : 'text-red-800'
  const messageColor = type === 'success' ? 'text-green-700' : 'text-red-700'
  const iconBg = type === 'success' ? 'bg-green-100' : 'bg-red-100'
  const icon = type === 'success' ? '✓' : '✕'
  const iconColor = type === 'success' ? 'text-green-600' : 'text-red-600'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={`relative ${bgColor} border ${borderColor} rounded-lg shadow-lg max-w-md lg:max-w-lg w-full p-8 lg:p-10 animate-fade-in`}>
        <div className="flex items-start gap-5">
          <div className={`${iconBg} w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center flex-shrink-0`}>
            <span className={`${iconColor} text-3xl lg:text-4xl font-bold`}>{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className={`text-xl lg:text-2xl font-semibold ${titleColor}`}>{title}</h3>
            <p className={`text-base lg:text-lg ${messageColor} mt-2`}>{message}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl lg:text-4xl">×</button>
        </div>
      </div>
    </div>
  )
}
