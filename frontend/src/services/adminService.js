import http from './http'

// Default admin dashboard data keeps the management screens predictable when optional endpoints fail.
const emptyDashboard = {
  total_users: 0,
  total_donors: 0,
  total_patients: 0,
  total_hospitals: 0,
  verified_hospitals: 0,
  pending_hospitals: 0,
  active_requests: 0,
  critical_requests: 0,
  total_donations: 0,
  recent_users: [],
  recent_activities: [],
}

function shouldRethrow(error) {
  const status = error?.response?.status
  return status === 401 || status === 403
}

async function getWithFallback(path, fallback) {
  try {
    const { data } = await http.get(path)
    return data ?? fallback
  } catch (error) {
    if (shouldRethrow(error)) {
      throw error
    }

    return fallback
  }
}

async function putWithFallback(path, payload, fallback) {
  try {
    const { data } = await http.put(path, payload)
    return data ?? fallback
  } catch (error) {
    if (shouldRethrow(error)) {
      throw error
    }

    return fallback
  }
}

// Admin API calls stay centralized here for approval, reporting, and moderation screens.
const adminService = {
  getDashboard: () => getWithFallback('/admin/dashboard', emptyDashboard),
  getUsers: () => getWithFallback('/admin/users', { data: [] }),
  getDonors: () => getWithFallback('/admin/donors', { data: [] }),
  getPatients: () => getWithFallback('/admin/patients', { data: [] }),
  getHospitals: () => getWithFallback('/admin/hospitals', { data: [] }),
  getPendingHospitals: () => getWithFallback('/admin/hospitals/pending', { data: [] }),
  getApprovedHospitals: () => getWithFallback('/admin/hospitals/approved', { data: [] }),
  getRejectedHospitals: () => getWithFallback('/admin/hospitals/rejected', { data: [] }),
  getBloodRequests: () => getWithFallback('/admin/blood-requests', { data: [] }),
  getAuditLogs: () => getWithFallback('/admin/audit-logs', { data: [] }),
  approveHospital: (id) => putWithFallback(`/admin/hospitals/${id}/approve`, {}, { data: null }),
  rejectHospital: (id, rejectionReason = '') =>
    putWithFallback(`/admin/hospitals/${id}/reject`, { rejection_reason: rejectionReason }, { data: null }),
  updateUserStatus: (id, status) => putWithFallback(`/admin/users/${id}/status`, { status }, { data: null }),
}

export default adminService
