import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLiveSync, getDistanceLookup } from '../../api/locations'
import { listPaathshaalas } from '../../api/paathshaalas'
import { AddressReveal } from '../../components/AddressReveal'
import { formatDistance } from '../../lib/format'
import type { LiveSyncStatus, DistanceLookupResponse } from '../../types'

/** Refetch every 30 seconds — swap to WebSocket/SSE once real backend is live */
const REFETCH_INTERVAL = 30_000

// ── Sync-status badge ────────────────────────────────────────────────────────
function SyncBadge({ status }: { status: LiveSyncStatus['sync_status'] }) {
  const map = {
    online:       { label: 'Online',       bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
    offline:      { label: 'Offline',      bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
    pending_sync: { label: 'Pending Sync', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  } as const
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Distance result display ──────────────────────────────────────────────────
function DistanceDisplay({ result, isLoading }: { result: DistanceLookupResponse | null; isLoading: boolean }) {
  if (isLoading) {
    return <span className="text-xs text-gray-400 italic">Checking…</span>
  }
  if (!result) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const label = formatDistance(result.distance_meters)

  if (result.is_within_range) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        {label} — Present
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
      {label} — Outside range
    </span>
  )
}

// ── Per-row distance hook ────────────────────────────────────────────────────
function useDistanceLookup(userId: string, paathashaalaId: string | null) {
  const [result, setResult] = useState<DistanceLookupResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!paathashaalaId) {
      setResult(null)
      return
    }
    let cancelled = false
    setLoading(true)
    // TODO [3f]: GET /api/admin/locations/distance — wire to real backend
    getDistanceLookup(userId, paathashaalaId)
      .then((data) => { if (!cancelled) setResult(data) })
      .catch(() => { if (!cancelled) setResult(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, paathashaalaId])

  return { result, loading }
}

// ── Supervisor row (with paathshaala dropdown) ───────────────────────────────
function SupervisorRow({ user }: { user: LiveSyncStatus }) {
  const [selectedPaathashaalaId, setSelectedPaathashaalaId] = useState<string | null>(null)
  const { result, loading } = useDistanceLookup(user.user_id, selectedPaathashaalaId)

  // Load paathshaalas for dropdown
  const { data: paathshaalasData } = useQuery({
    queryKey: ['paathshaalas', 'dropdown'],
    queryFn: () => listPaathshaalas({ limit: 1000, is_active: true }),
    staleTime: 60_000,
  })

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{user.user_name}</div>
        <div className="text-xs text-gray-500">Supervisor · {user.phone}</div>
      </td>
      <td className="px-4 py-3">
        <SyncBadge status={user.sync_status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {user.last_synced_at ?? <span className="text-gray-400 italic">Never</span>}
      </td>
      <td className="px-4 py-3">
        <select
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full"
          value={selectedPaathashaalaId ?? ''}
          onChange={(e) => setSelectedPaathashaalaId(e.target.value || null)}
        >
          <option value="">Select paathshaala…</option>
          {(paathshaalasData?.content ?? paathshaalasData?.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {user.last_lat != null && user.last_lng != null ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs">{user.last_lat.toFixed(4)}, {user.last_lng.toFixed(4)}</span>
              <AddressReveal lat={user.last_lat} lng={user.last_lng} />
            </div>
          </div>
        ) : (
          <span className="text-gray-400 italic text-xs">Unknown</span>
        )}
      </td>
      <td className="px-4 py-3">
        <DistanceDisplay result={result} isLoading={loading} />
      </td>
    </tr>
  )
}

// ── Teacher row (distance is automatic) ──────────────────────────────────────
function TeacherRow({ user }: { user: LiveSyncStatus }) {
  // Teachers always have an assigned paathshaala — distance lookup is automatic
  const { result, loading } = useDistanceLookup(user.user_id, user.assigned_paathshaala_id)

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{user.user_name}</div>
        <div className="text-xs text-gray-500">Teacher · {user.phone}</div>
      </td>
      <td className="px-4 py-3">
        <SyncBadge status={user.sync_status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {user.last_synced_at ?? <span className="text-gray-400 italic">Never</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {user.assigned_paathshaala_name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">
        {user.last_lat != null && user.last_lng != null ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs">{user.last_lat.toFixed(4)}, {user.last_lng.toFixed(4)}</span>
              <AddressReveal lat={user.last_lat} lng={user.last_lng} />
            </div>
          </div>
        ) : (
          <span className="text-gray-400 italic text-xs">Unknown</span>
        )}
      </td>
      <td className="px-4 py-3">
        <DistanceDisplay result={result} isLoading={loading} />
      </td>
    </tr>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export function LiveViewPage() {
  // TODO [3f]: GET /api/admin/locations/live — this is the single endpoint
  // that powers the entire page. Replace mock with real backend URL via
  // VITE_API_BASE_URL when 3f is deployed.
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['liveView'],
    queryFn: () => getLiveSync(),
    refetchInterval: REFETCH_INTERVAL,
  })

  const users = data?.users ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Live View</h2>
          <p className="text-sm text-gray-500">
            Real-time sync status for all supervisors and teachers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {data?.as_of && (
            <span className="text-xs text-gray-400">
              Snapshot: {new Date(data.as_of).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {dataUpdatedAt
              ? `Fetched ${new Date(dataUpdatedAt).toLocaleTimeString()}`
              : ''}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Online</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Pending Sync</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-400" /> Offline</span>
        <span className="mx-2 border-l border-gray-300" />
        <span className="flex items-center gap-1"><span className="inline-block h-3 rounded bg-green-100 px-1 text-green-800 font-medium">Present</span> ≤ 200 m</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 rounded bg-red-100 px-1 text-red-800 font-medium">Outside</span> &gt; 200 m</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Last Synced (IST)</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Paathashaala</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Coordinates</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Distance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Loading live data…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No active users found.
                  </td>
                </tr>
              ) : (
                users.map((user) =>
                  user.user_type === 'supervisor' ? (
                    <SupervisorRow key={user.user_id} user={user} />
                  ) : (
                    <TeacherRow key={user.user_id} user={user} />
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
