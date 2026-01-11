import apiClient from './api'

export const orderService = {
  // Get all orders
  getAll: async () => {
    const response = await apiClient.get('/orders')
    return response.data
  },

  // Get orders by customer ID
  getByCustomerId: async (customerId) => {
    const response = await apiClient.get(`/orders/customer/${customerId}`)
    return response.data
  },

  // Get single order
  getById: async (id) => {
    const response = await apiClient.get(`/orders/${id}`)
    return response.data
  },

  // Create order
  create: async (data) => {
    const response = await apiClient.post('/orders/create', data)
    return response.data
  },

  // Delete order
  delete: async (id) => {
    const response = await apiClient.delete(`/orders/${id}`)
    return response.data
  },
}
