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
let HEALING_INTERVAL = 30

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
  },
  {
    id: 'p4', name: 'Eastside Branch (Manual)', map_link: '',
    lat: 40.7580, lng: -73.9855, coordinate_confidence: 'manual',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'p5', name: 'Northside Point (Bad Link)', map_link: 'https://maps.app.goo.gl/deadlink',
    lat: 40.7128, lng: -74.0060, coordinate_confidence: 'unresolved',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
]

// ── Mock coordinate extraction helper ────────────────────────────────────────
function mockExtractCoords(map_link: string): { lat: number; lng: number; confidence: 'parsed' | 'fallback' | 'unresolved' } | null {
  if (!map_link) return null
  // Simulate short link failure (for demo purposes maps.app.goo.gl resolves but deadlink does not)
  if (map_link.includes('deadlink') || map_link.includes('bad')) {
    return null // triggers 'unresolved'
  }
  // Simulate parsed: URL contains numeric coords
  if (map_link.match(/[-\d]+\.\d+,\s*[-\d]+\.\d+/)) {
    const m = map_link.match(/([-\d]+\.\d+),\s*([-\d]+\.\d+)/)!
    return { lat: parseFloat(m[1]), lng: parseFloat(m[2]), confidence: 'parsed' }
  }
  // Fallback: URL has text but no explicit coords
  return { lat: 40.0 + Math.random() * 0.1, lng: -74.0 + Math.random() * 0.1, confidence: 'fallback' }
}


