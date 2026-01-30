import { useState, useEffect } from 'react'
import { formatPrice } from '../utils/price'
import { useAlert } from '../context/AlertContext'
import { orderService } from '../services'

export default function CheckoutPage({ restaurant, deliveryLocation, cart, total, onClose, updateQty, removeItem, onConfirm }) {
  const [promo, setPromo] = useState('')
  const [agree, setAgree] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(null)
  const [deliveryTimeError, setDeliveryTimeError] = useState(null)
  const [deliveryTimeLoading, setDeliveryTimeLoading] = useState(false)
  const { showAlert } = useAlert()

  // Calculate delivery costs based on selected delivery location
  const itemsTotal = total || 0
  // Use same fields as in StorePage header (restaurant delivery settings)
  const rawDeliveryFee = parseFloat(restaurant?.deliveryFee ?? 0) || 0
  const minOrderForFree = parseFloat(restaurant?.minOrder ?? 0) || 0
  const shouldChargeDelivery =
    rawDeliveryFee > 0 && (minOrderForFree === 0 || itemsTotal < minOrderForFree)
  const deliveryCost = shouldChargeDelivery ? rawDeliveryFee : 0
  const finalTotal = itemsTotal + deliveryCost

  // Fetch estimated delivery time when restaurant and delivery location are available
  useEffect(() => {
    const fetchDeliveryTime = async () => {
      if (!restaurant?.id || !deliveryLocation?.id) {
        return
      }

      setDeliveryTimeLoading(true)
      setDeliveryTimeError(null)
      setEstimatedDeliveryTime(null)
      
      try {
        const API_BASE = import.meta.env.VITE_API_BASE
        const response = await fetch(
          `${API_BASE}/public/delivery-time?restaurantId=${restaurant.id}&deliveryLocationId=${deliveryLocation.id}`
        )
        
        if (!response.ok) {
          throw new Error('Failed to fetch delivery time')
        }
        
        const data = await response.json()
        
        // Handle restaurant closed error
        if (data.error) {
          setDeliveryTimeError(data.error)
          setEstimatedDeliveryTime(null)
          return
        }
        
        // Handle successful response with timeslot
        if (data.timeslot && data.timeslot.start) {
          const startDate = new Date(data.timeslot.start)
          const endDate = data.timeslot.end ? new Date(data.timeslot.end) : null
          const now = new Date()
          
          let minutesUntilDelivery = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60))
          
          // If start time has passed, check if we're still within the timeslot
          if (minutesUntilDelivery < 0) {
            if (endDate && now < endDate) {
              // We're within the delivery window, show 0 minutes
              minutesUntilDelivery = 0
            } else if (endDate) {
              // Start and end have passed, calculate from now to end (shouldn't happen but handle it)
              minutesUntilDelivery = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60))
              if (minutesUntilDelivery < 0) {
                minutesUntilDelivery = 0
              }
            } else {
              // No end time, just set to 0 if start has passed
              minutesUntilDelivery = 0
            }
          }
          
          // Store the timeslot information
          setEstimatedDeliveryTime({
            start: startDate,
            end: endDate,
            minutes: minutesUntilDelivery
          })
          setDeliveryTimeError(null)
        } else {
          setEstimatedDeliveryTime(null)
        }
      } catch (error) {
        console.error('Error fetching delivery time:', error)
        setEstimatedDeliveryTime(null)
        setDeliveryTimeError(null)
      } finally {
        setDeliveryTimeLoading(false)
      }
    }

    fetchDeliveryTime()
  }, [restaurant?.id, deliveryLocation?.id])

  const offerSelectionSummary = (it) => {
    if (!it?.isOffer) return null
    const selections = Array.isArray(it.selectedGroups) ? it.selectedGroups : []
    if (selections.length === 0) return null

    // Group by groupName (fallback to groupId)
    const grouped = new Map()
    for (const sel of selections) {
      const groupLabel = sel?.groupName || (sel?.groupId !== undefined ? `Group ${sel.groupId}` : 'Selected')
      const itemLabel = sel?.selectedItemName || (sel?.selectedItemId !== undefined ? `Item ${sel.selectedItemId}` : 'Item')
      if (!grouped.has(groupLabel)) grouped.set(groupLabel, [])
      grouped.get(groupLabel).push(itemLabel)
    }

    return Array.from(grouped.entries())
      .map(([groupLabel, items]) => `${groupLabel}: ${items.join(', ')}`)
      .join(' • ')
  }

  const handleContinue = async () => {
    if (!agree) return
    
    // Validate customer information
    if (!customerName.trim()) {
      showAlert('error', 'Validation Error', 'Please enter your name.', 5000)
      return
    }
    if (!customerPhone.trim()) {
      showAlert('error', 'Validation Error', 'Please enter your phone number.', 5000)
      return
    }
    if (!customerEmail.trim()) {
      showAlert('error', 'Validation Error', 'Please enter your email address.', 5000)
      return
    }
    
    setIsSubmitting(true)
    try {
      // Filter and prepare offers - ensure each offer with different selections is separate
      const offerItems = cart.filter(item => item.isOffer)
      const offers = offerItems.map((item) => {
        // Ensure selectedGroups is an array and properly structured
        // Filter out any invalid entries and ensure all required fields exist
        const selectedGroups = Array.isArray(item.selectedGroups) 
          ? item.selectedGroups
              .filter(group => 
                group && 
                typeof group.groupId !== 'undefined' && 
                typeof group.selectedItemId !== 'undefined'
              )
              .map(group => ({
                groupId: parseInt(group.groupId) || group.groupId,
                groupName: group.groupName || null,
                selectedItemId: parseInt(group.selectedItemId) || group.selectedItemId,
                selectedItemName: group.selectedItemName || null,
              }))
          : []
        
        return {
          offerId: item.offerId,
          quantity: item.qty || 1,
          selectedGroups: selectedGroups,
        }
      })

      // Prepare order data according to API specification
      const orderData = {
        restaurantId: restaurant?.id,
        deliveryLocationId: deliveryLocation?.id,
        paymentMethod: 'CASH',
        paymentStatus: 'UNPAID',
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
        },
        notes: notes.trim() || null,
        products: cart.filter(item => !item.isOffer).map((item) => ({
          productId: item.id,
          quantity: item.qty,
          extraIds: item.extraIds || [],
        })),
        offers: offers,
      }

      // Submit order to backend
      const response = await orderService.create(orderData)
      
      // Show success alert
      showAlert('success', 'Order Confirmed!', `Your order #${response.id || response.data?.id || 'has been'} has been successfully placed. You will receive a call from the rider shortly.`, 10000)
      
      onClose()
      onConfirm && onConfirm()
    } catch (error) {
      // Show error alert
      showAlert('error', 'Order Failed', error.response?.data?.message || error.message || 'Something went wrong. Please try again.', 10000)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between z-10 flex-shrink-0">
          <div className="text-lg sm:text-xl font-bold">Your order</div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-2xl sm:text-3xl text-slate-600 active:bg-slate-100 rounded-full transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Restaurant & Location Info */}
            <div className="text-center mb-4 sm:mb-5">
              <div className="text-lg sm:text-xl font-bold text-orange-500">{restaurant?.name || 'Restaurant'}</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">Delivery to: {deliveryLocation?.name || 'Location'}</div>
              {deliveryTimeLoading ? (
                <div className="text-xs sm:text-sm text-slate-500 mt-2">Calculating delivery time...</div>
              ) : deliveryTimeError ? (
                <div className="text-xs sm:text-sm text-red-600 font-semibold mt-2">
                  ⚠️ {deliveryTimeError}
                </div>
              ) : estimatedDeliveryTime ? (
                <div className="text-xs sm:text-sm text-orange-600 font-semibold mt-2">
                  ⏱️ {estimatedDeliveryTime.end ? (
                    <span>{estimatedDeliveryTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {estimatedDeliveryTime.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  ) : (
                    <span>{estimatedDeliveryTime.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Customer Information Form */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">Customer Information</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">Phone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">Email *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">Delivery Notes (Optional)</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Leave at the door, Ring the bell, etc."
                className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows="2"
              />
            </div>

            {/* Cart Items */}
            <div className="mb-4 sm:mb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">Order Items</div>
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">Your cart is empty</div>
              ) : (
                <div className="space-y-3">
                  {cart.map((it) => (
                    <div key={it.key} className="flex items-start gap-2 sm:gap-3 pb-3 border-b border-slate-100 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-semibold text-slate-900 leading-tight">
                          {it.name}
                          <span className="text-xs sm:text-sm text-slate-500 font-normal ml-1">({formatPrice(it.price)})</span>
                        </div>
                        {it.isOffer && offerSelectionSummary(it) && (
                          <div className="text-xs sm:text-sm text-slate-500 mt-1">
                            {offerSelectionSummary(it)}
                          </div>
                        )}
                        {(it.extraNames && it.extraNames.length > 0) && (
                          <div className="text-xs sm:text-sm text-orange-600 mt-1">
                            Extras: {it.extraNames.join(', ')}
                          </div>
                        )}
                        {it.options && Object.keys(it.options).length > 0 && (
                          <div className="text-xs sm:text-sm text-slate-500 mt-1">{Object.values(it.options).filter(v => v).join(', ')}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <button 
                          onClick={() => updateQty(it.key, Math.max(1, it.qty - 1))} 
                          className="w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base rounded-full bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors flex items-center justify-center font-semibold"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <div className="w-5 sm:w-6 text-center text-sm sm:text-base font-semibold">{it.qty}</div>
                        <button 
                          onClick={() => updateQty(it.key, it.qty + 1)} 
                          className="w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base rounded-full bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors flex items-center justify-center font-semibold"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                        <div className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-slate-900 min-w-[60px] sm:min-w-[70px] text-right">
                          {formatPrice(it.total)}
                        </div>
                        <button 
                          onClick={() => removeItem(it.key)} 
                          className="ml-1 sm:ml-2 text-base sm:text-lg text-red-500 active:opacity-70 transition-opacity"
                          aria-label="Remove item"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="border-t border-slate-200 pt-4 sm:pt-5">
              <div className="mb-3 text-xs sm:text-sm text-slate-600 flex justify-between">
                <span>Delivery costs:</span>
                <span>{formatPrice(deliveryCost)}</span>
              </div>

              <div className="mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm font-semibold mb-2 text-slate-700">Promo code</div>
                <div className="flex gap-2">
                  <input 
                    value={promo} 
                    onChange={(e) => setPromo(e.target.value)} 
                    placeholder="Enter code" 
                    className="flex-1 border border-slate-300 px-3 py-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  />
                  <button className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold active:bg-orange-600 transition-colors whitespace-nowrap">
                    Verify
                  </button>
                </div>
              </div>

              <div className="bg-sky-100 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 flex items-center justify-between">
                <div className="text-base sm:text-lg font-semibold text-slate-900">Total:</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900">{formatPrice(finalTotal)}</div>
              </div>

              <label className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={agree} 
                  onChange={(e) => setAgree(e.target.checked)} 
                  className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 flex-shrink-0 accent-orange-500" 
                />
                <span>
                  I confirm the delivery location is <span className="font-semibold">{deliveryLocation?.name || ''}</span>
                </span>
              </label>

              <p className="mt-3 text-[10px] sm:text-xs text-slate-500 leading-relaxed">
                You will receive a call from the rider immediately before delivery, to meet us at the entrance of the location.
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer Button */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 sm:px-4 py-3 flex-shrink-0">
          <button 
            disabled={!agree || isSubmitting} 
            onClick={handleContinue} 
            className={`w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-lg transition-all ${
              agree && !isSubmitting 
                ? 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
