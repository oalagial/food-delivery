import { useState, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import PhoneInputModule from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { formatPrice } from '../utils/price'
import { useAlert } from '../context/AlertContext'
import { orderService, restaurantService } from '../services'

const PhoneInput = PhoneInputModule.default || PhoneInputModule

const CHECKOUT_FORM_KEY = 'checkout_form'
const MAX_NOTES_LENGTH = 40

function getStoredCheckoutForm() {
  try {
    const s = localStorage.getItem(CHECKOUT_FORM_KEY)
    if (s) {
      const o = JSON.parse(s)
      return {
        name: typeof o.name === 'string' ? o.name : '',
        phone: typeof o.phone === 'string' ? o.phone : '',
        email: typeof o.email === 'string' ? o.email : '',
        notes: (typeof o.notes === 'string' ? o.notes : '').slice(0, MAX_NOTES_LENGTH),
        customSchedule: Boolean(o.customSchedule),
        selectedSlotEnd: typeof o.selectedSlotEnd === 'string' ? o.selectedSlotEnd : null,
        scheduleRestaurantId: o.scheduleRestaurantId ?? null,
        scheduleDeliveryLocationId: o.scheduleDeliveryLocationId ?? null,
      }
    }
  } catch {
    /* ignore */
  }
  return {
    name: '',
    phone: '',
    email: '',
    notes: '',
    customSchedule: false,
    selectedSlotEnd: null,
    scheduleRestaurantId: null,
    scheduleDeliveryLocationId: null,
  }
}

function formatYmdLocal(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const KNOWN_PAYMENT_METHODS = ['CASH', 'CARD', 'ONLINE']

const PAYMENT_METHOD_LABEL_KEY = {
  CASH: 'checkout.cash',
  CARD: 'checkout.card',
  ONLINE: 'checkout.online',
}

const PAYMENT_METHOD_EMOJI = {
  CASH: '💵',
  CARD: '💳',
  ONLINE: '🌐',
}

function paymentMethodsFromRestaurantConfig(restaurant) {
  const raw = restaurant?.config?.paymentMethods
  if (!Array.isArray(raw) || raw.length === 0) return null
  const out = []
  for (const m of raw) {
    if (typeof m !== 'string') continue
    const code = m.trim().toUpperCase()
    if (KNOWN_PAYMENT_METHODS.includes(code) && !out.includes(code)) out.push(code)
  }
  return out.length > 0 ? out : null
}

export default function CheckoutPage({
  restaurant,
  deliveryLocation,
  cart,
  total,
  onClose,
  updateQty,
  removeItem,
  onConfirm,
  onChangeDeliveryLocation,
}) {
  const { t } = useTranslation()
  const storedCheckoutForm = useMemo(() => getStoredCheckoutForm(), [])
  const restoreSavedSchedule = Boolean(storedCheckoutForm.customSchedule && storedCheckoutForm.selectedSlotEnd)
  const [promo, setPromo] = useState('')
  const [coupon, setCoupon] = useState(null) // { code, type, value, restaurantId } when valid
  const [couponError, setCouponError] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [agree, setAgree] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState(storedCheckoutForm.name)
  const [customerPhone, setCustomerPhone] = useState(storedCheckoutForm.phone)
  const [customerPhoneConfirm, setCustomerPhoneConfirm] = useState('')
  const [customerEmail, setCustomerEmail] = useState(storedCheckoutForm.email)
  const [notes, setNotes] = useState(storedCheckoutForm.notes)
  const [timeslotsPayload, setTimeslotsPayload] = useState(null)
  const [timeslotsLoading, setTimeslotsLoading] = useState(false)
  const [timeslotsError, setTimeslotsError] = useState(null)
  const [selectedSlotEnd, setSelectedSlotEnd] = useState(restoreSavedSchedule ? storedCheckoutForm.selectedSlotEnd : null)
  /** Next slot from GET /public/delivery-time (default choice) */
  const [quickSlot, setQuickSlot] = useState(null)
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickError, setQuickError] = useState(null)
  const [customSchedule, setCustomSchedule] = useState(restoreSavedSchedule)
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false)
  const [insufficientStock, setInsufficientStock] = useState(null) // { message, products: [{ productId, productName, available, requested }] }
  const [timeChangePrompt, setTimeChangePrompt] = useState(null) // { slot, useCustomSchedule, retryOnAccept }
  const [paymentMethod, setPaymentMethod] = useState(null) // null | 'CASH' | 'CARD' | 'ONLINE'
  const [touched, setTouched] = useState({ name: false, phone: false, phoneConfirm: false, email: false, notes: false, paymentMethod: false })
  const [dirty, setDirty] = useState({ name: false, phone: false, phoneConfirm: false, email: false, notes: false })
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [checkoutLocations, setCheckoutLocations] = useState([])
  const [checkoutLocationsLoading, setCheckoutLocationsLoading] = useState(false)
  const [checkoutLocationsError, setCheckoutLocationsError] = useState(null)
  const lastVerifiedSlotKeyRef = useRef(null)
  const { showAlert } = useAlert()

  const configPaymentMethods = restaurant?.config?.paymentMethods

  const availablePaymentMethods = useMemo(() => {
    const fromConfig = paymentMethodsFromRestaurantConfig({
      config: { paymentMethods: configPaymentMethods },
    })
    return fromConfig ?? [...KNOWN_PAYMENT_METHODS]
  }, [configPaymentMethods])

  useEffect(() => {
    setPaymentMethod(null)
  }, [restaurant?.id])

  useEffect(() => {
    setPaymentMethod((prev) => (prev && availablePaymentMethods.includes(prev) ? prev : null))
  }, [availablePaymentMethods])

  const setFieldTouched = (field) => () => setTouched((prev) => ({ ...prev, [field]: true }))
  const setFieldDirty = (field) => () => setDirty((prev) => ({ ...prev, [field]: true }))

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errors = {
    name: !customerName.trim() ? t('checkout.errorName') : null,
    phone: !customerPhone.trim() ? t('checkout.errorPhone') : null,
    phoneConfirm: !customerPhoneConfirm
      ? t('checkout.errorPhoneConfirmRequired')
      : customerPhoneConfirm !== customerPhone
        ? t('checkout.errorPhoneMismatch')
        : null,
    email: !customerEmail.trim() ? t('checkout.errorEmail') : !emailRegex.test(customerEmail.trim()) ? t('checkout.errorEmailInvalid') : null,
    notes: null,
  }
  const showError = (field) => touched[field] && errors[field]
  const formValid = Boolean(
    customerName.trim() &&
    customerPhone.trim() &&
    customerPhoneConfirm &&
    customerPhoneConfirm === customerPhone &&
    customerEmail.trim() &&
    emailRegex.test(customerEmail.trim())
  )

  useEffect(() => {
    setCustomerPhoneConfirm('')
  }, [customerPhone])

  useEffect(() => {
    if (!customerPhone.trim()) {
      setCustomerPhone('39')
    }
    // Run only once to set default dial code for new checkouts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          customSchedule,
          selectedSlotEnd: customSchedule ? selectedSlotEnd : null,
          scheduleRestaurantId: restaurant?.id ?? null,
          scheduleDeliveryLocationId: deliveryLocation?.id ?? null,
        })
      )
    } catch {
      /* ignore */
    }
  }, [customerName, customerPhone, customerEmail, notes, customSchedule, selectedSlotEnd, restaurant?.id, deliveryLocation?.id])

  const handleVerifyCoupon = async () => {
    const code = promo.trim()
    if (!code || !restaurant?.id) return

    const emailTrimmed = customerEmail.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailTrimmed) {
      setCouponError(t('checkout.couponEmailRequired'))
      return
    }
    if (!emailRegex.test(emailTrimmed)) {
      setCouponError(t('checkout.errorEmailInvalid'))
      return
    }

    setCouponLoading(true)
    setCouponError(null)
    setCoupon(null)
    try {
      const API_BASE = import.meta.env.VITE_API_BASE
      const url = `${API_BASE}/public/verify-coupon?code=${encodeURIComponent(code)}&restaurantId=${restaurant.id}&email=${encodeURIComponent(emailTrimmed)}`
      const response = await fetch(url)
      const data = await response.json().catch(() => ({}))
      if (response.ok && data?.code && data?.type != null && data?.value != null) {
        setCoupon({ code: data.code, type: data.type, value: String(data.value), restaurantId: data.restaurantId })
        setCouponError(null)
      } else {
        setCoupon(null)
        setCouponError(t('checkout.couponInvalid'))
      }
    } catch {
      setCoupon(null)
      setCouponError(t('checkout.couponInvalid'))
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCoupon(null)
    setCouponError(null)
  }

  // Calculate delivery costs based on selected delivery location
  const itemsTotal = total || 0
  const itemCount = cart.reduce((sum, item) => sum + Math.max(0, Number(item?.qty) || 0), 0)
  const hasOrderItems = itemCount > 0
  const rawDeliveryFee = parseFloat(restaurant?.deliveryFee ?? 0) || 0
  const freeDeliveryFrom = parseFloat(restaurant?.minOrder ?? 0) || 0

  const deliveryAppliesForSubtotal = (subtotal) =>
    rawDeliveryFee > 0 && (freeDeliveryFrom === 0 || subtotal < freeDeliveryFrom)

  // Coupon discount (items only) — must run before delivery so we can re-check free-delivery threshold
  const couponDiscountAmount = (() => {
    if (!coupon?.type || !coupon?.value) return 0
    const val = parseFloat(coupon.value) || 0
    if (coupon.type === 'PERCENTAGE') return (itemsTotal * val) / 100
    if (coupon.type === 'FIXED') return Math.min(val, itemsTotal)
    return 0
  })()

  const itemsSubtotalAfterCoupon = Math.max(0, itemsTotal - couponDiscountAmount)

  // Delivery before discount (for strikethrough total vs items-only subtotal)
  const deliveryCostBeforeDiscount = deliveryAppliesForSubtotal(itemsTotal) ? rawDeliveryFee : 0
  const totalBeforeCoupon = itemsTotal + deliveryCostBeforeDiscount

  // After coupon: re-evaluate free delivery vs net order (minOrder applies to amount after discount)
  const shouldChargeDelivery = deliveryAppliesForSubtotal(itemsSubtotalAfterCoupon)
  const deliveryCost = shouldChargeDelivery ? rawDeliveryFee : 0
  const finalTotal = Math.max(0, itemsSubtotalAfterCoupon + deliveryCost)

  const displayDeliveryWindow = useMemo(() => {
    if (customSchedule && selectedSlotEnd && timeslotsPayload?.timeslots) {
      const s = timeslotsPayload.timeslots.find((x) => x.end === selectedSlotEnd)
      if (s) return { start: new Date(s.start), end: new Date(s.end) }
    }
    if (!customSchedule && quickSlot?.start && quickSlot?.end) {
      return { start: new Date(quickSlot.start), end: new Date(quickSlot.end) }
    }
    if (customSchedule && selectedSlotEnd) {
      const endD = new Date(selectedSlotEnd)
      return { start: endD, end: endD }
    }
    return null
  }, [customSchedule, selectedSlotEnd, timeslotsPayload, quickSlot])

  const deliveryReady = customSchedule
    ? Boolean(
      selectedSlotEnd &&
      !timeslotsLoading &&
      !timeslotsError &&
      timeslotsPayload?.timeslots?.some((s) => s.end === selectedSlotEnd && s.available)
    )
    : Boolean(selectedSlotEnd && !quickLoading && !quickError && quickSlot?.end)
  const orderConfirmEnabled =
    hasOrderItems &&
    formValid &&
    agree &&
    paymentMethod &&
    availablePaymentMethods.length > 0 &&
    !isSubmitting &&
    deliveryReady &&
    !insufficientStock

  const orderConfirmBlockers = useMemo(() => {
    if (orderConfirmEnabled) return []
    const list = []
    if (isSubmitting) {
      list.push(t('checkout.blockerSubmitting'))
      return list
    }
    if (insufficientStock) list.push(t('checkout.blockerInsufficientStock'))
    if (!hasOrderItems) list.push(t('checkout.blockerEmptyCart'))
    if (availablePaymentMethods.length === 0) list.push(t('checkout.noPaymentMethods'))
    else if (!paymentMethod) list.push(t('checkout.errorPaymentMethod'))
    if (!agree) list.push(t('checkout.blockerConfirmLocation'))
    if (!formValid) {
      if (errors.name) list.push(errors.name)
      if (errors.phone) list.push(errors.phone)
      if (errors.phoneConfirm) list.push(errors.phoneConfirm)
      if (errors.email) list.push(errors.email)
    }
    if (!deliveryReady) {
      if (customSchedule) {
        if (timeslotsLoading) list.push(t('checkout.loadingTimeslots'))
        else if (timeslotsError) list.push(timeslotsError)
        else if (
          !selectedSlotEnd ||
          !timeslotsPayload?.timeslots?.some((s) => s.end === selectedSlotEnd && s.available)
        ) {
          list.push(t('checkout.selectSlotRequired'))
        }
      } else if (quickLoading) {
        list.push(t('checkout.calculatingTime'))
      } else if (quickError) {
        list.push(quickError)
      } else {
        list.push(t('checkout.couldNotGetTime'))
      }
    }
    return list
  }, [
    orderConfirmEnabled,
    isSubmitting,
    insufficientStock,
    hasOrderItems,
    availablePaymentMethods.length,
    paymentMethod,
    agree,
    formValid,
    errors.name,
    errors.phone,
    errors.phoneConfirm,
    errors.email,
    deliveryReady,
    customSchedule,
    timeslotsLoading,
    timeslotsError,
    selectedSlotEnd,
    timeslotsPayload,
    quickLoading,
    quickError,
    t,
  ])

  useEffect(() => {
    let cancelled = false
    const loadQuick = async () => {
      if (!restaurant?.id || !deliveryLocation?.id) {
        setQuickSlot(null)
        setQuickError(null)
        setQuickLoading(false)
        return
      }
      setQuickLoading(true)
      setQuickError(null)
      try {
        const data = await restaurantService.getDeliveryTimeEstimate({
          restaurantId: restaurant.id,
          deliveryLocationId: deliveryLocation.id,
        })
        if (cancelled) return
        if (data?.error) {
          setQuickError(typeof data.error === 'string' ? data.error : t('checkout.noTimeslots'))
          setQuickSlot(null)
          return
        }
        if (data?.timeslot?.end) {
          setQuickSlot({
            start: data.timeslot.start,
            end: data.timeslot.end,
            timezone: data.timeslot.timezone || 'Europe/Athens',
          })
          setQuickError(null)
        } else {
          setQuickSlot(null)
        }
      } catch (e) {
        if (cancelled) return
        console.error('Error fetching delivery time estimate:', e)
        setQuickError(t('checkout.failedToVerifyTime'))
        setQuickSlot(null)
      } finally {
        if (!cancelled) setQuickLoading(false)
      }
    }
    loadQuick()
    return () => {
      cancelled = true
    }
  }, [restaurant?.id, deliveryLocation?.id, t])

  useEffect(() => {
    if (!customSchedule) {
      if (quickSlot?.end) setSelectedSlotEnd(quickSlot.end)
      else setSelectedSlotEnd(null)
    }
  }, [customSchedule, quickSlot?.end])

  useEffect(() => {
    if (!customSchedule) {
      setTimeslotsPayload(null)
      setTimeslotsError(null)
      setTimeslotsLoading(false)
    }
  }, [customSchedule])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if ((!schedulePickerOpen && !customSchedule) || !restaurant?.id || !deliveryLocation?.id) {
        return
      }
      setTimeslotsLoading(true)
      setTimeslotsError(null)
      try {
        const todayYmd = formatYmdLocal(new Date())
        const data = await restaurantService.getDeliveryTimeslots({
          restaurantId: restaurant.id,
          deliveryLocationId: deliveryLocation.id,
          date: todayYmd,
        })
        if (cancelled) return
        if (data?.error) {
          setTimeslotsError(typeof data.error === 'string' ? data.error : t('checkout.noTimeslots'))
          setTimeslotsPayload(null)
          return
        }
        const list = Array.isArray(data?.timeslots) ? data.timeslots : []
        setTimeslotsPayload({
          timezone: data?.timezone || 'Europe/Athens',
          localDate: data?.localDate || todayYmd,
          timeslots: list,
        })
        setTimeslotsError(null)
      } catch (e) {
        if (cancelled) return
        console.error('Error fetching delivery timeslots:', e)
        setTimeslotsError(t('checkout.failedToVerifyTime'))
        setTimeslotsPayload(null)
      } finally {
        if (!cancelled) setTimeslotsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [schedulePickerOpen, customSchedule, restaurant?.id, deliveryLocation?.id, t])

  useEffect(() => {
    if (!timeslotsPayload?.timeslots?.length || !customSchedule || !selectedSlotEnd) return
    const s = timeslotsPayload.timeslots.find((x) => x.end === selectedSlotEnd)
    if (!s?.available) setSelectedSlotEnd(null)
  }, [timeslotsPayload, customSchedule, selectedSlotEnd])

  useEffect(() => {
    if (customSchedule && selectedSlotEnd) return
    lastVerifiedSlotKeyRef.current = null
  }, [customSchedule, selectedSlotEnd])

  useEffect(() => {
    if (!customSchedule || !selectedSlotEnd || !restaurant?.id || !deliveryLocation?.id) return
    const slotKey = `${restaurant.id}:${deliveryLocation.id}:${selectedSlotEnd}`
    if (lastVerifiedSlotKeyRef.current === slotKey) return

    let cancelled = false
    const verifySlotAvailability = async () => {
      try {
        const data = await restaurantService.getDeliverySlotAvailability({
          restaurantId: restaurant.id,
          deliveryLocationId: deliveryLocation.id,
          preferredDeliveryTime: selectedSlotEnd,
        })
        if (cancelled) return
        lastVerifiedSlotKeyRef.current = slotKey
        if (data?.available === true) return
        setSelectedSlotEnd(null)
        showAlert(
          'error',
          t('checkout.deliveryTime'),
          typeof data?.reason === 'string' && data.reason.trim() ? data.reason : t('checkout.slotNoLongerAvailable'),
          5000
        )
      } catch {
        if (cancelled) return
        showAlert('error', t('checkout.deliveryTime'), t('checkout.failedToVerifyTime'), 5000)
      }
    }

    verifySlotAvailability()
    return () => {
      cancelled = true
    }
  }, [customSchedule, selectedSlotEnd, restaurant?.id, deliveryLocation?.id, showAlert, t])

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
        notes: notes.trim().slice(0, MAX_NOTES_LENGTH) || null,
        products: cart.filter(item => !item.isOffer).map((item) => ({
          productId: item.id,
          quantity: item.qty,
          extraIds: item.extraIds || [],
          ...(item.removedIngredientNames?.length ? { removedIngredientNames: item.removedIngredientNames } : {}),
        })),
        offers: offers,
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
        ...(selectedSlotEnd ? { preferredDeliveryTime: selectedSlotEnd } : {}),
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
      } else if (
        typeof data?.message === 'string' &&
        /selected delivery slot is full/i.test(data.message) &&
        await handleSlotFullFallback()
      ) {
        // fetched fresh slot and opened modal
      } else if (
        promptForUpdatedTime({
          slot: extractSuggestedTimeslot(data),
          useCustomSchedule: customSchedule,
          retryOnAccept: true,
        })
      ) {
        // handled by confirmation modal
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

  const extractSuggestedTimeslot = (payload) => {
    const slot = payload?.timeslot || payload?.newTimeslot || payload?.availableTimeslot || payload?.suggestedTimeslot
    if (slot?.start && slot?.end) return slot

    if (payload?.preferredDeliveryTime) {
      const end = payload.preferredDeliveryTime
      return { start: end, end, timezone: payload?.timezone || 'Europe/Athens' }
    }

    return null
  }

  const promptForUpdatedTime = ({
    slot,
    useCustomSchedule = false,
    retryOnAccept = false,
    timeslotsList = null,
    timezone = null,
    localDate = null,
  }) => {
    if (!slot?.end) return false

    if (useCustomSchedule && Array.isArray(timeslotsList)) {
      setTimeslotsPayload({
        timezone: timezone || slot.timezone || timeslotsPayload?.timezone || 'Europe/Athens',
        localDate: localDate || timeslotsPayload?.localDate || formatYmdLocal(new Date()),
        timeslots: timeslotsList,
      })
    } else if (!useCustomSchedule && slot?.start && slot?.end) {
      setQuickSlot({
        start: slot.start,
        end: slot.end,
        timezone: slot.timezone || quickSlot?.timezone || 'Europe/Athens',
      })
    }

    setTimeChangePrompt({
      slot,
      useCustomSchedule,
      retryOnAccept,
    })
    setIsSubmitting(false)
    return true
  }

  const handleSlotFullFallback = async () => {
    if (!restaurant?.id || !deliveryLocation?.id) return false

    if (customSchedule) {
      const fresh = await restaurantService.getDeliveryTimeslots({
        restaurantId: restaurant.id,
        deliveryLocationId: deliveryLocation.id,
        date: formatYmdLocal(new Date()),
      })
      if (fresh?.error) return false

      const list = Array.isArray(fresh?.timeslots) ? fresh.timeslots : []
      const nextAvailable = list.find((s) => s.available)
      return promptForUpdatedTime({
        slot: nextAvailable,
        useCustomSchedule: true,
        retryOnAccept: true,
        timeslotsList: list,
        timezone: fresh?.timezone,
        localDate: fresh?.localDate,
      })
    }

    const data = await restaurantService.getDeliveryTimeEstimate({
      restaurantId: restaurant.id,
      deliveryLocationId: deliveryLocation.id,
    })
    if (data?.error) return false

    return promptForUpdatedTime({
      slot: data?.timeslot,
      useCustomSchedule: false,
      retryOnAccept: true,
    })
  }

  const handleAcceptTimeChange = async () => {
    if (!timeChangePrompt?.slot?.end) {
      setTimeChangePrompt(null)
      setIsSubmitting(false)
      return
    }

    const { slot, useCustomSchedule, retryOnAccept } = timeChangePrompt
    setSelectedSlotEnd(slot.end)
    setCustomSchedule(Boolean(useCustomSchedule))
    if (!useCustomSchedule && slot.start && slot.end) {
      setQuickSlot({
        start: slot.start,
        end: slot.end,
        timezone: slot.timezone || quickSlot?.timezone || 'Europe/Athens',
      })
    }
    setTimeChangePrompt(null)

    if (!retryOnAccept) {
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)
    await submitOrder()
  }

  const handleContinue = async () => {
    if (!agree) return

    if (!hasOrderItems) {
      showAlert('error', t('checkout.validationError'), t('checkout.cartEmpty'), 5000)
      return
    }

    if (!customerName.trim()) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorName'), 5000)
      return
    }
    if (!customerPhone.trim()) {
      showAlert('error', t('checkout.validationError'), t('checkout.errorPhone'), 5000)
      return
    }
    if (!customerPhoneConfirm || customerPhoneConfirm !== customerPhone) {
      setTouched((prev) => ({ ...prev, phoneConfirm: true }))
      showAlert(
        'error',
        t('checkout.validationError'),
        customerPhoneConfirm && customerPhoneConfirm !== customerPhone ? t('checkout.errorPhoneMismatch') : t('checkout.errorPhoneConfirmRequired'),
        5000
      )
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
    if (!paymentMethod || !availablePaymentMethods.includes(paymentMethod)) {
      setTouched((prev) => ({ ...prev, paymentMethod: true }))
      showAlert('error', t('checkout.validationError'), t('checkout.errorPaymentMethod'), 5000)
      return
    }
    if (!selectedSlotEnd) {
      showAlert('error', t('checkout.validationError'), t('checkout.selectSlotRequired'), 5000)
      return
    }
    if (!deliveryReady) {
      showAlert(
        'error',
        t('checkout.deliveryTime'),
        customSchedule ? timeslotsError || t('checkout.noTimeslots') : quickError || t('checkout.couldNotGetTime'),
        5000
      )
      return
    }
    setIsSubmitting(true)
    try {
      if (paymentMethod === 'CASH' || paymentMethod === 'CARD') {
        await submitOrder()
        return
      }

      // ONLINE: re-verify chosen window
      if (customSchedule) {
        const fresh = await restaurantService.getDeliveryTimeslots({
          restaurantId: restaurant.id,
          deliveryLocationId: deliveryLocation.id,
          date: formatYmdLocal(new Date()),
        })
        if (fresh?.error) {
          showAlert(
            'error',
            t('checkout.deliveryTime'),
            typeof fresh.error === 'string' ? fresh.error : t('checkout.couldNotGetTime'),
            5000
          )
          setIsSubmitting(false)
          return
        }
        const list = Array.isArray(fresh?.timeslots) ? fresh.timeslots : []
        const slot = list.find((s) => s.end === selectedSlotEnd)
        if (!slot?.available) {
          const nextAvailable = list.find((s) => s.available)
          if (!promptForUpdatedTime({
            slot: nextAvailable,
            useCustomSchedule: true,
            retryOnAccept: paymentMethod === 'ONLINE',
            timeslotsList: list,
            timezone: fresh?.timezone,
            localDate: fresh?.localDate,
          })) {
            showAlert('error', t('checkout.deliveryTime'), t('checkout.slotNoLongerAvailable'), 5000)
            setTimeslotsPayload({
              timezone: fresh?.timezone || timeslotsPayload?.timezone || 'Europe/Athens',
              localDate: fresh?.localDate || formatYmdLocal(new Date()),
              timeslots: list,
            })
            setSelectedSlotEnd(null)
            setIsSubmitting(false)
          }
          return
        }
      } else {
        const data = await restaurantService.getDeliveryTimeEstimate({
          restaurantId: restaurant.id,
          deliveryLocationId: deliveryLocation.id,
        })
        if (data?.error) {
          showAlert('error', t('checkout.deliveryTime'), typeof data.error === 'string' ? data.error : t('checkout.couldNotGetTime'), 5000)
          setIsSubmitting(false)
          return
        }
        const newEnd = data?.timeslot?.end
        if (!newEnd || newEnd !== selectedSlotEnd) {
          if (!promptForUpdatedTime({
            slot: data?.timeslot,
            useCustomSchedule: false,
            retryOnAccept: paymentMethod === 'ONLINE',
          })) {
            showAlert('error', t('checkout.deliveryTime'), t('checkout.slotNoLongerAvailable'), 5000)
            setIsSubmitting(false)
          }
          return
        }
      }

      await submitOrder()
    } catch (error) {
      showAlert('error', t('checkout.deliveryTime'), t('checkout.failedToVerifyTime'), 5000)
      setIsSubmitting(false)
    }
  }

  const loadCheckoutLocations = async () => {
    if (!restaurant?.id) return
    setCheckoutLocationsLoading(true)
    setCheckoutLocationsError(null)
    try {
      const rows = await restaurantService.getCheckoutLocations(restaurant.id)
      const normalized = (rows || [])
        .map((r) => ({
          id: r.locationId ?? r.id,
          name: typeof r.name === 'string' ? r.name : '',
        }))
        .filter((r) => r.id != null)
      setCheckoutLocations(normalized)
    } catch {
      setCheckoutLocationsError(t('checkout.locationsLoadError'))
      setCheckoutLocations([])
    } finally {
      setCheckoutLocationsLoading(false)
    }
  }

  const openCheckoutLocationPicker = () => {
    setLocationPickerOpen(true)
    loadCheckoutLocations()
  }

  const applyCheckoutLocation = (loc) => {
    if (!loc?.id || !onChangeDeliveryLocation) return
    onChangeDeliveryLocation({ id: loc.id, name: loc.name })
    setAgree(false)
    setLocationPickerOpen(false)
  }

  // Display in user's browser timezone (backend sends UTC)
  const formatTimeslotDisplay = (slot) => {
    if (!slot) return ''
    const opts = { hour: '2-digit', minute: '2-digit' }
    const startStr = slot.start.toLocaleTimeString(undefined, opts)
    const endStr = slot.end ? slot.end.toLocaleTimeString(undefined, opts) : null
    return endStr ? `${startStr} - ${endStr}` : startStr
  }

  const asapTimeSubtitle = (() => {
    if (quickLoading) return t('checkout.calculatingTime')
    if (quickError) return quickError
    if (quickSlot?.start && quickSlot?.end) {
      return formatTimeslotDisplay({
        start: new Date(quickSlot.start),
        end: new Date(quickSlot.end),
      })
    }
    return ''
  })()

  const scheduleCardSubtitle =
    customSchedule && displayDeliveryWindow
      ? formatTimeslotDisplay(displayDeliveryWindow)
      : t('checkout.scheduleSubtext')

  const timeOptionCardClass = (selected) =>
    `w-full rounded-xl border-2 px-4 py-3 text-left transition-all flex gap-3 items-start touch-manipulation ${selected
      ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-200/80'
      : 'border-slate-200 bg-white hover:border-slate-300 active:bg-slate-50'
    }`

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
            className="pb-1 absolute top-4 left-4 w-8 h-8 font-semibold rounded-full bg-black/60 text-white flex items-center justify-center text-xl font-light hover:bg-black/80 active:bg-black/80 transition-colors"
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
            {/* Restaurant */}
            <div className="text-center mb-4 sm:mb-5">
              <div className="text-lg sm:text-xl font-bold text-orange-500">{restaurant?.name || t('common.restaurant')}</div>
            </div>

            {/* When? — earliest slot vs schedule (modal: today’s slots only) */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3 text-slate-900">{t('checkout.when')}</div>
              <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={t('checkout.when')}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={!customSchedule}
                  onClick={() => {
                    setCustomSchedule(false)
                    setSchedulePickerOpen(false)
                  }}
                  className={timeOptionCardClass(!customSchedule)}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${!customSchedule ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'
                      }`}
                    aria-hidden
                  >
                    {!customSchedule ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-semibold text-slate-900">{t('checkout.earliestDelivery')}</div>
                    <div
                      className={`mt-0.5 text-xs sm:text-sm ${quickError ? 'text-red-600 font-medium' : 'text-slate-500'
                        }`}
                    >
                      {asapTimeSubtitle || '\u00a0'}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={customSchedule}
                  onClick={() => {
                    setCustomSchedule(true)
                    setSchedulePickerOpen(true)
                  }}
                  className={timeOptionCardClass(customSchedule)}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 ${customSchedule ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'
                      }`}
                    aria-hidden
                  >
                    {customSchedule ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm sm:text-base font-semibold text-slate-900">{t('checkout.scheduleOption')}</div>
                    <div className="mt-0.5 text-xs sm:text-sm text-slate-500">{scheduleCardSubtitle}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Where? — delivery location */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3 text-slate-900">{t('checkout.where')}</div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0 text-sm sm:text-base text-slate-700">
                  <span className="text-slate-500">{t('checkout.deliveryTo')}</span>{' '}
                  <span className="font-semibold text-slate-900">{deliveryLocation?.name || t('common.location')}</span>
                </div>
                {onChangeDeliveryLocation && restaurant?.id ? (
                  <button
                    type="button"
                    onClick={openCheckoutLocationPicker}
                    className="flex-shrink-0 self-start rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition-colors hover:bg-orange-50 active:bg-orange-100 sm:text-sm sm:self-auto"
                  >
                    {t('checkout.changeLocation')}
                  </button>
                ) : null}
              </div>
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
                  <PhoneInput
                    country="it"
                    preferredCountries={['it', 'gr']}
                    countryCodeEditable={false}
                    value={customerPhone}
                    onChange={(value) => {
                      setCustomerPhone(value || '')
                      setFieldDirty('phone')()
                    }}
                    onBlur={setFieldTouched('phone')}
                    inputProps={{
                      name: 'customerPhone',
                      autoComplete: 'tel',
                      required: true,
                    }}
                    containerStyle={{ width: '100%' }}
                    inputStyle={{
                      width: '100%',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      minHeight: '42px',
                      borderColor: showError('phone') ? '#ef4444' : '#cbd5e1',
                    }}
                    buttonStyle={{
                      borderTopLeftRadius: '0.5rem',
                      borderBottomLeftRadius: '0.5rem',
                      borderColor: showError('phone') ? '#ef4444' : '#cbd5e1',
                    }}
                    inputClass={showError('phone') ? 'focus:!ring-red-500' : 'focus:!ring-orange-500'}
                    placeholder={t('checkout.enterPhone')}
                  />
                  {showError('phone') && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
                </div>
                <div
                  onPaste={(e) => e.preventDefault()}
                  onDrop={(e) => e.preventDefault()}
                >
                  <label className="block text-xs sm:text-sm font-medium mb-1.5 text-slate-700">{t('checkout.phoneConfirmRequired')}</label>
                  <PhoneInput
                    country="it"
                    preferredCountries={['it', 'gr']}
                    countryCodeEditable={false}
                    value={customerPhoneConfirm}
                    onChange={(value) => {
                      setCustomerPhoneConfirm(value || '')
                      setFieldDirty('phoneConfirm')()
                    }}
                    onBlur={setFieldTouched('phoneConfirm')}
                    inputProps={{
                      name: 'checkout_phone_reenter',
                      id: 'checkout-phone-confirm',
                      required: true,
                      autoComplete: 'off',
                      'data-lpignore': 'true',
                      'data-1p-ignore': 'true',
                      'data-form-type': 'other',
                      spellCheck: false,
                      onPaste: (e) => e.preventDefault(),
                      onCopy: (e) => e.preventDefault(),
                      onCut: (e) => e.preventDefault(),
                    }}
                    containerStyle={{ width: '100%' }}
                    inputStyle={{
                      width: '100%',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      minHeight: '42px',
                      borderColor: showError('phoneConfirm') ? '#ef4444' : '#cbd5e1',
                    }}
                    buttonStyle={{
                      borderTopLeftRadius: '0.5rem',
                      borderBottomLeftRadius: '0.5rem',
                      borderColor: showError('phoneConfirm') ? '#ef4444' : '#cbd5e1',
                    }}
                    inputClass={showError('phoneConfirm') ? 'focus:!ring-red-500' : 'focus:!ring-orange-500'}
                    placeholder={t('checkout.enterPhoneConfirm')}
                  />
                  {showError('phoneConfirm') && <p className="text-xs text-red-600 mt-1">{errors.phoneConfirm}</p>}
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
                onChange={(e) => { setNotes(e.target.value); setFieldDirty('notes')() }}
                maxLength={MAX_NOTES_LENGTH}
                placeholder={t('checkout.deliveryNotesPlaceholder')}
                className="w-full border border-slate-300 px-3 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                rows="2"
              />
            </div>

            {/* Payment Method */}
            <div className="mb-4 sm:mb-5 border-b border-slate-200 pb-4 sm:pb-5">
              <div className="text-sm sm:text-base font-semibold mb-3">{t('checkout.paymentMethod')}</div>
              {availablePaymentMethods.length === 0 ? (
                <p className="text-sm text-red-600">{t('checkout.noPaymentMethods')}</p>
              ) : (
                <div className="flex flex-wrap gap-2 sm:gap-3" role="radiogroup" aria-label={t('checkout.paymentMethod')}>
                  {availablePaymentMethods.map((method) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === method}
                      key={method}
                      className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-3 px-3 sm:px-4 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === method
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      onClick={() => {
                        setPaymentMethod(method)
                        setTouched((prev) => ({ ...prev, paymentMethod: true }))
                      }}
                    >
                      <span className="text-lg">{PAYMENT_METHOD_EMOJI[method] || '💰'}</span>
                      <span className="font-medium text-xs sm:text-base">{t(PAYMENT_METHOD_LABEL_KEY[method] || 'checkout.paymentMethod')}</span>
                    </button>
                  ))}
                </div>
              )}
              {touched.paymentMethod && !paymentMethod && availablePaymentMethods.length > 0 && (
                <p className="text-xs text-red-600 mt-2">{t('checkout.errorPaymentMethod')}</p>
              )}
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
                        {(it.removedIngredientNames && it.removedIngredientNames.length > 0) && (
                          <div className="text-xs sm:text-sm text-slate-500 mt-1">
                            {t('cart.without')}: {it.removedIngredientNames.join(', ')}
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
                        <div className="ml-2 sm:ml-3 text-sm sm:text-base font-semibold tabular-nums text-slate-900 min-w-[60px] sm:min-w-[70px] text-right">
                          {formatPrice(it.total)}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(it.key)}
                          className="ml-1 shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:bg-slate-200 sm:ml-2 sm:px-2.5"
                          aria-label={t('checkout.removeItem')}
                        >
                          {t('common.remove')}
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
                {coupon ? (
                  <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-green-50 border border-green-200">
                    <span className="text-sm font-medium text-green-800">
                      {t('checkout.couponApplied', { code: coupon.code })}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-semibold text-green-700 hover:text-green-900 underline"
                    >
                      {t('checkout.removeCoupon')}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promo}
                      onChange={(e) => { setPromo(e.target.value); setCouponError(null) }}
                      placeholder={t('checkout.enterCode')}
                      className={`flex-1 border px-3 py-2 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${couponError ? 'border-red-500' : 'border-slate-300'}`}
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCoupon}
                      disabled={!promo.trim() || !customerEmail.trim() || couponLoading}
                      className="bg-orange-500 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold active:bg-orange-600 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {couponLoading ? t('checkout.verifying') : t('common.verify')}
                    </button>
                  </div>
                )}
                {(couponError || (promo.trim() && !customerEmail.trim())) && (
                  <p className="text-xs text-red-600 mt-1.5">{couponError || t('checkout.couponEmailRequired')}</p>
                )}
              </div>

              <div className="bg-sky-100 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4 flex items-center justify-between">
                <div className="text-base sm:text-lg font-semibold text-slate-900">{t('common.total')}:</div>
                <div className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  {coupon && couponDiscountAmount > 0 ? (
                    <>
                      <span className="line-through text-slate-400 font-semibold">{formatPrice(totalBeforeCoupon)}</span>
                      <span>{formatPrice(finalTotal)}</span>
                    </>
                  ) : (
                    formatPrice(finalTotal)
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-2 sm:items-center sm:justify-between sm:gap-3">
                <label className="flex min-w-0 flex-1 items-start gap-3 text-sm sm:text-base text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5 h-6 w-6 min-h-[1.5rem] min-w-[1.5rem] shrink-0 cursor-pointer rounded-md border-2 border-slate-300 text-orange-500 focus:ring-2 focus:ring-orange-400 focus:ring-offset-0 sm:h-7 sm:w-7 sm:min-h-[1.75rem] sm:min-w-[1.75rem] accent-orange-500"
                  />
                  <span className="leading-snug pt-0.5">
                    {t('checkout.confirmLocation')} <span className="font-semibold">{deliveryLocation?.name || ''}</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer — blockers explain disabled Confirm */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-3 sm:px-4 py-3 flex-shrink-0">
          {/* {orderConfirmBlockers.length > 0 && (
            <div
              className="mb-3 overflow-hidden rounded-2xl border border-orange-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50/60 px-4 py-3.5 shadow-md shadow-orange-900/[0.06] ring-1 ring-orange-100/80 sm:px-5 sm:py-4"
              role="status"
              aria-live="polite"
            >
              <div className="flex gap-3 sm:gap-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-500 shadow-sm ring-1 ring-orange-100"
                  aria-hidden
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold tracking-tight text-slate-800">{t('checkout.blockerTitle')}</p>
                  <ul className="mt-2.5 space-y-2 text-sm leading-snug text-slate-700">
                    {orderConfirmBlockers.map((msg, i) => (
                      <li key={`${i}-${msg}`} className="flex gap-2.5">
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400"
                          aria-hidden
                        />
                        <span>{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )} */}
          <button
            disabled={!orderConfirmEnabled}
            onClick={handleContinue}
            className={`w-full py-3 sm:py-3.5 text-sm sm:text-base font-semibold rounded-lg transition-all ${orderConfirmEnabled
                ? 'bg-orange-500 text-white active:bg-orange-600 active:scale-[0.98]'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
          >
            {isSubmitting ? t('checkout.processing') : t('checkout.confirmOrder')}
          </button>
        </div>
      </div>

      {locationPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setLocationPickerOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[min(80vh,28rem)] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-location-picker-title"
          >
            <h3 id="checkout-location-picker-title" className="mb-3 text-lg font-bold text-slate-900">
              {t('checkout.chooseDeliveryLocation')}
            </h3>
            {checkoutLocationsLoading ? (
              <p className="py-6 text-center text-sm text-slate-600">{t('checkout.loadingCheckoutLocations')}</p>
            ) : checkoutLocationsError ? (
              <p className="py-2 text-sm text-red-600">{checkoutLocationsError}</p>
            ) : checkoutLocations.length === 0 ? (
              <p className="py-4 text-sm text-slate-600">{t('checkout.noLocationsForRestaurant')}</p>
            ) : (
              <ul className="mb-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
                {checkoutLocations.map((loc) => (
                  <li key={loc.id}>
                    <button
                      type="button"
                      onClick={() => applyCheckoutLocation(loc)}
                      className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${String(deliveryLocation?.id) === String(loc.id)
                          ? 'border-orange-500 bg-orange-50 text-orange-800'
                          : 'border-slate-200 text-slate-800 hover:border-orange-300 hover:bg-slate-50'
                        }`}
                    >
                      {loc.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setLocationPickerOpen(false)}
              className="w-full rounded-lg border border-slate-300 py-2.5 font-semibold text-slate-700 active:bg-slate-100"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {schedulePickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setSchedulePickerOpen(false)}
          role="presentation"
        >
          <div
            className="flex max-h-[min(92dvh,calc(100vh-env(safe-area-inset-bottom,0px)-1rem))] w-full min-w-0 max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[min(85vh,32rem)] sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkout-schedule-modal-title"
          >
            <div className="checkout-schedule-modal min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 pb-2 pt-5 sm:p-6 sm:pb-2">
              <h3 id="checkout-schedule-modal-title" className="mb-1 text-lg font-bold text-slate-900">
                {t('checkout.scheduleDeliveryModalTitle')}
              </h3>
              <p className="mb-4 text-xs text-slate-500">{t('checkout.scheduleTodayOnlyHint')}</p>

              <div className="grid w-full min-w-0 gap-4 [grid-template-columns:minmax(0,1fr)]">
                <div className="min-w-0">
                  <label className="mb-1.5 block text-xs font-medium text-slate-700" htmlFor="checkout-timeslot-select">
                    {t('checkout.selectTimeslotLabel')}
                  </label>
                  {timeslotsLoading ? (
                    <p className="py-6 text-center text-sm text-slate-600">{t('checkout.loadingTimeslots')}</p>
                  ) : timeslotsError ? (
                    <p className="py-2 text-sm text-red-600">{timeslotsError}</p>
                  ) : !timeslotsPayload?.timeslots?.length ? (
                    <p className="py-4 text-sm text-slate-600">{t('checkout.noTimeslots')}</p>
                  ) : (
                    <div className="checkout-schedule-field">
                      <select
                        id="checkout-timeslot-select"
                        value={
                          timeslotsPayload.timeslots.some((s) => s.end === selectedSlotEnd) ? selectedSlotEnd : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) return
                          setSelectedSlotEnd(v)
                          setCustomSchedule(v !== quickSlot?.end)
                        }}
                        className="min-h-[48px] w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-3 pr-10 text-base font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent touch-manipulation sm:min-h-0 sm:text-sm"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '1.25rem',
                        }}
                      >
                        <option value="">{t('checkout.selectTimeslotPlaceholder')}</option>
                        {timeslotsPayload.timeslots.map((slot) => {
                          const slotForDisplay = { start: new Date(slot.start), end: new Date(slot.end) }
                          const label = `${formatTimeslotDisplay(slotForDisplay)}${slot.available ? '' : ` — ${t('checkout.slotUnavailable')}`}`
                          return (
                            <option key={slot.end} value={slot.end} disabled={!slot.available}>
                              {label}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-6">
              <button
                type="button"
                onClick={() => setSchedulePickerOpen(false)}
                className="min-h-[48px] w-full touch-manipulation rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white active:bg-orange-600"
              >
                {t('common.confirm')}
              </button>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                <button
                  type="button"
                  onClick={() => setSchedulePickerOpen(false)}
                  className="min-h-[48px] w-full touch-manipulation rounded-lg border border-slate-300 py-3 text-sm font-semibold text-slate-700 active:bg-slate-100 sm:flex-1 sm:py-2.5"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomSchedule(false)
                    setSchedulePickerOpen(false)
                  }}
                  className="min-h-[48px] w-full touch-manipulation rounded-lg border border-orange-300 bg-white py-3 text-sm font-semibold text-orange-700 active:bg-orange-50 sm:flex-1 sm:py-2.5"
                >
                  {t('checkout.useSoonestDelivery')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {timeChangePrompt?.slot && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-bold text-slate-900">{t('checkout.timeChangedTitle')}</h3>
            <p className="mb-5 text-sm text-slate-600">
              {t('checkout.timeChangedMessage', {
                time: formatTimeslotDisplay({
                  start: new Date(timeChangePrompt.slot.start || timeChangePrompt.slot.end),
                  end: timeChangePrompt.slot.end ? new Date(timeChangePrompt.slot.end) : null,
                }),
              })}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setTimeChangePrompt(null)
                  setIsSubmitting(false)
                }}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 font-semibold text-slate-700 active:bg-slate-100"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAcceptTimeChange}
                className="flex-1 rounded-lg bg-orange-500 py-2.5 font-semibold text-white active:bg-orange-600"
              >
                {t('common.accept')}
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
