import apiClient from './api'

export const customerService = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get('/customers')
    return response.data
  },

  // Get single customer
  getById: async (id) => {
    const response = await apiClient.get(`/customers/${id}`)
    return response.data
  },

  // Create customer
  create: async (data) => {
    const response = await apiClient.post('/customers/create', data)
    return response.data
  },

  // Update customer
  update: async (id, data) => {
    const response = await apiClient.put(`/customers/${id}`, data)
    return response.data
  },

  // Delete customer
  delete: async (id) => {
    const response = await apiClient.delete(`/customers/${id}`)
    return response.data
  },
}
