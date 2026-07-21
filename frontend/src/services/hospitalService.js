import http from './http'
import { updateStoredUser } from './authStorage'

// Default hospital dashboard shape keeps the hospital portal rendering even when API sections are empty.
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

export const emptyHospitalDonorSearch = {
  user: null,
  hospital: null,
  filters: {
    blood_group: null,
    township: null,
    availability: null,
    distance: null,
    search: null,
  },
  donors: [],
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

// Hospital API calls are grouped here for request creation, dashboard loading, and donation completion.
const hospitalService = {
  getDashboard: () => getWithFallback('/v1/hospital/dashboard', emptyHospitalDashboard),
  getDonors: async (params = {}) => {
    const { data } = await http.get('/v1/hospital/donors', { params })

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return {
      ...emptyHospitalDonorSearch,
      ...data,
      donors: data?.donors || [],
      filters: {
        ...emptyHospitalDonorSearch.filters,
        ...(data?.filters || {}),
      },
    }
  },
  getRequests: () => getWithFallback('/v1/hospital/requests', { active_requests: [], request_responses: [] }),
  // Save hospital profile details that appear in dashboard cards and donor maps.
  updateProfile: async (payload) => {
    const { data } = await http.put('/v1/hospital/profile', payload)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  // Create a new hospital blood request that donors can accept.
  createRequest: async (payload) => {
    const { data } = await http.post('/v1/hospital/requests', payload)

    return data
  },
  // Allow only the hospital workflow to mark an accepted donor response as completed.
  completeResponse: async (responseId) => {
    const { data } = await http.put(`/v1/hospital/responses/${responseId}/complete`)

    return data
  },
}

export default hospitalService
