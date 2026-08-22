import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTeachers, updateTeacher, deleteTeacher } from '../../api/teachers'
import { Table, type Column } from '../../components/Table'
import { StatusPill } from '../../components/StatusPill'
import { TeacherModal } from './TeacherModal'
import { toast } from '../../lib/toast'
import type { Teacher } from '../../types'

export function TeacherListPage() {
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
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', page, debouncedSearch],
    queryFn: () => listTeachers({ limit: 10, page, search: debouncedSearch }),
  })

  // Soft-delete: API DELETE marks active = false
  const deactivateMutation = useMutation({
    mutationFn: deleteTeacher,
    onSuccess: () => {
      toast.success('Teacher deactivated')
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  // Activate: PUT / PATCH active = true
  const activateMutation = useMutation({
    mutationFn: (id: string) => updateTeacher(id, { active: true, is_active: true }),
    onSuccess: () => {
      toast.success('Teacher activated')
      queryClient.invalidateQueries({ queryKey: ['teachers'] })
    }
  })

  function handleEdit(t: Teacher) {
    setEditingTeacher(t)
    setModalOpen(true)
  }

  function handleCreate() {
    setEditingTeacher(null)
    setModalOpen(true)
  }

  function handleToggleStatus(t: Teacher) {
    const isActive = t.active ?? t.is_active ?? true
    if (isActive) {
      if (confirm('Are you sure you want to deactivate this Teacher? They will not be able to log into the field app.')) {
        deactivateMutation.mutate(t.id)
      }
    } else {
      activateMutation.mutate(t.id)
    }
  }

  const COLUMNS: Column<Teacher>[] = [
    { key: 'name', header: 'Name' },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => row.phone_number || row.phone || '—',
    },
    {
      key: 'paathashaala_name',
      header: 'Paathashaala',
      render: (row) => row.paathshaala_name || row.paathashaala_name || '—',
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
        <h2 className="text-lg font-semibold text-gray-700">Teachers</h2>
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
            Add Teacher
          </button>
        </div>
      </div>

      <Table<Teacher>
        columns={COLUMNS}
        data={items}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No teachers found."
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

      <TeacherModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        teacher={editingTeacher}
      />
    </div>
  )
}
