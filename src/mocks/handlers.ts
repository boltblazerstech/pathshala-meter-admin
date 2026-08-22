import { http, HttpResponse, delay } from 'msw'
import type {
  Paathashaala,
  Supervisor,
  Teacher,
  UserTrackingWindow,
  LiveSyncStatus,
  LiveSyncResponse,
  DistanceLookupResponse,
  ExportRequest,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.placeholder.local/api'

// ── Mock Data Generators ──────────────────────────────────────────────────────

let PAATHSHAALAS: Paathashaala[] = [
  {
    id: 'p1', name: 'Downtown Center', map_link: 'https://maps.google.com/?q=40.7128,-74.0060',
    lat: 40.7128, lng: -74.0060, coordinate_confidence: 'parsed',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'p2', name: 'Uptown Academy', map_link: 'https://maps.google.com/?q=uptown',
    lat: 40.7306, lng: -73.9866, coordinate_confidence: 'fallback',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'p3', name: 'Westside Hub (Inactive)', map_link: 'https://maps.google.com/?q=40.7484,-73.9857',
    lat: 40.7484, lng: -73.9857, coordinate_confidence: 'parsed',
    is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
]

let SUPERVISORS: Supervisor[] = [
  {
    id: 's1', name: 'Super Admin', phone: '555-9001',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 's2', name: 'Sarah Supervisor', phone: '555-9002',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
]

let TEACHERS: Teacher[] = [
  {
    id: 't1', name: 'Tom Teacher', phone: '555-8001',
    assigned_paathshaala_id: 'p1', paathashaala_name: 'Downtown Center',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 't2', name: 'Tina Tutor', phone: '555-8002',
    assigned_paathshaala_id: 'p1', paathashaala_name: 'Downtown Center',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 't3', name: 'Tim Trainer', phone: '555-8003',
    assigned_paathshaala_id: 'p2', paathashaala_name: 'Uptown Academy',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
]

// Map of user_id to their active tracking window configuration
const USER_WINDOWS: Record<string, { start_time: string, end_time: string, interval_minutes: number }> = {
  's1': { start_time: '08:00', end_time: '14:00', interval_minutes: 30 },
  't1': { start_time: '08:00', end_time: '15:00', interval_minutes: 60 },
}

// ── Haversine distance (meters) — used by mock distance endpoint ────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Mock IST timestamp formatter (UTC+5:30)
function nowIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
}

// Generate live sync status rows for every active supervisor + teacher
function generateLiveSyncUsers(): LiveSyncStatus[] {
  const syncStatuses: ('online' | 'offline' | 'pending_sync')[] = ['online', 'offline', 'pending_sync']
  const users: LiveSyncStatus[] = []

  for (const s of SUPERVISORS) {
    if (!s.is_active && !s.active) continue
    const status = syncStatuses[Math.floor(Math.random() * syncStatuses.length)]
    users.push({
      user_id: s.id,
      user_name: s.name,
      user_type: 'supervisor',
      phone: s.phone_number || s.phone || '',
      assigned_paathshaala_id: null,   // supervisors don't have a fixed assignment
      assigned_paathshaala_name: null,
      last_lat: status !== 'offline' ? 40.7128 + (Math.random() - 0.5) * 0.005 : null,
      last_lng: status !== 'offline' ? -74.0060 + (Math.random() - 0.5) * 0.005 : null,
      last_synced_at: status !== 'offline' ? nowIST() : null,
      sync_status: status,
    })
  }

  for (const t of TEACHERS) {
    if (!t.is_active && !t.active) continue
    const status = syncStatuses[Math.floor(Math.random() * syncStatuses.length)]
    users.push({
      user_id: t.id,
      user_name: t.name,
      user_type: 'teacher',
      phone: t.phone_number || t.phone || '',
      assigned_paathshaala_id: t.paathshaala_id || t.assigned_paathshaala_id || null,
      assigned_paathshaala_name: t.paathshaala_name || t.paathashaala_name || null,
      last_lat: status !== 'offline' ? 40.7128 + (Math.random() - 0.5) * 0.005 : null,
      last_lng: status !== 'offline' ? -74.0060 + (Math.random() - 0.5) * 0.005 : null,
      last_synced_at: status !== 'offline' ? nowIST() : null,
      sync_status: status,
    })
  }

  return users
}

export const handlers = [
  // Auth
  http.post(`${API_BASE_URL}/auth/login`, async () => {
    await delay(800)
    return HttpResponse.json({
      access_token: 'mock-access-token',
      user: { id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'admin' }
    })
  }),

  http.get(`${API_BASE_URL}/auth/me`, async () => {
    await delay(300)
    return HttpResponse.json({
      id: 'u1', name: 'Admin User', email: 'admin@example.com', role: 'admin'
    })
  }),

  http.post(`${API_BASE_URL}/auth/logout`, async () => {
    await delay(300)
    return HttpResponse.json({ success: true })
  }),

  // Paathshaalas
  http.get(`${API_BASE_URL}/paathshaalas`, async ({ request }) => {
    await delay(500)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let filtered = PAATHSHAALAS
    if (search) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(search))
    }

    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    return HttpResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit
    })
  }),

  http.post(`${API_BASE_URL}/paathshaalas`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { name: string, map_link: string }
    const isFallback = !body.map_link.includes(',') // simple mock parsing logic
    const newP: Paathashaala = {
      id: `p${Date.now()}`,
      name: body.name,
      map_link: body.map_link,
      lat: isFallback ? 40.0 : 40.7128,
      lng: isFallback ? -73.0 : -74.0060,
      coordinate_confidence: isFallback ? 'fallback' : 'parsed',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    PAATHSHAALAS = [newP, ...PAATHSHAALAS]
    return HttpResponse.json(newP)
  }),

  http.patch(`${API_BASE_URL}/paathshaalas/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string, map_link?: string }
    const index = PAATHSHAALAS.findIndex(p => p.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    const p = PAATHSHAALAS[index]
    const map_link = body.map_link ?? p.map_link ?? ''
    const isFallback = !map_link.includes(',')

    const updatedP = {
      ...p,
      ...body,
      lat: body.map_link ? (isFallback ? 40.0 : 40.7128) : p.lat,
      lng: body.map_link ? (isFallback ? -73.0 : -74.0060) : p.lng,
      coordinate_confidence: body.map_link ? (isFallback ? 'fallback' as const : 'parsed' as const) : p.coordinate_confidence,
      updated_at: new Date().toISOString()
    }
    PAATHSHAALAS[index] = updatedP
    return HttpResponse.json(updatedP)
  }),

  http.delete(`${API_BASE_URL}/paathshaalas/:id`, async ({ params }) => {
    await delay(500)
    if (params.id === 'p1') {
      return HttpResponse.json({ message: "Cannot delete paathshaala: still assigned to teachers or tracking windows." }, { status: 400 })
    }
    PAATHSHAALAS = PAATHSHAALAS.filter(p => p.id !== params.id)
    return HttpResponse.json({ success: true })
  }),

  // Supervisors
  http.get(`${API_BASE_URL}/supervisors`, async ({ request }) => {
    await delay(500)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let filtered = SUPERVISORS
    if (search) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || (s.phone_number || s.phone || '').includes(search))
    }

    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    return HttpResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit
    })
  }),

  http.post(`${API_BASE_URL}/supervisors`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { name: string, phone: string }
    
    // Check uniqueness
    if (SUPERVISORS.some(s => s.phone === body.phone)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    const newS: Supervisor = {
      id: `s${Date.now()}`,
      name: body.name,
      phone: body.phone,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    SUPERVISORS = [newS, ...SUPERVISORS]
    return HttpResponse.json(newS)
  }),

  http.patch(`${API_BASE_URL}/supervisors/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string, phone?: string, is_active?: boolean }
    const index = SUPERVISORS.findIndex(s => s.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    // Check uniqueness (exclude self)
    if (body.phone && SUPERVISORS.some(s => s.phone === body.phone && s.id !== params.id)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    const updatedS = {
      ...SUPERVISORS[index],
      ...body,
      updated_at: new Date().toISOString()
    }
    SUPERVISORS[index] = updatedS
    return HttpResponse.json(updatedS)
  }),

  http.delete(`${API_BASE_URL}/supervisors/:id`, async ({ params }) => {
    await delay(500)
    const index = SUPERVISORS.findIndex(s => s.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    // Soft delete behavior matches 3d -> mark inactive instead of removing
    SUPERVISORS[index] = {
      ...SUPERVISORS[index],
      is_active: false,
      updated_at: new Date().toISOString()
    }
    
    return HttpResponse.json({ success: true })
  }),

  // Teachers
  http.get(`${API_BASE_URL}/teachers`, async ({ request }) => {
    await delay(500)
    const url = new URL(request.url)
    const search = url.searchParams.get('search')?.toLowerCase()
    const page = parseInt(url.searchParams.get('page') || '1', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)

    let filtered = TEACHERS
    if (search) {
      filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || (t.phone_number || t.phone || '').includes(search))
    }

    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    return HttpResponse.json({
      data: paginated,
      total: filtered.length,
      page,
      limit
    })
  }),

  http.post(`${API_BASE_URL}/teachers`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { name: string, phone: string, assigned_paathshaala_id: string }
    
    // Check uniqueness
    if (TEACHERS.some(t => t.phone === body.phone)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    const paathshaala = PAATHSHAALAS.find(p => p.id === body.assigned_paathshaala_id)
    if (!paathshaala) {
      return HttpResponse.json({ message: "Invalid paathshaala ID" }, { status: 400 })
    }

    const newT: Teacher = {
      id: `t${Date.now()}`,
      name: body.name,
      phone: body.phone,
      assigned_paathshaala_id: body.assigned_paathshaala_id,
      paathashaala_name: paathshaala.name,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    TEACHERS = [newT, ...TEACHERS]
    return HttpResponse.json(newT)
  }),

  http.patch(`${API_BASE_URL}/teachers/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string, phone?: string, assigned_paathshaala_id?: string, is_active?: boolean }
    const index = TEACHERS.findIndex(t => t.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    // Check uniqueness (exclude self)
    if (body.phone && TEACHERS.some(t => t.phone === body.phone && t.id !== params.id)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    let paathashaala_name = TEACHERS[index].paathashaala_name
    if (body.assigned_paathshaala_id) {
      const paathshaala = PAATHSHAALAS.find(p => p.id === body.assigned_paathshaala_id)
      if (paathshaala) {
        paathashaala_name = paathshaala.name
      }
    }

    const updatedT = {
      ...TEACHERS[index],
      ...body,
      paathashaala_name,
      updated_at: new Date().toISOString()
    }
    TEACHERS[index] = updatedT
    return HttpResponse.json(updatedT)
  }),

  http.delete(`${API_BASE_URL}/teachers/:id`, async ({ params }) => {
    await delay(500)
    const index = TEACHERS.findIndex(t => t.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    // Soft delete behavior matches 3d -> mark inactive instead of removing
    TEACHERS[index] = {
      ...TEACHERS[index],
      is_active: false,
      updated_at: new Date().toISOString()
    }
    
    return HttpResponse.json({ success: true })
  }),

  // Tracking Windows
  http.get(`${API_BASE_URL}/tracking-windows`, async () => {
    await delay(500)
    // Ignore date for mock purposes, just return all users with their current windows
    const users: UserTrackingWindow[] = []
    
    // Default window if unassigned
    const defaultWindow = { start_time: '08:00', end_time: '16:00', interval_minutes: 30 }

    for (const s of SUPERVISORS) {
      if (!s.is_active) continue
      const w = USER_WINDOWS[s.id] || defaultWindow
      users.push({
        user_id: s.id,
        user_name: s.name,
        user_type: 'supervisor',
        paathashaala_name: 'N/A', // Assuming supervisors in this context might not have it displayed, or we can look it up
        start_time: w.start_time,
        end_time: w.end_time,
        interval_minutes: w.interval_minutes
      })
    }

    for (const t of TEACHERS) {
      if (!t.is_active) continue
      const w = USER_WINDOWS[t.id] || defaultWindow
      users.push({
        user_id: t.id,
        user_name: t.name,
        user_type: 'teacher',
        paathashaala_name: t.paathashaala_name,
        start_time: w.start_time,
        end_time: w.end_time,
        interval_minutes: w.interval_minutes
      })
    }

    return HttpResponse.json(users) // not paginated for bulk-apply ease, or wrap in data array
  }),

  http.put(`${API_BASE_URL}/tracking-windows/:id`, async ({ request, params }) => {
    await delay(400)
    const body = await request.json() as { start_time: string, end_time: string, interval_minutes: number, effective_from: string }
    
    USER_WINDOWS[params.id as string] = {
      start_time: body.start_time,
      end_time: body.end_time,
      interval_minutes: body.interval_minutes
    }

    return HttpResponse.json({ success: true })
  }),

  http.post(`${API_BASE_URL}/tracking-windows/bulk`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { user_ids: string[], start_time: string, end_time: string, interval_minutes: number, effective_from: string }
    
    for (const uid of body.user_ids) {
      USER_WINDOWS[uid] = {
        start_time: body.start_time,
        end_time: body.end_time,
        interval_minutes: body.interval_minutes
      }
    }

    return HttpResponse.json({ success: true })
  }),

  // Locations / Live Sync — TODO [3f]: GET /api/admin/locations/live
  http.get(`${API_BASE_URL}/locations/live`, async () => {
    await delay(400)
    const response: LiveSyncResponse = {
      as_of: new Date().toISOString(),
      users: generateLiveSyncUsers()
    }
    return HttpResponse.json(response)
  }),

  // Distance Lookup — TODO [3f]: GET /api/admin/locations/distance?user_id=X&paathashaala_id=Y
  http.get(`${API_BASE_URL}/locations/distance`, async ({ request }) => {
    await delay(300)
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')!
    const paathashaalaId = url.searchParams.get('paathashaala_id')!

    // Find user's last known location from our mock set
    const allUsers = generateLiveSyncUsers()
    const user = allUsers.find(u => u.user_id === userId)
    const paathshaala = PAATHSHAALAS.find(p => p.id === paathashaalaId)

    if (!user || !paathshaala) {
      return new HttpResponse(null, { status: 404 })
    }

    // If user is offline (no coords), return a large distance
    const dist = (user.last_lat != null && user.last_lng != null)
      ? haversine(user.last_lat, user.last_lng, paathshaala.lat, paathshaala.lng)
      : 99999

    const result: DistanceLookupResponse = {
      user_id: userId,
      paathashaala_id: paathashaalaId,
      distance_meters: Math.round(dist),
      is_within_range: dist <= 200,
    }

    return HttpResponse.json(result)
  }),

  // Export — returns a mocked CSV blob response
  http.post(`${API_BASE_URL}/export`, async ({ request }) => {
    await delay(800)
    let body: Partial<ExportRequest> = {}
    try {
      body = (await request.json()) as Partial<ExportRequest>
    } catch {
      // no-op
    }

    const fromDate = body.from || '2026-08-01'
    const toDate = body.to || '2026-08-22'
    const filterUserId = body.user_id && body.user_id !== 'all' ? body.user_id : null

    const allUsers = [
      ...SUPERVISORS.map(s => ({ id: s.id, name: s.name, role: 'Supervisor', school: 'N/A' })),
      ...TEACHERS.map(t => ({ id: t.id, name: t.name, role: 'Teacher', school: t.paathashaala_name })),
    ]

    const selectedUsers = filterUserId
      ? allUsers.filter(u => u.id === filterUserId)
      : allUsers

    const header = 'Date,User ID,User Name,Role,Assigned Paathshaala,Window Start,Window End,Sync Status,Distance (m),Presence Status\n'
    const rows: string[] = []

    for (const u of selectedUsers) {
      rows.push(
        `${fromDate},"${u.id}","${u.name}","${u.role}","${u.school}","08:00","15:00","online","64","Present"`
      )
      if (fromDate !== toDate) {
        rows.push(
          `${toDate},"${u.id}","${u.name}","${u.role}","${u.school}","08:00","15:00","online","112","Present"`
        )
      }
    }

    const csvContent = header + rows.join('\n')

    return new HttpResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="attendance_export_${fromDate}_to_${toDate}.csv"`,
      },
    })
  })
]
