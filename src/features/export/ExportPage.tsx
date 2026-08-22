import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { downloadExportCsv } from '../../api/export'
import { listSupervisors } from '../../api/supervisors'
import { listTeachers } from '../../api/teachers'
import { FormField } from '../../components/FormField'
import { toast } from '../../lib/toast'
import type { ExportRequest } from '../../types'

const today = new Date().toISOString().slice(0, 10)

// Default to past 7 days range
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

export function ExportPage() {
  const [form, setForm] = useState<ExportRequest>({
    from: sevenDaysAgo,
    to: today,
    user_id: '', // empty means 'all users'
  })

  // Fetch supervisors and teachers to populate the user selector
  const { data: supervisorsData, isLoading: loadingSupervisors } = useQuery({
    queryKey: ['supervisors', 'export-selector'],
    queryFn: () => listSupervisors({ limit: 1000, is_active: true }),
  })

  const { data: teachersData, isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers', 'export-selector'],
    queryFn: () => listTeachers({ limit: 1000, is_active: true }),
  })

  const mutation = useMutation({
    mutationFn: (payload: ExportRequest) => downloadExportCsv(payload),
    onSuccess: (blob) => {
      // Create a blob URL and trigger download in the browser
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      const userSuffix = form.user_id ? `_user_${form.user_id}` : '_all_users'
      link.setAttribute('download', `attendance_export_${form.from}_to_${form.to}${userSuffix}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Attendance CSV downloaded successfully!')
    },
    onError: () => {
      toast.error('Failed to export CSV. Please try again.')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.from > form.to) {
      toast.error('"From" date must be earlier than or equal to "To" date.')
      return
    }

    mutation.mutate({
      from: form.from,
      to: form.to,
      user_id: form.user_id || undefined,
    })
  }

  const isLoadingUsers = loadingSupervisors || loadingTeachers
  const supervisors = supervisorsData?.data ?? []
  const teachers = teachersData?.data ?? []

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-700">Export Attendance & Location Records</h2>
        <p className="text-sm text-gray-500">
          Generate and download CSV reports containing presence and tracking data for analysis.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              as="input"
              id="from"
              label="From Date"
              type="date"
              required
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
            />

            <FormField
              as="input"
              id="to"
              label="To Date"
              type="date"
              required
              value={form.to}
              onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
            />
          </div>

          <FormField
            as="select"
            id="user_id"
            label="User Filter"
            value={form.user_id ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, user_id: e.target.value }))}
            hint="Choose a specific supervisor/teacher or export combined records for all users."
          >
            <option value="">All Users (All Supervisors &amp; Teachers)</option>
            {isLoadingUsers ? (
              <option disabled>Loading users…</option>
            ) : (
              <>
                {supervisors.length > 0 && (
                  <optgroup label="Supervisors">
                    {supervisors.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.phone})
                      </option>
                    ))}
                  </optgroup>
                )}
                {teachers.length > 0 && (
                  <optgroup label="Teachers">
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.paathashaala_name || 'Unassigned'} ({t.phone})
                      </option>
                    ))}
                  </optgroup>
                )}
              </>
            )}
          </FormField>

          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-xs text-gray-600">
            <p className="font-medium text-gray-700">Export Information:</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>File Format: <strong>CSV (Comma-Separated Values)</strong></li>
              <li>Date Range: <strong>{form.from || '…'}</strong> to <strong>{form.to || '…'}</strong></li>
              <li>
                Target Scope:{' '}
                <strong>
                  {!form.user_id
                    ? 'All Active Supervisors & Teachers'
                    : supervisors.find((s) => s.id === form.user_id)?.name
                    ? `Supervisor: ${supervisors.find((s) => s.id === form.user_id)?.name}`
                    : teachers.find((t) => t.id === form.user_id)?.name
                    ? `Teacher: ${teachers.find((t) => t.id === form.user_id)?.name}`
                    : `User ID: ${form.user_id}`}
                </strong>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-colors w-full sm:w-auto"
            >
              {mutation.isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Generating CSV…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
