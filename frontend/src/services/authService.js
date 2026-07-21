import http from './http'
import { clearAuthSession, setAuthSession } from './authStorage'

// Submit login credentials and persist the returned user session for later route checks.
export async function login(credentials) {
  const { data } = await http.post('/v1/login', credentials)
  setAuthSession(data)
  return data
}

// Clear the current session locally even if the logout API request fails.
export async function logout() {
  try {
    await http.post('/v1/logout')
  } finally {
    clearAuthSession()
  }
}
