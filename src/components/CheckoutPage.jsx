import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { formatPrice } from '../utils/price'
import { useAlert } from '../context/AlertContext'
import { orderService } from '../services'

const CHECKOUT_FORM_KEY = 'checkout_form'

function getStoredCheckoutForm() {
  try {
    const s = localStorage.getItem(CHECKOUT_FORM_KEY)
    if (s) {
      const o = JSON.parse(s)
      return {
        name: typeof o.name === 'string' ? o.name : '',
        phone: typeof o.phone === 'string' ? o.phone : '',
        email: typeof o.email === 'string' ? o.email : '',
        notes: typeof o.notes === 'string' ? o.notes : '',
      }
    }
  } catch {
    /* ignore */
  }
  return { name: '', phone: '', email: '', notes: '' }
}

export default function CheckoutPage({ restaurant, deliveryLocation, cart, total, onClose, updateQty, removeItem, onConfirm }) {
  const { t } = useTranslation()
  const [promo, setPromo] = useState('')
  const [agree, setAgree] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState(() => getStoredCheckoutForm().name)
  const [customerPhone, setCustomerPhone] = useState(() => getStoredCheckoutForm().phone)
  const [customerEmail, setCustomerEmail] = useState(() => getStoredCheckoutForm().email)
  const [notes, setNotes] = useState(() => getStoredCheckoutForm().notes)
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(null)
  const [deliveryTimeError, setDeliveryTimeError] = useState(null)
  const [deliveryTimeLoading, setDeliveryTimeLoading] = useState(false)
  const [timeChangedConfirm, setTimeChangedConfirm] = useState(null) // { newTimeslot }
  const [insufficientStock, setInsufficientStock] = useState(null) // { message, products: [{ productId, productName, available, requested }] }
  const [paymentMethod, setPaymentMethod] = useState('CASH') // 'CASH' | 'CARD' | 'ONLINE'
  const [touched, setTouched] = useState({ name: false, phone: false, email: false, notes: false })
  const [dirty, setDirty] = useState({ name: false, phone: false, email: false, notes: false })
  const { showAlert } = useAlert()

  const setFieldTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))
  const setFieldDirty = (field) => () => setDirty((prev) => ({ ...prev, [field]: true }))

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors = {
    name: !customerName.trim() ? t('checkout.errorName') : null,
    phone: !customerPhone.trim() ? t('checkout.errorPhone') : null,
    email: !customerEmail.trim() ? t('checkout.errorEmail') : !emailRegex.test(customerEmail.trim()) ? t('checkout.errorEmailInvalid') : null,
    notes: null,
  }
  const showError = (field) => touched[field] && errors[field]
  const formValid = Boolean(customerName.trim() && customerPhone.trim() && customerEmail.trim() && emailRegex.test(customerEmail.trim()))

  // Persist checkout form until order is placed or page is closed
  useEffect(() => {
    try {
      localStorage.setItem(
        CHECKOUT_FORM_KEY,
        JSON.stringify({
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          notes: notes,
        })
      )
    } catch {
      /* ignore */
    }
  }, [customerName, customerPhone, customerEmail, notes])

  const fetchDeliveryTimeFromApi = async () => {
    if (!restaurant?.id || !deliveryLocation?.id) return null
    const API_BASE = import.meta.env.VITE_API_BASE
    const response = await fetch(
      `${API_BASE}/public/delivery-time?restaurantId=${restaurant.id}&deliveryLocationId=${deliveryLocation.id}`
    )
    if (!response.ok) throw new Error('Failed to fetch delivery time')
    return response.json()
  }

  const parseTimeslot = (data) => {
    if (!data?.timeslot?.start) return null
    const startDate = new Date(data.timeslot.start)
    const endDate = data.timeslot.end ? new Date(data.timeslot.end) : null
    return {
      start: startDate,
      end: endDate,
      timezone: data.timeslot.timezone || 'Europe/Athens'
    }
  }

  const areTimeslotsEqual = (a, b) => {
    if (!a || !b) return false
    const aStart = a.start?.getTime?.()
    const bStart = b.start?.getTime?.()
    const aEnd = a.end?.getTime?.()
    const bEnd = b.end?.getTime?.()
    return aStart === bStart && (aEnd == null && bEnd == null ? true : aEnd === bEnd)
  }

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
          
          // Store the timeslot information with timezone for locale-aware display
          setEstimatedDeliveryTime({
            start: startDate,
            end: endDate,
            minutes: minutesUntilDelivery,
            timezone: data.timeslot.timezone || 'Europe/Athens'
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

    const grouped = new Map()
    for (const sel of selections) {
      const groupLabel = sel?.groupName || (sel?.groupId !== undefined ? `${t('common.group')} ${sel.groupId}` : t('common.selected'))
      const itemLabel = sel?.selectedItemName || (sel?.selectedItemId !== undefined ? `${t('common.item')} ${sel.selectedItemId}` : t('common.item'))
      if (!grouped.has(groupLabel)) grouped.set(groupLabel, [])
      grouped.get(groupLabel).push(itemLabel)
    }

    return Array.from(grouped.entries())
      .map(([groupLabel, items]) => `${groupLabel}: ${items.join(', ')}`)
      .join(' • ')
  }

  const submitOrder = async () => {
    try {
      if (paymentMethod === 'ONLINE') {
        // Pay online via Stripe
        const API_BASE = import.meta.env.VITE_API_BASE
        const amountCents = Math.round(finalTotal * 100)
        const payRes = await fetch(`${API_BASE}/payments/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountCents }),
        })
        const payData = await payRes.json()
        if (!payRes.ok) {
          throw new Error(payData?.message || 'Payment checkout failed')
        }
        if (payData?.url) {
          try {
            localStorage.removeItem(CHECKOUT_FORM_KEY)
          } catch {
            /* ignore */
          }
          onClose()
          onConfirm && onConfirm()
          window.location.href = payData.url
          return
        }
        throw new Error('No payment URL returned')
      }

      // CASH / CARD: create order (pay on delivery)
      const offerItems = cart.filter(item => item.isOffer)
      const offers = offerItems.map((item) => {
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

      const orderData = {
        restaurantId: restaurant?.id,
        deliveryLocationId: deliveryLocation?.id,
        paymentMethod,
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

      const response = await orderService.create(orderData)
      const token = response?.token || response?.data?.token
      try {
        localStorage.removeItem(CHECKOUT_FORM_KEY)
      } catch {
        /* ignore */
      }
      onClose()
      onConfirm && onConfirm()
      if (token) {
        window.location.href = `/orders/status/${token}?confirmed=1`
      } else {
        showAlert('success', t('checkout.orderConfirmed'), t('checkout.orderPlaced'), 10000)
      }
    } catch (error) {
      const data = error.response?.data
      if (data?.message && Array.isArray(data?.products) && data.products.length > 0) {
        setInsufficientStock({ message: data.message, products: data.products })
      } else {
        showAlert('error', t('checkout.orderFailed'), data?.message || error.message || t('checkout.somethingWrong'), 10000)
      }
      setIsSubmitting(false)
    }
  }

  const handleAcceptInsufficientStock = () => {
    if (!insufficientStock?.products?.length) {
      setInsufficientStock(null)
      setIsSubmitting(false)
      return
    }
    for (const product of insufficientStock.products) {
      const cartItemsWithProduct = cart.filter((it) => !it.isOffer && Number(it.id) === Number(product.productId))
      cartItemsWithProduct.forEach((item, index) => {
        const newQty = index === 0 ? Math.max(0, Number(product.available)) : 0
        updateQty(item.key, newQty)
      })
    }
    setInsufficientStock(null)
    setIsSubmitting(false)
  }

  const handleContinue = async () => {
    if (!agree) return

    if (!customerName.trim()) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorName'), 5000)
      return
    }
    if (!customerPhone.trim()) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorPhone'), 5000)
      return
    }
    if (!customerEmail.trim()) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorEmail'), 5000)
      return
    }
    const emailTrimmed = customerEmail.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailTrimmed)) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorEmailInvalid'), 5000)
      return
    }
    setIsSubmitting(true)
    try {
      if (paymentMethod === 'CASH' || paymentMethod === 'CARD') {
        await submitOrder()
        return
      }

      // ONLINE: verify delivery time then redirect to Stripe
      const data = await fetchDeliveryTimeFromApi()

      if (data?.error) {
        showAlert('error', t('checkout.deliveryTime'), data.error, 5000)
        setIsSubmitting(false)
        return
      }

      const newTimeslot = parseTimeslot(data)
      if (!newTimeslot) {
        showAlert('error', t('checkout.deliveryTime'), t('checkout.couldNotGetTime'), 5000)
        setIsSubmitting(false)
        return
      }

      const currentSlot = estimatedDeliveryTime ? { start: estimatedDeliveryTime.start, end: estimatedDeliveryTime.end } : null
      if (!areTimeslotsEqual(currentSlot, newTimeslot)) {
        setTimeChangedConfirm(newTimeslot)
        setIsSubmitting(false)
        return
      }

      await submitOrder()
    } catch (error) {
      showAlert('error', t('checkout.deliveryTime'), t('checkout.failedToVerifyTime'), 5000)
      setIsSubmitting(false)
    }
  }

  const handleConfirmTimeChanged = async () => {
    if (!timeChangedConfirm) return
    setEstimatedDeliveryTime({
      ...timeChangedConfirm,
      minutes: 0
    })
    setTimeChangedConfirm(null)
    setIsSubmitting(true)
    await submitOrder()
  }

  // Display in user's browser timezone (backend sends UTC)
  const formatTimeslotDisplay = (slot) => {
    if (!slot) return ''
    const opts = { hour: '2-digit', minute: '2-digit' }
    const startStr = slot.start.toLocaleTimeString(undefined, opts)
    const endStr = slot.end ? slot.end.toLocaleTimeString(undefined, opts) : null
    return endStr ? `${startStr} - ${endStr}` : startStr
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
      <div
        className="relative w-full h-full max-h-full flex flex-col bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with X top-left (like ProductDetail) */}
        <div className="relative flex-shrink-0 w-full h-14 min-h-[56px] bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center text-xl font-light hover:bg-black/80 active:bg-black/80 transition-colors"
            aria-label={t('common.close')}
          >
            ×
          </button>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className="text-lg font-bold text-slate-900">{t('checkout.yourOrder')}</h1>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-4 lg:p-6">
            {/* Restaurant & Location Info */}
            <div className="text-center mb-4 sm:mb-5">
              <div className="text-lg sm:text-xl font-bold text-orange-500">{restaurant?.name || t('common.restaurant')}</div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">{t('checkout.deliveryTo')} {deliveryLocation?.name || t('common.location')}</div>
              {deliveryTimeLoading ? (
                <div className="text-xs sm:text-sm text-slate-500 mt-2">{t('checkout.calculatingTime')}</div>
              ) : deliveryTimeError ? (
                <div className="text-xs sm:text-sm text-red-600 font-semibold mt-2">
                  ⚠️ {deliveryTimeError}
                </div>
              ) : estimatedDeliveryTime ? (
                <div className="text-xs sm:text-sm text-orange-600 font-semibold mt-2">
                  ⏱️ {formatTimeslotDisplay(estimatedDeliveryTime)}
                </div>
              ) : null}
            </div>

            {/* Customer Information Form */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">{t('checkout.customerInfo')}</div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">{t('checkout.nameRequired')}</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setFieldDirty('name')() }}
                    onBlur={setFieldTouched('name')}
                    placeholder={t('checkout.enterName')}
                    className={`w-full border px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:border-transparent ${showError('name') ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-orange-500'}`}
                    required
                  />
                  {showError('name') && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">{t('checkout.phoneRequired')}</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => { setCustomerPhone(e.target.value); setFieldDirty('phone')() }}
                    onBlur={setFieldTouched('phone')}
                    placeholder={t('checkout.enterPhone')}
                    className={`w-full border px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:border-transparent ${showError('phone') ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-orange-500'}`}
                    required
                  />
                  {showError('phone') && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">{t('checkout.emailRequired')}</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => { setCustomerEmail(e.target.value); setFieldDirty('email')() }}
                    onBlur={setFieldTouched('email')}
                    placeholder={t('checkout.enterEmail')}
                    className={`w-full border px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:border-transparent ${showError('email') ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-orange-500'}`}
                    required
                  />
                  {showError('email') && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Delivery Notes */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">{t('checkout.deliveryNotes')}</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('checkout.deliveryNotesPlaceholder')}
                className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows="2"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">{t('checkout.paymentMethod')}</div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <label
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 sm:px-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH"
                    checked={paymentMethod === 'CASH'}
                    onChange={() => setPaymentMethod('CASH')}
                    className="sr-only"
                  />
                  <span className="text-lg">💵</span>
                  <span className="font-medium text-xs sm:text-base">{t('checkout.cash')}</span>
                </label>
                <label
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 sm:px-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'CARD'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CARD"
                    checked={paymentMethod === 'CARD'}
                    onChange={() => setPaymentMethod('CARD')}
                    className="sr-only"
                  />
                  <span className="text-lg">💳</span>
                  <span className="font-medium text-xs sm:text-base">{t('checkout.card')}</span>
                </label>
                <label
                  className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 sm:px-4 rounded-lg border-2 cursor-pointer transition-all ${
                    paymentMethod === 'ONLINE'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="ONLINE"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={() => setPaymentMethod('ONLINE')}
                    className="sr-only"
                  />
                  <span className="text-lg">🌐</span>
                  <span className="font-medium text-xs sm:text-base">{t('checkout.online')}</span>
                </label>
              </div>
            </div>

            {/* Cart Items */}
            <div className="mb-4 sm:mb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">{t('checkout.orderItems')}</div>
              {cart.length === 0 ? (
                <div className="text-sm text-slate-500 py-4 text-center">{t('checkout.cartEmpty')}</div>
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
                            {t('common.extras')}: {it.extraNames.join(', ')}
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
                          aria-label={t('checkout.decreaseQty')}
                        >
                          −
                        </button>
                        <div className="w-5 sm:w-6 text-center text-sm sm:text-base font-semibold">{it.qty}</div>
                        <button 
                          onClick={() => updateQty(it.key, it.qty + 1)} 
                          className="w-7 h-7 sm:w-8 sm:h-8 text-sm sm:text-base rounded-full bg-slate-100 text-slate-700 active:bg-slate-200 transition-colors flex items-center justify-center font-semibold"
                          aria-label={t('checkout.increaseQty')}
                        >
                          +
                        </button>
                        <div className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold text-slate-900 min-w-[60px] sm:min-w-[70px] text-right">
                          {formatPrice(it.total)}
                        </div>
                        <button 
                          onClick={() => removeItem(it.key)} 
                          className="ml-1 sm:ml-2 text-base sm:text-lg text-red-500 active:opacity-70 transition-opacity"
                          aria-label={t('checkout.removeItem')}
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
                <span>{t('checkout.deliveryCosts')}</span>
                <span>{formatPrice(deliveryCost)}</span>
              </div>

              <div className="mb-3 sm:mb-4">
                <div className="text-xs sm:text-sm font-semibold mb-2 text-slate-700">{t('checkout.promoCode')}</div>
                <div className="flex gap-2">
                  <input 
                    value={promo} 
                    onChange={(e) => setPromo(e.target.value)} 
                    placeholder={t('checkout.enterCode')} 
                    className="flex-1 border border-slate-300 px-3 py-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  />
                  <button className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold active:bg-orange-600 transition-colors whitespace-nowrap">
                    {t('common.verify')}
                  </button>
                </div>
              </div>

              <div className="bg-sky-100 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 flex items-center justify-between">
                <div className="text-base sm:text-lg font-semibold text-slate-900">{t('common.total')}:</div>
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
                  {t('checkout.confirmLocation')} <span className="font-semibold">{deliveryLocation?.name || ''}</span>
                </span>
              </label>

              <p className="mt-3 text-[10px] sm:text-xs text-slate-500 leading-relaxed">
                {t('checkout.riderCall')}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer Button */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 sm:px-4 py-3 flex-shrink-0">
          <button 
            disabled={!formValid || !agree || isSubmitting || !estimatedDeliveryTime || deliveryTimeLoading || !!deliveryTimeError || !!timeChangedConfirm || !!insufficientStock} 
            onClick={handleContinue} 
            className={`w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-lg transition-all ${
              formValid && agree && !isSubmitting && estimatedDeliveryTime && !deliveryTimeLoading && !deliveryTimeError && !timeChangedConfirm && !insufficientStock
                ? 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? t('checkout.processing') : t('checkout.confirmOrder')}
          </button>
        </div>
      </div>

      {/* Time changed confirmation modal */}
      {timeChangedConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('checkout.timeChangedTitle')}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {t('checkout.timeChangedMessage', { time: formatTimeslotDisplay(timeChangedConfirm) })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setTimeChangedConfirm(null)}
                className="flex-1 py-2.5 rounded-lg font-semibold border border-slate-300 text-slate-700 active:bg-slate-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmTimeChanged}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-orange-500 text-white active:bg-orange-600"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient stock modal */}
      {insufficientStock && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{t('checkout.insufficientStock')}</h3>
            <p className="text-sm text-slate-600 mb-4">{insufficientStock.message}</p>
            <ul className="space-y-2 mb-4">
              {insufficientStock.products.map((p) => (
                <li key={p.productId} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-800">{p.productName}</span>
                  <span className="text-slate-600">
                    {t('checkout.requestedAvailable', { requested: p.requested, available: p.available })}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 mb-4">
              {t('checkout.acceptUpdateCart')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setInsufficientStock(null); setIsSubmitting(false) }}
                className="flex-1 py-2.5 rounded-lg font-semibold border border-slate-300 text-slate-700 active:bg-slate-100"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAcceptInsufficientStock}
                className="flex-1 py-2.5 rounded-lg font-semibold bg-orange-500 text-white active:bg-orange-600"
              >
                {t('common.accept')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
