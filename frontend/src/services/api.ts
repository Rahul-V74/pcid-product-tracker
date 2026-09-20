import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import type { PCIDRecord, PCIDRecordCreate, PCIDRecordUpdate, PCIDRecordList, SummaryStats, ImportResult, Token, LoginCredentials, RegisterData, User } from '../types'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials: LoginCredentials): Promise<Token> =>
    api.post('/auth/login', new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (data: RegisterData): Promise<User> =>
    api.post('/auth/register', data),
  me: (): Promise<User> =>
    api.get('/auth/me'),
}

export const recordsApi = {
  list: (params: {
    page?: number
    page_size?: number
    search?: string
    status_filter?: string
  }): Promise<PCIDRecordList> => api.get('/records', { params }),

  summary: (): Promise<SummaryStats> =>
    api.get('/records/summary'),

  get: (id: number): Promise<PCIDRecord> =>
    api.get(`/records/${id}`),

  create: (data: PCIDRecordCreate): Promise<PCIDRecord> =>
    api.post('/records', data),

  update: (id: number, data: PCIDRecordUpdate): Promise<PCIDRecord> =>
    api.patch(`/records/${id}`, data),

  delete: (id: number): Promise<void> =>
    api.delete(`/records/${id}`),

  clearAll: (): Promise<void> =>
    api.delete('/records'),

  export: (params: { status_filter?: string; search?: string }): Promise<Blob> =>
    api.post('/export', params, { responseType: 'blob' }),

  import: (file: File): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api