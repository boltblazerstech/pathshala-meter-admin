import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPaathashaala, updatePaathashaala } from '../../api/paathshaalas'
import { Modal } from '../../components/Modal'
import { FormField } from '../../components/FormField'
import type { Paathashaala, CreatePaathashaalaRequest } from '../../types'

interface PaathashaalaModalProps {
  isOpen: boolean
  onClose: () => void
  paathashaala?: Paathashaala | null
}

// ── Confidence badge — all four states ───────────────────────────────────────
function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  const conf = (confidence || '').toLowerCase()

  if (conf === 'parsed' || conf === 'high') {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
        ✓ High confidence — parsed directly from link
      </span>
    )
  }
  if (conf === 'manual') {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        ✎ Manual — entered by admin, fully trusted
      </span>
    )
  }
  if (conf === 'unresolved') {
    return (
      <div className="space-y-1">
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          ⚠ Unresolved — link couldn't be read
        </span>
        <p className="text-xs text-red-600">
          Showing previous coordinates (may be stale). Please verify them or enter correct coordinates manually below.
        </p>
      </div>
    )
  }
  // fallback / LOW
  return (
    <div className="space-y-1">
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
        ~ Low confidence — fallback text search
      </span>
      <p className="text-xs text-yellow-600">
        The link didn't contain exact coordinates. Please verify the displayed location.
      </p>
    </div>
  )
}

export function PaathashaalaModal({ isOpen, onClose, paathashaala }: PaathashaalaModalProps) {
  const queryClient = useQueryClient()

  const [step, setStep] = useState<'form' | 'result'>('form')
  const [form, setForm] = useState<CreatePaathashaalaRequest & { latStr: string; lngStr: string }>({
    name: '',
    map_link: '',
    latitude: null,
    longitude: null,
    latStr: '',
    lngStr: '',
  })
  const [resultData, setResultData] = useState<Paathashaala | null>(null)

  // Reset form when modal opens or paathashaala changes
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setResultData(null)
      if (paathashaala) {
        const lat = paathashaala.lat ?? paathashaala.latitude
        const lng = paathashaala.lng ?? paathashaala.longitude
        setForm({
          name: paathashaala.name,
          map_link: paathashaala.map_link || paathashaala.source_map_link || '',
          latitude: lat ?? null,
          longitude: lng ?? null,
          latStr: lat != null ? String(lat) : '',
          lngStr: lng != null ? String(lng) : '',
        })
      } else {
        setForm({ name: '', map_link: '', latitude: null, longitude: null, latStr: '', lngStr: '' })
      }
    }
  }, [isOpen, paathashaala])

  const createMutation = useMutation({
    mutationFn: createPaathashaala,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['paathshaalas'] })
      setResultData(data)
      setStep('result')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CreatePaathashaalaRequest) =>
      updatePaathashaala(resultData?.id || paathashaala!.id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['paathshaalas'] })
      setResultData(data)
      setStep('result')
    },
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const isEditing = !!paathashaala || !!resultData

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Parse manual lat/lng inputs
    const parsedLat = form.latStr.trim() !== '' ? parseFloat(form.latStr) : null
    const parsedLng = form.lngStr.trim() !== '' ? parseFloat(form.lngStr) : null
    const hasManualCoords = parsedLat != null && !isNaN(parsedLat) && parsedLng != null && !isNaN(parsedLng)

    const payload: CreatePaathashaalaRequest = {
      name: form.name,
      map_link: form.map_link || undefined,
      latitude: hasManualCoords ? parsedLat : undefined,
      longitude: hasManualCoords ? parsedLng : undefined,
    }

    if (isEditing) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  function handleEditAgain() {
    setStep('form')
  }

  const resultLat = resultData?.lat ?? resultData?.latitude
  const resultLng = resultData?.lng ?? resultData?.longitude
  const resultConf = resultData?.coordinate_confidence

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Paathashaala' : 'Add Paathashaala'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="name"
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          {/* ── Map Link ─────────────────────────────────────────── */}
          <div>
            <label htmlFor="map_link" className="block text-sm font-medium text-gray-700 mb-1">
              Map Link <span className="text-gray-400 font-normal">(optional if entering coordinates manually)</span>
            </label>
            <input
              id="map_link"
              type="text"
              placeholder="Paste short or long Google Maps URL…"
              value={form.map_link}
              onChange={(e) => setForm((f) => ({ ...f, map_link: e.target.value }))}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Supports long-form (<code>maps.google.com/…</code>) and short-form (<code>maps.app.goo.gl/…</code>) links.
              The backend resolves redirects automatically.
            </p>
          </div>

          {/* ── Manual Lat / Lng ──────────────────────────────────── */}
          <fieldset className="rounded-md border border-gray-200 p-3">
            <legend className="px-1 text-xs font-medium text-gray-500">
              Manual Coordinates <span className="text-gray-400">(override or fallback — leave blank to use link)</span>
            </legend>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label htmlFor="latitude" className="block text-xs font-medium text-gray-600 mb-1">Latitude</label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 23.8051"
                  value={form.latStr}
                  onChange={(e) => setForm((f) => ({ ...f, latStr: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="longitude" className="block text-xs font-medium text-gray-600 mb-1">Longitude</label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 86.4558"
                  value={form.lngStr}
                  onChange={(e) => setForm((f) => ({ ...f, lngStr: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              If both latitude and longitude are filled, they take priority over the map link. Confidence will be set to <strong>manual</strong>.
            </p>
          </fieldset>

          {(createMutation.isError || updateMutation.isError) && (
            <p className="text-sm text-red-600">
              {(createMutation.error as any)?.response?.data?.message || (updateMutation.error as any)?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          )}

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !form.name.trim()}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Save & Extract Coords'}
            </button>
          </div>
        </form>
      ) : (
        // ── Result step ──────────────────────────────────────────────────────
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-800 mb-3">Coordinate Result</h3>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {resultLat != null ? resultLat : <span className="text-gray-400">—</span>}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {resultLng != null ? resultLng : <span className="text-gray-400">—</span>}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 mb-1">Confidence</dt>
                <dd><ConfidenceBadge confidence={resultConf} /></dd>
              </div>
              {resultData?.address && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500 mb-1">Address</dt>
                  <dd className="text-sm text-gray-900">{resultData.address}</dd>
                </div>
              )}
              {resultLat != null && resultLng != null && (
                <div className="sm:col-span-2">
                  <a
                    href={`https://www.google.com/maps?q=${resultLat},${resultLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    → Open in Google Maps to verify
                  </a>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleEditAgain}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {resultConf === 'unresolved' ? 'Fix / Enter Manually' : 'Edit'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Looks Good
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
