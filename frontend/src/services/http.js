import axios from 'axios'
import { apiRoot } from '../config/api'
import { getStoredToken } from './authStorage'

const http = axios.create({
  baseURL: apiRoot,
  headers: {
    Accept: 'application/json',
  },
})

// This keeps token storage isolated so it can later move from localStorage to httpOnly cookies.
http.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export default http
