// ---------------------------------------------------------------------------
// Domain types — compatible with both Spring Boot backend and MSW mocks.
// ---------------------------------------------------------------------------

// ── Pagination ───────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  content?: T[]
  data?: T[]
  total?: number
  totalElements?: number
  totalPages?: number
  page?: number
  size?: number
  limit?: number
  last?: boolean
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token?: string
  access_token?: string
  user?: AdminUser
}

export interface AdminUser {
  id: string
  name?: string
  email: string
  role?: 'super_admin' | 'admin'
}

// ── Paathshaalas ─────────────────────────────────────────────────────────────
export type CoordinateConfidence = 'parsed' | 'fallback' | 'manual' | 'unresolved' | 'HIGH' | 'LOW' | string

export interface Paathashaala {
  id: string
  name: string
  map_link?: string
  source_map_link?: string
  // Backend may return lat/lng or latitude/longitude — accept both
  lat?: number | null
  lng?: number | null
  latitude?: number | null
  longitude?: number | null
  address?: string
  coordinate_confidence?: CoordinateConfidence
  active?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface CreatePaathashaalaRequest {
  name: string
  map_link?: string
  latitude?: number | null
  longitude?: number | null
}

export type UpdatePaathashaalaRequest = Partial<CreatePaathashaalaRequest>

// ── Supervisors ──────────────────────────────────────────────────────────────
export interface Supervisor {
  id: string
  name: string
  phone?: string
  phone_number?: string
  active?: boolean
  is_active?: boolean
  last_location_lat?: number | null
  last_location_lng?: number | null
  last_location_at?: string | null
  selected_paathshaala_id?: string | null
  selected_paathshaala_name?: string | null
  latest_distance_meters?: number | null
  created_at?: string
  updated_at?: string
}

export interface CreateSupervisorRequest {
  name: string
  phone?: string
  phone_number?: string
}

export type UpdateSupervisorRequest = Partial<CreateSupervisorRequest> & {
  active?: boolean
  is_active?: boolean
}

// ── Teachers ─────────────────────────────────────────────────────────────────
export interface Teacher {
  id: string
  name: string
  phone?: string
  phone_number?: string
  paathshaala_id?: string
  assigned_paathshaala_id?: string
  paathshaala_name?: string
  paathashaala_name?: string
  active?: boolean
  is_active?: boolean
  last_location_lat?: number | null
  last_location_lng?: number | null
  last_location_at?: string | null
  latest_distance_meters?: number | null
  created_at?: string
  updated_at?: string
}

export interface CreateTeacherRequest {
  name: string
  phone?: string
  phone_number?: string
  paathshaala_id?: string
  assigned_paathshaala_id?: string
}

export type UpdateTeacherRequest = Partial<CreateTeacherRequest> & {
  active?: boolean
  is_active?: boolean
}

// ── Tracking Windows ─────────────────────────────────────────────────────────
export interface UserTrackingWindow {
  window_id?: string
  user_id: string
  user_name: string
  role?: string
  user_type?: 'supervisor' | 'teacher' | string
  paathshaala_name?: string
  paathashaala_name?: string
  start_time: string        // HH:MM 24-hr
  end_time: string          // HH:MM 24-hr
  interval_minutes: number
  effective_from_date?: string
  effective_from?: string
}

export interface UpdateWindowRequest {
  start_time: string
  end_time: string
  interval_minutes: number
  effective_from_date?: string
  effective_from?: string
}

export interface BulkUpdateWindowRequest extends UpdateWindowRequest {
  user_ids: string[]
}

// ── Live View / Sync Status (3f) ─────────────────────────────────────────────
export interface LiveSyncStatus {
  user_id: string
  user_name: string
  user_type: 'supervisor' | 'teacher'
  phone: string
  assigned_paathshaala_id: string | null
  assigned_paathshaala_name: string | null
  last_lat: number | null
  last_lng: number | null
  last_synced_at: string | null
  sync_status: 'online' | 'offline' | 'pending_sync'
}

export interface LiveSyncResponse {
  as_of: string
  users: LiveSyncStatus[]
}

/** Result from GET /locations/distance?user_id=X&paathashaala_id=Y */
export interface DistanceLookupResponse {
  user_id: string
  paathashaala_id: string
  distance_meters: number
  is_within_range: boolean
}

// ── Location Detail (Single User/Date) ───────────────────────────────────────
export interface UserLocationPoint {
  id: string
  captured_at: string
  received_at: string
  lat: number
  lng: number
  distance_meters: number | null
}

export interface UserLocationDetailResponse {
  user_id: string
  user_name: string
  user_role: 'supervisor' | 'teacher'
  date: string
  paathshaala_id?: string | null
  paathshaala_name?: string | null
  points: UserLocationPoint[]
}

// ── Export ────────────────────────────────────────────────────────────────────
export interface ExportRequest {
  from: string         // YYYY-MM-DD
  to: string           // YYYY-MM-DD
  user_id?: string
  format?: 'csv' | 'xlsx'
}

// ── Generic API Error ─────────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}
