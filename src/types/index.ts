// ---------------------------------------------------------------------------
// Domain types — field names match Step 3 backend DTOs exactly (snake_case).
// Nothing needs renaming when mocks are swapped for the real backend.
// ---------------------------------------------------------------------------

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: AdminUser
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin'
}

// ── Paathshaalas ─────────────────────────────────────────────────────────────
export interface Paathashaala {
  id: string
  name: string
  map_link: string
  lat: number
  lng: number
  coordinate_confidence: 'parsed' | 'fallback'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreatePaathashaalaRequest {
  name: string
  map_link: string
}

export type UpdatePaathashaalaRequest = Partial<CreatePaathashaalaRequest>

// ── Supervisors ──────────────────────────────────────────────────────────────
export interface Supervisor {
  id: string
  name: string
  phone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateSupervisorRequest {
  name: string
  phone: string
}

export type UpdateSupervisorRequest = Partial<CreateSupervisorRequest> & {
  is_active?: boolean
}

// ── Teachers ─────────────────────────────────────────────────────────────────
export interface Teacher {
  id: string
  name: string
  phone: string
  assigned_paathshaala_id: string
  paathashaala_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTeacherRequest {
  name: string
  phone: string
  assigned_paathshaala_id: string
}

export type UpdateTeacherRequest = Partial<CreateTeacherRequest> & {
  is_active?: boolean
}

// ── Tracking Windows ─────────────────────────────────────────────────────────
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'

export interface TrackingWindow {
  id: string
  paathashaala_id: string
  paathashaala_name: string
  label: string
  start_time: string        // HH:MM 24-hr
  end_time: string          // HH:MM 24-hr
  days_of_week: DayOfWeek[]
  interval_minutes: number  // how often a teacher must ping within the window
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateTrackingWindowRequest {
  paathashaala_id: string
  label: string
  start_time: string
  end_time: string
  days_of_week: DayOfWeek[]
  interval_minutes: number
}

export type UpdateTrackingWindowRequest = Partial<CreateTrackingWindowRequest>

// ── Locations / Live View ────────────────────────────────────────────────────
export interface LocationPing {
  teacher_id: string
  teacher_name: string
  paathashaala_id: string
  paathashaala_name: string
  lat: number
  lng: number
  coordinate_confidence: number   // 0–1 accuracy confidence score
  timestamp: string               // ISO-8601
  window_id: string
  window_label: string
  status: 'on_time' | 'late' | 'absent'
}

export interface LiveViewResponse {
  as_of: string   // ISO-8601 snapshot time
  pings: LocationPing[]
}

// ── Export ────────────────────────────────────────────────────────────────────
export interface ExportRequest {
  paathashaala_id?: string
  teacher_id?: string
  from: string     // YYYY-MM-DD
  to: string       // YYYY-MM-DD
  format: 'csv' | 'xlsx'
}

export interface ExportResponse {
  download_url: string
  expires_at: string
}

// ── Generic API Error ─────────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}
