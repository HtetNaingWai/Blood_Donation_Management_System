import http from './http'
import { clearAuthSession, setAuthSession } from './authStorage'

export async function login(credentials) {
  const { data } = await http.post('/v1/login', credentials)
  setAuthSession(data)
  return data
}

export async function logout() {
  try {
    await http.post('/v1/logout')
  } finally {
    clearAuthSession()
  }
}
