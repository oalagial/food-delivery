import apiClient from './api'

export const productService = {
  // Get all products
  getAll: async () => {
    const response = await apiClient.get('/products')
    return response.data
  },

  // Get single product
  getById: async (id) => {
    const response = await apiClient.get(`/products/${id}`)
    return response.data
  },

  // Create product
  create: async (data) => {
    const response = await apiClient.post('/products/create', data)
    return response.data
  },

  // Update product
  update: async (id, data) => {
    const response = await apiClient.put(`/products/${id}`, data)
    return response.data
  },

  // Delete product
  delete: async (id) => {
    const response = await apiClient.delete(`/products/${id}`)
    return response.data
  },
}
