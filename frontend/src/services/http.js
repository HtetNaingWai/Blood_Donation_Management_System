import axios from 'axios'
import { apiRoot } from '../config/api'
import { getStoredToken } from './authStorage'

// Shared Axios client for Laravel API requests.
const http = axios.create({
  baseURL: apiRoot,
  headers: {
    Accept: 'application/json',
  },
})

// Attach the stored Sanctum bearer token so protected dashboard and profile calls stay authenticated.
http.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default http