let SUPERVISORS: Supervisor[] = [
  {
    id: 's1', name: 'Super Admin', phone: '555-9001',
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    last_location_lat: 23.8051, last_location_lng: 86.4558, last_location_at: new Date(Date.now() - 5 * 60000).toISOString()
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
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    last_location_lat: 40.7130, last_location_lng: -74.0050, last_location_at: new Date(Date.now() - 15 * 60000).toISOString()
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

  // System Config
  http.get(`${API_BASE_URL}/system-config/healing-interval`, async () => {
    await delay(300)
    return HttpResponse.json(HEALING_INTERVAL)
  }),

  http.put(`${API_BASE_URL}/system-config/healing-interval`, async ({ request }) => {
    await delay(300)
    const val = await request.json()
    if (typeof val === 'number') {
      HEALING_INTERVAL = val
    }
    return HttpResponse.json({ success: true })
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
    const body = await request.json() as { name: string; map_link?: string; latitude?: number; longitude?: number }

    // Manual lat/lng takes priority — if both provided, skip link parsing
    let lat: number | null = null
    let lng: number | null = null
    let confidence: Paathashaala['coordinate_confidence'] = 'unresolved'

    if (body.latitude != null && body.longitude != null) {
      lat = body.latitude
      lng = body.longitude
      confidence = 'manual'
    } else if (body.map_link) {
      const extracted = mockExtractCoords(body.map_link)
      if (extracted) {
        lat = extracted.lat
        lng = extracted.lng
        confidence = extracted.confidence
      }
      // else: link failed to parse → lat/lng null, confidence 'unresolved'
    }

    const newP: Paathashaala = {
      id: `p${Date.now()}`,
      name: body.name,
      map_link: body.map_link || '',
      lat,
      lng,
      address: lat && lng ? `123 Main St, Near Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}` : undefined,
      coordinate_confidence: confidence,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    PAATHSHAALAS = [newP, ...PAATHSHAALAS]
    return HttpResponse.json(newP)
  }),

  // Also handle PUT (for updatePaathashaala which tries PUT first)
  http.put(`${API_BASE_URL}/paathshaalas/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string; map_link?: string; latitude?: number; longitude?: number }
    const index = PAATHSHAALAS.findIndex(p => p.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    const p = PAATHSHAALAS[index]
    let lat = p.lat
    let lng = p.lng
    let confidence = p.coordinate_confidence

    if (body.latitude != null && body.longitude != null) {
      // Manual override — trust the admin-entered coords
      lat = body.latitude
      lng = body.longitude
      confidence = 'manual'
    } else if (body.map_link !== undefined) {
      // Link updated — try to re-extract
      const extracted = mockExtractCoords(body.map_link)
      if (extracted) {
        lat = extracted.lat
        lng = extracted.lng
        confidence = extracted.confidence
      } else {
        // Link failed: KEEP previous lat/lng, but mark confidence unresolved
        confidence = 'unresolved'
      }
    }

    const updatedP: Paathashaala = {
      ...p,
      name: body.name ?? p.name,
      map_link: body.map_link ?? p.map_link,
      lat,
      lng,
      address: lat && lng ? `123 Main St, Near Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}` : undefined,
      coordinate_confidence: confidence,
      updated_at: new Date().toISOString()
    }
    PAATHSHAALAS[index] = updatedP
    return HttpResponse.json(updatedP)
  }),

  http.patch(`${API_BASE_URL}/paathshaalas/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string; map_link?: string; latitude?: number; longitude?: number }
    const index = PAATHSHAALAS.findIndex(p => p.id === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    const p = PAATHSHAALAS[index]
    let lat = p.lat
    let lng = p.lng
    let confidence = p.coordinate_confidence

    if (body.latitude != null && body.longitude != null) {
      lat = body.latitude
      lng = body.longitude
      confidence = 'manual'
    } else if (body.map_link !== undefined) {
      const extracted = mockExtractCoords(body.map_link)
      if (extracted) {
        lat = extracted.lat
        lng = extracted.lng
        confidence = extracted.confidence
      } else {
        confidence = 'unresolved'
      }
    }

    const updatedP: Paathashaala = {
      ...p,
      name: body.name ?? p.name,
      map_link: body.map_link ?? p.map_link,
      lat,
      lng,
      address: lat && lng ? `123 Main St, Near Lat ${lat.toFixed(2)}, Lng ${lng.toFixed(2)}` : undefined,
      coordinate_confidence: confidence,
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

  http.get(`${API_BASE_URL}/supervisors/:id`, async ({ params }) => {
    await delay(300)
    const s = SUPERVISORS.find(s => s.id === params.id)
    if (!s) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(s)
  }),

  http.post(`${API_BASE_URL}/supervisors`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { name: string, phone: string, password?: string }
    
    // Check uniqueness
    if (SUPERVISORS.some(s => s.phone === body.phone)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    const password = body.password || Math.floor(100000 + Math.random() * 900000).toString()

    const newS: Supervisor = {
      id: `s${Date.now()}`,
      name: body.name,
      phone: body.phone,
      password: password,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    SUPERVISORS = [newS, ...SUPERVISORS]
    return HttpResponse.json(newS)
  }),

  http.patch(`${API_BASE_URL}/supervisors/:id`, async ({ request, params }) => {
    await delay(600)
    const body = await request.json() as { name?: string, phone?: string, is_active?: boolean, password?: string }
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

  http.get(`${API_BASE_URL}/teachers/:id`, async ({ params }) => {
    await delay(300)
    const t = TEACHERS.find(t => t.id === params.id)
    if (!t) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json(t)
  }),

  http.post(`${API_BASE_URL}/teachers`, async ({ request }) => {
    await delay(600)
    const body = await request.json() as { name: string, phone: string, assigned_paathshaala_id: string, password?: string }
    
    // Check uniqueness
    if (TEACHERS.some(t => t.phone === body.phone)) {
      return HttpResponse.json({ message: "Phone number is already in use." }, { status: 409 })
    }

    const paathshaala = PAATHSHAALAS.find(p => p.id === body.assigned_paathshaala_id)
    if (!paathshaala) {
      return HttpResponse.json({ message: "Invalid paathshaala ID" }, { status: 400 })
    }

    const password = body.password || Math.floor(100000 + Math.random() * 900000).toString()

    const newT: Teacher = {
      id: `t${Date.now()}`,
      name: body.name,
      phone: body.phone,
      password: password,
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
    const body = await request.json() as { name?: string, phone?: string, assigned_paathshaala_id?: string, is_active?: boolean, password?: string }
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

  // POST /locations/request/:id
  http.post(`${API_BASE_URL}/locations/request/:id`, async ({ params }) => {
    await delay(300)
    
    // Simulate updating the user's location after a short delay
    setTimeout(() => {
      const sIdx = SUPERVISORS.findIndex(s => s.id === params.id)
      if (sIdx !== -1) {
        SUPERVISORS[sIdx] = { 
          ...SUPERVISORS[sIdx], 
          last_location_lat: (SUPERVISORS[sIdx].last_location_lat || 23.8) + Math.random() * 0.001,
          last_location_lng: (SUPERVISORS[sIdx].last_location_lng || 86.4) + Math.random() * 0.001,
          last_location_at: new Date().toISOString() 
        }
      }
      const tIdx = TEACHERS.findIndex(t => t.id === params.id)
      if (tIdx !== -1) {
        TEACHERS[tIdx] = { 
          ...TEACHERS[tIdx],
          last_location_lat: (TEACHERS[tIdx].last_location_lat || 40.7) + Math.random() * 0.001,
          last_location_lng: (TEACHERS[tIdx].last_location_lng || -74.0) + Math.random() * 0.001,
          last_location_at: new Date().toISOString() 
        }
      }
    }, 8000) // update after 8s so the UI has time to poll and wait

    return HttpResponse.json({ success: true })
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

    // If user is offline (no coords) or paathshaala has no coords, return a large distance
    const pLat = paathshaala.lat ?? paathshaala.latitude
    const pLng = paathshaala.lng ?? paathshaala.longitude
    const dist = (user.last_lat != null && user.last_lng != null && pLat != null && pLng != null)
      ? haversine(user.last_lat, user.last_lng, pLat, pLng)
      : 99999

    const result: DistanceLookupResponse = {
      user_id: userId,
      paathashaala_id: paathashaalaId,
      distance_meters: Math.round(dist),
      is_within_range: dist <= 200,
    }

    return HttpResponse.json(result)
  }),

  // Location Detail
  http.get(`${API_BASE_URL}/users/:id/locations/detail`, async ({ request, params }) => {
    await delay(500)
    const url = new URL(request.url)
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0]
    const paathshaalaId = url.searchParams.get('paathshaala_id')
    const userId = params.id as string

    // Find user to know role and name
    let role: 'supervisor' | 'teacher' = 'supervisor'
    let user_name = 'Unknown User'
    let assigned_paathshaala_id: string | undefined = undefined
    let paathshaala_name: string | undefined = undefined

    const sup = SUPERVISORS.find(s => s.id === userId)
    if (sup) {
      user_name = sup.name
      role = 'supervisor'
    } else {
      const teach = TEACHERS.find(t => t.id === userId)
      if (teach) {
        user_name = teach.name
        role = 'teacher'
        assigned_paathshaala_id = (teach as any).paathashaala_id || teach.paathshaala_id || undefined
        paathshaala_name = (teach as any).paathashaala_name || teach.paathshaala_name || undefined
      }
    }

    // Generate random points for the given date
    const targetPaathshaalaId = role === 'teacher' ? assigned_paathshaala_id : paathshaalaId
    const targetPaathshaala = PAATHSHAALAS.find(p => p.id === targetPaathshaalaId)
    
    // Create ~10 mock locations
    const locations = Array.from({ length: Math.floor(Math.random() * 5) + 3 }).map((_, i) => {
      // Mock random lat/lng close to paathshaala if provided, or random fallback
      let lat = 23.8 + (Math.random() * 0.05)
      let lng = 86.4 + (Math.random() * 0.05)
      let distance_meters: number | null = null

      if (targetPaathshaala) {
        const pLat = targetPaathshaala.lat ?? targetPaathshaala.latitude
        const pLng = targetPaathshaala.lng ?? targetPaathshaala.longitude
        if (pLat != null && pLng != null) {
          // add small random offset
          lat = pLat + (Math.random() * 0.01 - 0.005)
          lng = pLng + (Math.random() * 0.01 - 0.005)
          distance_meters = Math.round(haversine(lat, lng, pLat, pLng))
        }
      }

      // Random hours
      const hour = 8 + i
      const captured_at = `${hour.toString().padStart(2, '0')}:15:00`
      const received_at = `${hour.toString().padStart(2, '0')}:16:30`

      return {
        id: `loc_${i}`,
        captured_at,
        received_at,
        lat,
        lng,
        distance_meters,
      }
    }).sort((a, b) => b.captured_at.localeCompare(a.captured_at)) // desc order

    return HttpResponse.json({
      user_id: userId,
      user_name,
      user_role: role,
      date,
      paathshaala_id: assigned_paathshaala_id || null,
      paathshaala_name: paathshaala_name || null,
      points: date === '1970-01-01' ? [] : locations // way to test empty state
    })
  }),

  // Reverse Geocoding
  http.get(`${API_BASE_URL}/geocode/reverse`, async ({ request }) => {
    await delay(600)
    const url = new URL(request.url)
    const lat = url.searchParams.get('lat')
    const lng = url.searchParams.get('lng')
    
    if (!lat || !lng) {
      return new HttpResponse(null, { status: 400 })
    }

    // Simulate failure occasionally or specifically
    if (lat === '0' || lng === '0') {
      return new HttpResponse(null, { status: 404 })
    }

    return HttpResponse.json({
      address: `123 Main St, Near Lat ${parseFloat(lat).toFixed(2)}, Lng ${parseFloat(lng).toFixed(2)}, City, State, 12345`
    })
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
