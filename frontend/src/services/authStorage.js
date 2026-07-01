const TOKEN_KEY = 'lifeblood_token'
const USER_KEY = 'lifeblood_user'

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  const rawUser = localStorage.getItem(USER_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser)
  } catch {
    return null
  }
}

export function setAuthSession(payload) {
  clearAuthSession()

  if (payload?.token) {
    localStorage.setItem(TOKEN_KEY, payload.token)
  }

  if (payload?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function updateStoredUser(user) {
  if (!user) {
    return
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function hasAuthSession() {
  return Boolean(getStoredToken() && getStoredUser())
}

export function getUserHomeRoute(user = getStoredUser()) {
  if (!user) {
    return '/login'
  }

  if (user.role === 'admin') {
    return '/admin'
  }

  if (user.role === 'donor') {
    return '/donor/dashboard'
  }

  if (user.role === 'patient') {
    return '/patient/dashboard'
  }

  if (user.role === 'hospital') {
    const status = user.hospital?.approval_status

    if (status === 'approved') {
      return '/hospital/dashboard'
    }

    if (status === 'rejected') {
      return '/hospital/rejected'
    }

    return '/hospital/pending'
  }

  return '/'
}
