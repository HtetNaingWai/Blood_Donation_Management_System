import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredToken, getStoredUser, getUserHomeRoute } from '../services/authStorage'

// Allow only the requested role, such as donor or patient, into the wrapped route group.
function RoleRoute({ allowedRole }) {
  const location = useLocation()
  const token = getStoredToken()
  const user = getStoredUser()

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role !== allowedRole) {
    return <Navigate to={getUserHomeRoute(user)} replace />
  }

  return <Outlet />
}

export default RoleRoute
