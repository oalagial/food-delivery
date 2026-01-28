import apiClient from './api'

export const menuService = {
  // Get all menus
  getAll: async () => {
    const response = await apiClient.get('/menus')
    return response.data
  },

  // Get single menu
  getById: async (id) => {
    const response = await apiClient.get(`/menus/${id}`)
    return response.data
  },

  // Create menu
  create: async (data) => {
    const response = await apiClient.post('/menus/create', data)
    return response.data
  },

  // Update menu
  update: async (id, data) => {
    const response = await apiClient.put(`/menus/${id}`, data)
    return response.data
  },

  // Delete menu
  delete: async (id) => {
    const response = await apiClient.delete(`/menus/${id}`)
    return response.data
  },
}
