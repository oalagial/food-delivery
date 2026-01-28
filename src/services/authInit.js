import { authService } from './authService'

/**
 * Initialize authentication - try to refresh existing token or login with demo account
 */
export const initializeAuth = async () => {
  try {
    const existingToken = localStorage.getItem('authToken')
    
    // If we already have a token, try to use it
    if (existingToken) {
      return { authenticated: true, token: existingToken }
    }

    // Try to get a new token with demo credentials
    // Replace with actual demo credentials from your backend
    const credentials = {
      email: 'demo@delivery.app',
      password: 'demo123',
    }

    try {
      const data = await authService.login(credentials.email, credentials.password)
      console.log('Authenticated with demo account')
      return { authenticated: true, token: data.token }
    } catch (loginError) {
      console.warn('Demo login failed, app will run in read-only mode:', loginError.response?.data?.message)
      
      // If demo login fails, you might want to:
      // 1. Show a prompt for users to enter credentials
      // 2. Run in read-only mode
      // 3. Redirect to login page
      
      return { authenticated: false, error: loginError }
    }
  } catch (error) {
    console.error('Auth initialization error:', error)
    return { authenticated: false, error }
  }
}
