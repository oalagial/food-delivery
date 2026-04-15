import apiClient from './api'

export const restaurantService = {
  // Get all restaurants
  getAll: async () => {
    const response = await apiClient.get('/public/restaurants')
    return response.data?.data || []
  },

  // Get restaurants by deliveredBy (delivery location)
  getByDeliveredBy: async (deliveredBy) => {
    const response = await apiClient.get(`/public/restaurants`, { params: { id: deliveredBy } })
    return response.data?.data || []
  },

  /** Checkout: delivery locations for a restaurant ({ locationId, name }[]) */
  getCheckoutLocations: async (restaurantId) => {
    const response = await apiClient.get(`/public/restaurants/${restaurantId}/locations`)
    const raw = response.data
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.data)) return raw.data
    return []
  },

  /**
   * Checkout: bookable delivery windows for a day (restaurant TZ).
   * @param {{ restaurantId: number|string, deliveryLocationId: number|string, date?: string }} params date = YYYY-MM-DD (optional → server "today")
   */
  getDeliveryTimeslots: async ({ restaurantId, deliveryLocationId, date }) => {
    const response = await apiClient.get('/public/delivery-timeslots', {
      params: {
        restaurantId,
        deliveryLocationId,
        ...(date ? { date } : {}),
      },
    })
    return response.data
  },

  /** Next bookable window (fast path) — same as legacy checkout default */
  getDeliveryTimeEstimate: async ({ restaurantId, deliveryLocationId }) => {
    const response = await apiClient.get('/public/delivery-time', {
      params: { restaurantId, deliveryLocationId },
    })
    return response.data
  },

  // Get single restaurant
  getById: async (id) => {
    const response = await apiClient.get(`/restaurants/${id}`)
    return response.data
  },

  // Create restaurant
  create: async (data) => {
    const response = await apiClient.post('/restaurants/create', data)
    return response.data
  },

  // Update restaurant
  update: async (id, data) => {
    const response = await apiClient.put(`/restaurants/${id}`, data)
    return response.data
  },

  // Delete restaurant
  delete: async (id) => {
    const response = await apiClient.delete(`/restaurants/${id}`)
    return response.data
  },
}
