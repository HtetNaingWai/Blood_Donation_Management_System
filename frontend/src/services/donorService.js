import http from './http'
import { updateStoredUser } from './authStorage'

export const emptyDonorDashboard = {
  user: null,
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

const donorService = {
  getDashboard: () => getWithFallback('/donor/dashboard', emptyDonorDashboard),
  updateAvailability: async (availabilityStatus) => {
    const { data } = await http.put('/donor/availability', {
      availability_status: availabilityStatus,
    })

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
}

export default donorService
