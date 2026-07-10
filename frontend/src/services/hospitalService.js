import http from './http'
import { updateStoredUser } from './authStorage'

export const emptyHospitalDashboard = {
  user: null,
  hospital: null,
  stats: {
    total_requests: 0,
    donors_matched_today: 0,
    match_rate: 0,
    inventory_units: 0,
    urgent_pending: 0,
  },
  active_requests: [],
  request_responses: [],
  recent_log: [],
  donor_heatmap: {
    center: { latitude: 16.8409, longitude: 96.1735 },
    radius_km: 5,
    points: [],
  },
  matches_in_route: [],
}

function shouldRethrow(error) {
  const status = error?.response?.status
  return status === 401 || status === 403
}

async function getWithFallback(path, fallback) {
  try {
    const { data } = await http.get(path)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data ?? fallback
  } catch (error) {
    if (shouldRethrow(error)) {
      throw error
    }

    return fallback
  }
}

const hospitalService = {
  getDashboard: () => getWithFallback('/v1/hospital/dashboard', emptyHospitalDashboard),
  getRequests: () => getWithFallback('/v1/hospital/requests', { active_requests: [], request_responses: [] }),
  updateProfile: async (payload) => {
    const { data } = await http.put('/v1/hospital/profile', payload)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  createRequest: async (payload) => {
    const { data } = await http.post('/v1/hospital/requests', payload)

    return data
  },
  completeResponse: async (responseId) => {
    const { data } = await http.put(`/v1/hospital/responses/${responseId}/complete`)

    return data
  },
}

export default hospitalService
