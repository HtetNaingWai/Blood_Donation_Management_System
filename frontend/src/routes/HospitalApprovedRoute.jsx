import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStoredToken, getStoredUser } from '../services/authStorage'

// Allow only authenticated hospitals whose approval status is already approved.
function HospitalApprovedRoute() {
  const location = useLocation()
  const token = getStoredToken()
  const user = getStoredUser()
  const approvalStatus = user?.hospital?.approval_status

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user.role !== 'hospital') {
    return <Navigate to="/unauthorized" replace />
  }

  if (approvalStatus === 'pending') {
    return <Navigate to="/hospital/pending" replace />
  }

  if (approvalStatus === 'rejected') {
    return <Navigate to="/hospital/rejected" replace />
  }

  if (approvalStatus !== 'approved') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default HospitalApprovedRoute
