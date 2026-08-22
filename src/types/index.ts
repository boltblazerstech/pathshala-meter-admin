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
export interface UserTrackingWindow {
  user_id: string
  user_name: string
  user_type: 'supervisor' | 'teacher'
  paathashaala_name: string
  start_time: string        // HH:MM 24-hr
  end_time: string          // HH:MM 24-hr
  interval_minutes: number
}

export interface UpdateWindowRequest {
  start_time: string
  end_time: string
  interval_minutes: number
  effective_from: string    // YYYY-MM-DD
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
  assigned_paathshaala_id: string | null   // null for supervisors (they pick one)
  assigned_paathshaala_name: string | null
  last_lat: number | null
  last_lng: number | null
  last_synced_at: string | null            // ISO-8601 in IST from serializer
  sync_status: 'online' | 'offline' | 'pending_sync'
}

export interface LiveSyncResponse {
  as_of: string   // ISO-8601 snapshot time
  users: LiveSyncStatus[]
}

/** Result from GET /locations/distance?user_id=X&paathashaala_id=Y */
export interface DistanceLookupResponse {
  user_id: string
  paathashaala_id: string
  distance_meters: number
  is_within_range: boolean   // true if ≤ 200m
}

// ── Export ────────────────────────────────────────────────────────────────────
export interface ExportRequest {
  from: string         // YYYY-MM-DD
  to: string           // YYYY-MM-DD
  user_id?: string     // specific user_id, or undefined/'all' for all users
  format?: 'csv' | 'xlsx'
}

// ── Generic API Error ─────────────────────────────────────────────────────────
export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string[]>
}
