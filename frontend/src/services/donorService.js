import http from './http'
import { updateStoredUser } from './authStorage'

// Default donor dashboard shape keeps the UI stable when an API section is unavailable.
export const emptyDonorDashboard = {
  user: null,
  donor: null,
  summary: {
    blood_group: null,
    availability_status: 'available',
    total_donations: 0,
    lives_saved: 0,
    pending_requests: 0,
    last_donation_date: null,
    next_eligible_date: null,
    days_until_eligible: 0,
    eligibility_progress: 100,
    reward_points: 0,
    is_eligible: true,
  },
  donation_trends: [],
  nearby_requests: [],
  hospitals: [],
  accepted_requests: [],
  completed_requests: [],
  donations: [],
  donation_history: [],
  notifications: [],
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

// Donor API calls are grouped here so donor pages stay focused on presentation and state updates.
const donorService = {
  getDashboard: () => getWithFallback('/v1/donor/dashboard', emptyDonorDashboard),
  getHospitals: () => getWithFallback('/v1/donor/hospitals', { hospitals: [] }),
  getRequests: () => getWithFallback('/v1/donor/requests', { available_requests: [], accepted_requests: [] }),
  getDonations: () => getWithFallback('/v1/donor/donations', { donations: [] }),
  // Accept a hospital blood request from the donor dashboard.
  acceptRequest: async (requestId) => {
    const { data } = await http.post(`/v1/donor/requests/${requestId}/accept`)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  // Save donor profile changes, including location and notification preferences.
  updateProfile: async (payload) => {
    const { data } = await http.put('/v1/donor/profile', payload)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  updateAvailability: async (availabilityStatus) => {
    const { data } = await http.put('/v1/donor/availability', {
      availability_status: availabilityStatus,
    })

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
}

export default donorService
