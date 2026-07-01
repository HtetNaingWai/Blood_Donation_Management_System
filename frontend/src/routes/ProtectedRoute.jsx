import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredToken, getStoredUser, getUserHomeRoute } from '../services/authStorage'

function ProtectedRoute() {
  const location = useLocation()
  const token = getStoredToken()
  const user = getStoredUser()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role !== 'admin') {
    return <Navigate to={getUserHomeRoute(user)} replace />
  }

  return <Outlet />
}

export default ProtectedRoute
