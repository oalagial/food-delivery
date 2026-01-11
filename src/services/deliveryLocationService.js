import apiClient from './api'

export const deliveryLocationService = {
  // Get all delivery locations
  getAll: async () => {
    const response = await apiClient.get('/public/delivery-locations')
    return response.data
  },

  // Get single delivery location
  getById: async (id) => {
    const response = await apiClient.get(`/delivery-locations/${id}`)
    return response.data
  },

  // Create delivery location
  create: async (data) => {
    const response = await apiClient.post('/delivery-locations/create', data)
    return response.data
  },

  // Update delivery location
  update: async (id, data) => {
    const response = await apiClient.put(`/delivery-locations/update/${id}`, data)
    return response.data
  },

  // Delete delivery location
  delete: async (id) => {
    const response = await apiClient.delete(`/delivery-locations/delete/${id}`)
    return response.data
  },
}
