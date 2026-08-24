import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPaathshaalas, deletePaathashaala } from '../../api/paathshaalas'
import { Table, type Column } from '../../components/Table'
import { PaathashaalaModal } from './PaathashaalaModal'
import { toast } from '../../lib/toast'
import type { Paathashaala } from '../../types'
import { AddressRevealProvider, useAddressRevealContext } from '../../contexts/AddressRevealContext'
import { AddressReveal } from '../../components/AddressReveal'

export function PaathashaalaListPage() {
  return (
    <AddressRevealProvider>
      <PaathashaalaListContent />
    </AddressRevealProvider>
  )
}

function PaathashaalaListContent() {
  const queryClient = useQueryClient()
  const revealContext = useAddressRevealContext()
  
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  const [modalOpen, setModalOpen] = useState(false)
  const [editingPaathashaala, setEditingPaathashaala] = useState<Paathashaala | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['paathshaalas', page, debouncedSearch],
    queryFn: () => listPaathshaalas({ limit: 10, page, search: debouncedSearch }),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePaathashaala,
    onSuccess: () => {
      toast.success('Paathashaala deleted')
      queryClient.invalidateQueries({ queryKey: ['paathshaalas'] })
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete'
      toast.error(message)
    }
  })

  function handleEdit(p: Paathashaala) {
    setEditingPaathashaala(p)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditingPaathashaala(null)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this Paathashaala?')) {
      deleteMutation.mutate(id)
    }
  }

  const COLUMNS: Column<Paathashaala>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'coords',
      header: 'Coordinates',
      render: (row) => {
        const lat = row.lat ?? row.latitude
        const lng = row.lng ?? row.longitude
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-600">
              {typeof lat === 'number' ? lat.toFixed(4) : '—'}, {typeof lng === 'number' ? lng.toFixed(4) : '—'}
            </span>
            {typeof lat === 'number' && typeof lng === 'number' && (
              <AddressReveal lat={lat} lng={lng} />
            )}
          </div>
        )
      },
    },
    {
      key: 'coordinate_confidence',
      header: 'Confidence',
      render: (row) => {
        const conf = (row.coordinate_confidence || '').toLowerCase()
        if (conf === 'parsed' || conf === 'high') {
          return (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700" title="Coordinates parsed directly from link">
              ✓ Parsed
            </span>
          )
        }
        if (conf === 'manual') {
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700" title="Coordinates entered manually by admin">
              ✎ Manual
            </span>
          )
        }
        if (conf === 'unresolved') {
          return (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 cursor-help" title="Link couldn't be resolved — coordinates may be stale. Please verify.">
              ⚠ Unresolved
            </span>
          )
        }
        // fallback / LOW / anything else
        return (
          <span
            className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 cursor-help"
            title="Coordinates derived from a fallback text search. May be inaccurate."
          >
            ~ Fallback
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex space-x-3 text-sm font-medium">
          <button
            onClick={() => handleEdit(row)}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-900 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      ),
    },
  ]

  const items = data?.content ?? data?.data ?? []
  const totalElements = data?.totalElements ?? data?.total ?? items.length
  const pageSize = data?.size ?? data?.limit ?? 10
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalElements / pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-700">Paathshaalas</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="search"
            placeholder="Search paathshaalas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
          />
          <button
            onClick={revealContext?.triggerRevealAll}
            disabled={revealContext?.isRevealingAll}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2"
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
          <button
            onClick={handleCreate}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 w-full sm:w-auto"
          >
            Add Paathashaala
          </button>
        </div>
      </div>

      <Table<Paathashaala>
        columns={COLUMNS}
        data={items}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No paathshaalas found."
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg shadow-sm mt-4">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span> ({totalElements} total)
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Previous</span>
                  ←
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                >
                  <span className="sr-only">Next</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      <PaathashaalaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        paathashaala={editingPaathashaala}
      />
    </div>
  )
}
