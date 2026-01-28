import apiClient from './api'

export const authService = {
  // Login user
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password })
    const { token, refreshToken } = response.data
    localStorage.setItem('authToken', token)
    localStorage.setItem('refreshToken', refreshToken)
    return response.data
  },

  // Refresh authentication token
  refresh: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    const response = await apiClient.post('/auth/refresh', { refreshToken })
    const { token } = response.data
    localStorage.setItem('authToken', token)
    return response.data
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken')
  },
}
