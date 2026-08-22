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

export function PaathashaalaModal({ isOpen, onClose, paathashaala }: PaathashaalaModalProps) {
  const queryClient = useQueryClient()
  
  const [step, setStep] = useState<'form' | 'result'>('form')
  const [form, setForm] = useState<CreatePaathashaalaRequest>({ name: '', map_link: '' })
  const [resultData, setResultData] = useState<Paathashaala | null>(null)

  // Reset form when modal opens or paathashaala prop changes
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setResultData(null)
      if (paathashaala) {
        setForm({ name: paathashaala.name, map_link: paathashaala.map_link })
      } else {
        setForm({ name: '', map_link: '' })
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
    mutationFn: (payload: CreatePaathashaalaRequest) => updatePaathashaala(resultData?.id || paathashaala!.id, payload),
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
    if (isEditing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  function handleEditAgain() {
    setStep('form')
    // We stay in 'edit' mode now because resultData is set
  }

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
          <FormField
            id="map_link"
            label="Map Link"
            type="url"
            required
            hint="Paste a Google Maps link. The system will extract coordinates."
            value={form.map_link}
            onChange={(e) => setForm((f) => ({ ...f, map_link: e.target.value }))}
          />

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
              disabled={isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Save & Extract Coords'}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Coordinate Extraction Result</h3>
            
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{resultData?.lat}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{resultData?.lng}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Confidence</dt>
                <dd className="mt-1">
                  {resultData?.coordinate_confidence === 'parsed' ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      High (Parsed from link)
                    </span>
                  ) : (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                        Low (Fallback)
                      </span>
                      <span className="text-xs text-yellow-600">
                        Please verify the coordinates. The provided link didn't contain exact lat/lng so we fell back to a text search.
                      </span>
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleEditAgain}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit Link
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
