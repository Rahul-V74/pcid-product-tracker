export interface PCIDRecord {
  id: number
  customer_id: string
  pcid: string
  designer_name: string
  delivery_date: string | null
  status: 'IP' | 'Completed' | 'HOLD'
  remarks: string | null
  created_at: string
  updated_at: string
}

export interface PCIDRecordCreate {
  customer_id: string
  pcid: string
  designer_name: string
  delivery_date: string | null
  status: 'IP' | 'Completed' | 'HOLD'
  remarks: string | null
}

export interface PCIDRecordUpdate {
  customer_id?: string
  pcid?: string
  designer_name?: string
  delivery_date?: string | null
  status?: 'IP' | 'Completed' | 'HOLD'
  remarks?: string | null
}

export interface PCIDRecordList {
  records: PCIDRecord[]
  total: number
  page: number
  page_size: number
}

export interface SummaryStats {
  total_records: number
  ip_count: number
  completed_count: number
  hold_count: number
}

export interface ImportResult {
  success: number
  errors: { row: number; error: string }[]
  message: string
}

export interface User {
  id: number
  email: string
  full_name: string | null
  is_active: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name?: string
}