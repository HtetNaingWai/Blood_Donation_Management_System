import http from './http'
import { updateStoredUser } from './authStorage'

function normalizeDonorRequests(data) {
  return {
    available_requests: data?.available_requests || [],
    received_requests: data?.received_requests || [],
    accepted_requests: data?.accepted_requests || [],
  }
}

function normalizeHospitalRequests(data) {
  return {
    active_requests: data?.active_requests || [],
    direct_requests: data?.direct_requests || [],
    request_responses: data?.request_responses || [],
  }
}

// Direct blood request and request-tracking APIs are grouped here for donor and hospital request pages.
const bloodRequestService = {
  createBloodRequest: async (payload) => {
    const { data } = await http.post('/v1/hospital/blood-request', payload)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  getDonorRequests: async () => {
    const { data } = await http.get('/v1/donor/requests')

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return normalizeDonorRequests(data)
  },
  getHospitalRequests: async () => {
    const { data } = await http.get('/v1/hospital/requests')

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return normalizeHospitalRequests(data)
  },
  acceptRequest: async (requestId) => {
    const { data } = await http.post(`/v1/donor/requests/${requestId}/accept`)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
  rejectRequest: async (requestId) => {
    const { data } = await http.post(`/v1/donor/requests/${requestId}/reject`)

    if (data?.user) {
      updateStoredUser(data.user)
    }

    return data
  },
}

export default bloodRequestService
