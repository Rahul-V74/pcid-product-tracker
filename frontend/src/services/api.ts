import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
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
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<Token>('/auth/login', new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }),
  register: (data: RegisterData) =>
    api.post<User>('/auth/register', data),
  me: () => api.get<User>('/auth/me'),
}

export const recordsApi = {
  list: (params: {
    page?: number
    page_size?: number
    search?: string
    status_filter?: string
  }) => api.get<PCIDRecordList>('/records', { params }),

  summary: () => api.get<SummaryStats>('/records/summary'),

  get: (id: number) => api.get<PCIDRecord>(`/records/${id}`),

  create: (data: PCIDRecordCreate) => api.post<PCIDRecord>('/records', data),

  update: (id: number, data: PCIDRecordUpdate) =>
    api.patch<PCIDRecord>(`/records/${id}`, data),

  delete: (id: number) => api.delete(`/records/${id}`),

  clearAll: () => api.delete('/records'),

  export: (params: { status_filter?: string; search?: string }) =>
    api.post('/export', params, { responseType: 'blob' }),

  import: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post<ImportResult>('/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api