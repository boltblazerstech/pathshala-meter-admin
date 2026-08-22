import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listSupervisors, updateSupervisor, deleteSupervisor } from '../../api/supervisors'
import { Table, type Column } from '../../components/Table'
import { StatusPill } from '../../components/StatusPill'
import { SupervisorModal } from './SupervisorModal'
import { toast } from '../../lib/toast'
import type { Supervisor } from '../../types'

export function SupervisorListPage() {
  const queryClient = useQueryClient()
  
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
  const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['supervisors', page, debouncedSearch],
    queryFn: () => listSupervisors({ limit: 10, page, search: debouncedSearch }),
  })

  // We use DELETE for deactivation to match the "soft-delete" spec
  const deactivateMutation = useMutation({
    mutationFn: deleteSupervisor,
    onSuccess: () => {
      toast.success('Supervisor deactivated')
      queryClient.invalidateQueries({ queryKey: ['supervisors'] })
    }
  })

  // We use PATCH / PUT to reactivate
  const activateMutation = useMutation({
    mutationFn: (id: string) => updateSupervisor(id, { active: true, is_active: true }),
    onSuccess: () => {
      toast.success('Supervisor activated')
      queryClient.invalidateQueries({ queryKey: ['supervisors'] })
    }
  })

  function handleEdit(s: Supervisor) {
    setEditingSupervisor(s)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditingSupervisor(null)
    setModalOpen(true)
  }

  function handleToggleStatus(s: Supervisor) {
    const isActive = s.active ?? s.is_active ?? true
    if (isActive) {
      if (confirm('Are you sure you want to deactivate this Supervisor? They will lose access.')) {
        deactivateMutation.mutate(s.id)
      }
    } else {
      activateMutation.mutate(s.id)
    }
  }

  const COLUMNS: Column<Supervisor>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone_number || row.phone || '—',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => {
        const isActive = row.active ?? row.is_active ?? true
        return <StatusPill status={isActive ? 'active' : 'inactive'} />
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => {
        const isActive = row.active ?? row.is_active ?? true
        return (
          <div className="flex space-x-3 text-sm font-medium">
            <button
              onClick={() => handleEdit(row)}
              className="text-indigo-600 hover:text-indigo-900"
            >
              Edit
            </button>
            <button
              onClick={() => handleToggleStatus(row)}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
              className={`${isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} disabled:opacity-50`}
            >
              {isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        )
      },
    },
  ]

  const items = data?.content ?? data?.data ?? []
  const totalElements = data?.totalElements ?? data?.total ?? items.length
  const pageSize = data?.size ?? data?.limit ?? 10
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(totalElements / pageSize))

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-700">Supervisors</h2>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <input
            type="search"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full sm:w-64"
          />
          <button
            onClick={handleCreate}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 w-full sm:w-auto"
          >
            Add Supervisor
          </button>
        </div>
      </div>

      <Table<Supervisor>
        columns={COLUMNS}
        data={items}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No supervisors found."
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

      <SupervisorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        supervisor={editingSupervisor}
      />
    </div>
  )
}
