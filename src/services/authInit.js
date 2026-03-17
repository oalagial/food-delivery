/**
 * Initialize authentication - only use existing token if present. No automatic login.
 */
export const initializeAuth = async () => {
  const existingToken = localStorage.getItem('authToken')
  if (existingToken) {
    return { authenticated: true, token: existingToken }
  }
  return { authenticated: false }
}
