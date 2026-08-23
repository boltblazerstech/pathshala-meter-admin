import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getUserLocationDetail } from '../../api/locations'
import { listPaathshaalas } from '../../api/paathshaalas'
import { AddressRevealProvider, useAddressRevealContext } from '../../contexts/AddressRevealContext'
import { AddressReveal } from '../../components/AddressReveal'
import { Table, type Column } from '../../components/Table'
import type { UserLocationPoint } from '../../types'

import { formatDistance } from '../../lib/format'

export function UserDetailPage({ role }: { role: 'supervisor' | 'teacher' }) {
  return (
    <AddressRevealProvider>
      <UserDetailContent role={role} />
    </AddressRevealProvider>
  )
}

function getSeconds(timeStr: string) {
  if (!timeStr) return 0
  const [h, m, s] = timeStr.split(':').map(Number)
  return (h * 3600) + (m * 60) + (s || 0)
}

function TimeCell({ captured, received }: { captured: string, received: string }) {
  const [showDetails, setShowDetails] = useState(false)
  
  const capSec = getSeconds(captured)
  const recSec = getSeconds(received)
  const diffSec = (recSec - capSec + 86400) % 86400 // handle midnight crossing
  const isDelayed = diffSec > 300 // > 5 mins
  
  const formatTime = (t: string) => t ? t.slice(0, 5) : '—'
  const formattedCap = formatTime(captured)
  const formattedRec = formatTime(received)

  if (isDelayed && showDetails) {
    return (
      <div className="text-xs">
        <div><span className="text-gray-500">Captured:</span> {formattedCap}</div>
        <div><span className="text-gray-500">Received:</span> <span className="text-red-600">{formattedRec}</span></div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span>{formattedCap}</span>
      {isDelayed && (
        <button 
          onClick={(e) => { e.stopPropagation(); setShowDetails(true) }}
          className="text-gray-400 hover:text-indigo-600 focus:outline-none"
          title="Received more than 5 minutes after capture"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
    </div>
  )
}

function UserDetailContent({ role }: { role: 'supervisor' | 'teacher' }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const revealContext = useAddressRevealContext()
  
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedPaathshaalaId, setSelectedPaathshaalaId] = useState<string>('')

  // Load paathshaalas for dropdown (Supervisors only)
  const { data: paathshaalasData } = useQuery({
    queryKey: ['paathshaalas', 'dropdown'],
    queryFn: () => listPaathshaalas({ limit: 1000, is_active: true }),
    enabled: role === 'supervisor',
    staleTime: 60_000,
  })

  // Load detail data
  const { data, isLoading } = useQuery({
    queryKey: ['user-location-detail', id, date, selectedPaathshaalaId],
    queryFn: () => getUserLocationDetail(id!, date, selectedPaathshaalaId),
    enabled: !!id,
  })

  const COLUMNS: Column<UserLocationPoint>[] = [
    {
      key: 'time',
      header: 'Captured Time',
      render: (row) => <TimeCell captured={row.captured_at} received={row.received_at} />
    },
    {
      key: 'coordinates',
      header: 'Location',
      render: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <a 
              href={`https://www.google.com/maps?q=${row.lat},${row.lng}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate"
            >
              {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
            </a>
            <AddressReveal lat={row.lat} lng={row.lng} />
          </div>
        </div>
      )
    },
    {
      key: 'distance',
      header: 'Distance',
      render: (row) => <span>{formatDistance(row.distance_meters)}</span>
    }
  ]

  const locations = data?.points ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="text-gray-500 hover:text-gray-700 font-medium text-sm"
          >
            &larr; Back
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {data?.user_name || 'Loading...'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-500 capitalize">
              <span>{role}</span>
              {role === 'teacher' && data?.paathshaala_name && (
                <>
                  <span>•</span>
                  <span>Assigned to: <strong className="text-gray-700">{data.paathshaala_name}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Select Date</label>
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        
        {role === 'supervisor' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Context Paathshaala (optional)</label>
            <select
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
              value={selectedPaathshaalaId}
              onChange={(e) => setSelectedPaathshaalaId(e.target.value)}
            >
              <option value="">Select paathshaala…</option>
              {(paathshaalasData?.content ?? paathshaalasData?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex-1" />
        
        <button
          onClick={revealContext?.triggerRevealAll}
          disabled={revealContext?.isRevealingAll || locations.length === 0}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {revealContext?.isRevealingAll ? (
            <>
              <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Resolving...
            </>
          ) : (
            'Show all addresses'
          )}
        </button>
      </div>

      {/* Table */}
      <Table<UserLocationPoint>
        columns={COLUMNS}
        data={locations}
        keyField="id"
        isLoading={isLoading}
        emptyMessage={`No location data for ${date}.`}
      />
    </div>
  )
}
