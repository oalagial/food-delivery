
import apiClient from './api'
const API_BASE = import.meta.env.VITE_API_BASE

  // Get all delivery locations
  getAll: async () => {
    // Use fetch directly to ensure .env is respected in all environments
    const response = await fetch(`${API_BASE}/public/delivery-locations`)
    if (!response.ok) throw new Error('Failed to fetch delivery locations')
    return await response.json()
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
