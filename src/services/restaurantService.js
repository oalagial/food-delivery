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
