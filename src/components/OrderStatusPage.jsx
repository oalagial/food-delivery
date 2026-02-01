import { useState, useEffect } from 'react'
import { orderService } from '../services'
import { formatPrice } from '../utils/price'

const API_BASE = import.meta.env.VITE_API_BASE

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: '⏳' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: '✓' },
  PREPARING: { label: 'Preparing', color: 'bg-indigo-100 text-indigo-800', icon: '👨‍🍳' },
  READY: { label: 'Ready', color: 'bg-teal-100 text-teal-800', icon: '📦' },
  DELIVERING: { label: 'On the way', color: 'bg-orange-100 text-orange-800', icon: '🚗' },
  DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: '✅' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: '✕' },
}

function imageUrl(img) {
  if (!img) return null
  if (img.startsWith('http')) return img
  return `${API_BASE}/images/${img}`
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function OrderStatusPage({ token }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    setError(null)
    orderService
      .getByToken(token)
      .then((data) => {
        if (!cancelled) setOrder(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load order')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-orange-100 mb-4 animate-pulse">
            <span className="text-2xl">⏳</span>
          </div>
          <p className="text-slate-600 font-medium">Loading your order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Order not found</h2>
          <p className="text-slate-600 mb-6">{error || 'This order could not be loaded.'}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition-all"
          >
            ← Back to home
          </a>
        </div>
      </div>
    )
  }

  const statusInfo = STATUS_CONFIG[order.status] || {
    label: order.status,
    color: 'bg-slate-100 text-slate-800',
    icon: '📋',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-amber-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 active:opacity-80 transition-colors"
              aria-label="Back to home"
            >
              ←
            </a>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">Order #{order.token?.slice(0, 8)}</h1>
              <p className="text-sm text-white/90 truncate">{order.restaurant?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-8 pt-4 space-y-4">
        {/* Status card */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-sm font-medium text-slate-500">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                <span>{statusInfo.icon}</span>
                {statusInfo.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 block">Ordered</span>
                <span className="font-medium text-slate-800">{formatDate(order.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Delivery time</span>
                <span className="font-medium text-slate-800">{formatTime(order.deliveryTime)}</span>
              </div>
            </div>
            {order.notes && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <span className="text-slate-500 text-sm block">Notes</span>
                <p className="text-slate-800 text-sm">{order.notes}</p>
              </div>
            )}
          </div>
        </section>

        {/* Delivery & customer */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Delivery</h3>
              <p className="font-semibold text-slate-800">{order.deliveryLocation?.name}</p>
              {order.deliveryLocation?.address && (
                <p className="text-sm text-slate-600">{order.deliveryLocation.address}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Customer</h3>
              <p className="font-semibold text-slate-800">{order.customer?.name}</p>
              <p className="text-sm text-slate-600">{order.customer?.phone}</p>
              {order.customer?.email && (
                <p className="text-sm text-slate-600">{order.customer.email}</p>
              )}
            </div>
          </div>
        </section>

        {/* Order items */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Your order</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {(order.products || []).map((item) => (
              <div key={item.id || item.name} className="p-4 sm:p-5 flex gap-3">
                {item.image && (
                  <img
                    src={imageUrl(item.image)}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">× {item.quantity}</p>
                  <p className="text-sm font-semibold text-orange-600 mt-1">{formatPrice(item.total)}</p>
                </div>
              </div>
            ))}
            {(order.offers || []).map((offer) => (
              <div key={offer.id} className="p-4 sm:p-5">
                <div className="flex gap-3">
                  {offer.image && (
                    <img
                      src={imageUrl(offer.image)}
                      alt=""
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover flex-shrink-0 bg-slate-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{offer.name}</p>
                    <p className="text-sm text-slate-500">× {offer.quantity}</p>
                    {(offer.groups || []).map((g) => (
                      <p key={g.groupId} className="text-xs text-slate-600 mt-1">
                        {g.groupName}: {g.selectedItem?.name}
                      </p>
                    ))}
                    <p className="text-sm font-semibold text-orange-600 mt-2">{formatPrice(offer.total)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Totals */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 space-y-2">
            {order.deliveryFee != null && order.deliveryFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Delivery fee</span>
                <span className="font-medium">{formatPrice(order.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-medium">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-100">
              <span className="text-slate-800">Total</span>
              <span className="text-orange-600">{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-1">
              <span>Payment: {order.paymentMethod || '—'}</span>
              <span>{order.paymentStatus || '—'}</span>
            </div>
          </div>
        </section>

        {/* Order again */}
        <a
          href="/"
          className="block w-full py-4 text-center font-semibold rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] transition-all shadow-md"
        >
          Order again
        </a>
      </main>
    </div>
  )
}
