import { http, HttpResponse, delay } from 'msw'
import type {
  Paathashaala,
  Supervisor,
  Teacher,
  TrackingWindow,
  LocationPing,
  PaginatedResponse,
  LiveViewResponse
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

const TRACKING_WINDOWS: TrackingWindow[] = [
  {
    id: 'w1', paathashaala_id: 'p1', paathashaala_name: 'Downtown Center',
    label: 'Morning Session', start_time: '08:00', end_time: '12:00',
    days_of_week: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], interval_minutes: 30,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  },
  {
    id: 'w2', paathashaala_id: 'p2', paathashaala_name: 'Uptown Academy',
    label: 'Afternoon Session', start_time: '13:00', end_time: '17:00',
    days_of_week: ['Mon', 'Wed', 'Fri'], interval_minutes: 60,
    is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }
]

// Generate slightly randomized pings for Live View
function generateLivePings(): LocationPing[] {
  const statuses: ('on_time' | 'late' | 'absent')[] = ['on_time', 'late', 'absent']
  return TEACHERS.map((t, i) => ({
    teacher_id: t.id,
    teacher_name: t.name,
    paathashaala_id: t.assigned_paathshaala_id,
    paathashaala_name: t.paathashaala_name,
    lat: 40.7128 + (Math.random() - 0.5) * 0.01,
    lng: -74.0060 + (Math.random() - 0.5) * 0.01,
    coordinate_confidence: 0.8 + Math.random() * 0.2,
    timestamp: new Date(Date.now() - Math.random() * 600000).toISOString(),
    window_id: i % 2 === 0 ? 'w1' : 'w2',
    window_label: i % 2 === 0 ? 'Morning Session' : 'Afternoon Session',
    status: statuses[Math.floor(Math.random() * statuses.length)]
  }))
}

// ── Handlers ──────────────────────────────────────────────────────────────────

function wrap<T>(data: T[]): PaginatedResponse<T> {
  return {
    data,
    total: data.length,
    page: 1,
    limit: 50
  }
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
    const map_link = body.map_link ?? p.map_link
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
      filtered = filtered.filter(s => s.name.toLowerCase().includes(search) || s.phone.includes(search))
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
      filtered = filtered.filter(t => t.name.toLowerCase().includes(search) || t.phone.includes(search))
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
    return HttpResponse.json(wrap(TRACKING_WINDOWS))
  }),

  // Locations / Live View
  http.get(`${API_BASE_URL}/locations/live`, async () => {
    await delay(400)
    const response: LiveViewResponse = {
      as_of: new Date().toISOString(),
      pings: generateLivePings()
    }
    return HttpResponse.json(response)
  }),

  // Export
  http.post(`${API_BASE_URL}/export`, async () => {
    await delay(1500)
    return HttpResponse.json({
      download_url: 'https://example.com/mock-export.xlsx',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    })
  })
]
