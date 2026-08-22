import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUserWindows, updateUserWindow, createTrackingWindow, bulkUpdateWindows } from '../../api/trackingWindows'
import { listSupervisors } from '../../api/supervisors'
import { listTeachers } from '../../api/teachers'
import { toast } from '../../lib/toast'
import type { UserTrackingWindow, UpdateWindowRequest } from '../../types'

export function TrackingWindowListPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. Fetch effective windows for today
  const { data: rawWindows, isLoading: loadingWindows } = useQuery({
    queryKey: ['trackingWindows', today],
    queryFn: () => listUserWindows(today),
  })

  // 2. Fetch all active supervisors
  const { data: supervisorsData, isLoading: loadingSupervisors } = useQuery({
    queryKey: ['supervisors', 'all-for-windows'],
    queryFn: () => listSupervisors({ limit: 1000, is_active: true }),
  })

  // 3. Fetch all active teachers
  const { data: teachersData, isLoading: loadingTeachers } = useQuery({
    queryKey: ['teachers', 'all-for-windows'],
    queryFn: () => listTeachers({ limit: 1000, is_active: true }),
  })

  // Merge all users with their effective tracking windows
  const users: UserTrackingWindow[] = useMemo(() => {
    const windowList: any[] = Array.isArray(rawWindows)
      ? rawWindows
      : (rawWindows as any)?.content || (rawWindows as any)?.data || []

    const windowMap = new Map<string, any>()
    for (const w of windowList) {
      const uid = String(w.user_id || w.userId || w.id)
      windowMap.set(uid, w)
    }

    const supervisorsList = supervisorsData?.content ?? supervisorsData?.data ?? []
    const teachersList = teachersData?.content ?? teachersData?.data ?? []

    const combined: UserTrackingWindow[] = []

    for (const s of supervisorsList) {
      const existing = windowMap.get(String(s.id))
      combined.push({
        window_id: existing?.window_id || existing?.windowId || existing?.id,
        user_id: String(s.id),
        user_name: s.name,
        role: 'Supervisor',
        user_type: 'supervisor',
        paathashaala_name: '—',
        start_time: existing?.start_time || existing?.startTime || '08:00',
        end_time: existing?.end_time || existing?.endTime || '16:00',
        interval_minutes: existing?.interval_minutes ?? existing?.intervalMinutes ?? 30,
        effective_from_date: existing?.effective_from_date || existing?.effectiveFromDate || today,
        effective_from: existing?.effective_from || existing?.effective_from_date || today,
      })
    }

    for (const t of teachersList) {
      const existing = windowMap.get(String(t.id))
      combined.push({
        window_id: existing?.window_id || existing?.windowId || existing?.id,
        user_id: String(t.id),
        user_name: t.name,
        role: 'Teacher',
        user_type: 'teacher',
        paathashaala_name: t.paathshaala_name || t.paathashaala_name || '—',
        start_time: existing?.start_time || existing?.startTime || '08:00',
        end_time: existing?.end_time || existing?.endTime || '16:00',
        interval_minutes: existing?.interval_minutes ?? existing?.intervalMinutes ?? 30,
        effective_from_date: existing?.effective_from_date || existing?.effectiveFromDate || today,
        effective_from: existing?.effective_from || existing?.effective_from_date || today,
      })
    }

    return combined
  }, [rawWindows, supervisorsData, teachersData, today])

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editRowId, setEditRowId] = useState<string | null>(null)

  // State for the inline row edit
  const [inlineForm, setInlineForm] = useState<UpdateWindowRequest>({
    start_time: '08:00',
    end_time: '16:00',
    interval_minutes: 30,
    effective_from_date: today,
  })

  // State for bulk edit panel
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [bulkForm, setBulkForm] = useState<UpdateWindowRequest>({
    start_time: '08:00',
    end_time: '16:00',
    interval_minutes: 30,
    effective_from_date: today,
  })

  const saveMutation = useMutation({
    mutationFn: async (target: { user: UserTrackingWindow; form: UpdateWindowRequest }) => {
      const effectiveDate = target.form.effective_from_date || target.form.effective_from || today
      if (target.user.window_id) {
        await updateUserWindow(target.user.window_id, {
          ...target.form,
          effective_from_date: effectiveDate,
        })
      } else {
        await createTrackingWindow({
          user_id: target.user.user_id,
          start_time: target.form.start_time,
          end_time: target.form.end_time,
          interval_minutes: target.form.interval_minutes,
          effective_from_date: effectiveDate,
        })
      }
    },
    onSuccess: () => {
      toast.success('Schedule saved successfully')
      queryClient.invalidateQueries({ queryKey: ['trackingWindows'] })
      setEditRowId(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save schedule')
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (payload: UpdateWindowRequest & { user_ids: string[] }) =>
      bulkUpdateWindows({
        ...payload,
        effective_from_date: payload.effective_from_date || today,
      }),
    onSuccess: () => {
      toast.success('Schedules updated for selected users')
      queryClient.invalidateQueries({ queryKey: ['trackingWindows'] })
      setShowBulkPanel(false)
      setSelectedIds(new Set())
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to bulk-update schedules')
    },
  })

  function toggleSelection(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleAll() {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => u.user_id)))
    }
  }

  function startEdit(user: UserTrackingWindow) {
    setEditRowId(user.user_id)
    setInlineForm({
      start_time: user.start_time,
      end_time: user.end_time,
      interval_minutes: user.interval_minutes,
      effective_from_date: user.effective_from_date || today,
    })
  }

  function saveInline(user: UserTrackingWindow) {
    saveMutation.mutate({ user, form: inlineForm })
  }

  function saveBulk(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) return
    bulkMutation.mutate({
      ...bulkForm,
      user_ids: Array.from(selectedIds),
    })
  }

  const isLoading = loadingWindows || loadingSupervisors || loadingTeachers
  const isAllSelected = users.length > 0 && selectedIds.size === users.length
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < users.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Tracking Schedules</h2>
          <p className="text-sm text-gray-500">
            Manage daily tracking time windows and location ping intervals for all supervisors and teachers.
          </p>
        </div>

        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showBulkPanel ? 'Close Bulk Panel' : `Set window for ${selectedIds.size} selected`}
          </button>
        )}
      </div>

      {showBulkPanel && selectedIds.size > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-indigo-900 mb-2">
            Bulk Update ({selectedIds.size} users selected)
          </h3>
          <form onSubmit={saveBulk} className="flex flex-col sm:flex-row gap-4 items-end flex-wrap">
            <div>
              <label className="block text-xs font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                required
                value={bulkForm.start_time}
                onChange={(e) => setBulkForm((f) => ({ ...f, start_time: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">End Time</label>
              <input
                type="time"
                required
                value={bulkForm.end_time}
                onChange={(e) => setBulkForm((f) => ({ ...f, end_time: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Interval (min)</label>
              <input
                type="number"
                min="1"
                required
                value={bulkForm.interval_minutes}
                onChange={(e) => setBulkForm((f) => ({ ...f, interval_minutes: Number(e.target.value) }))}
                className="mt-1 block w-24 rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Effective From</label>
              <input
                type="date"
                required
                value={bulkForm.effective_from_date}
                onChange={(e) => setBulkForm((f) => ({ ...f, effective_from_date: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={bulkMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {bulkMutation.isPending ? 'Applying…' : 'Apply to Selected'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate ?? false
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Name / Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Paathashaala</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Start</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">End</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Interval</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Loading tracking schedules…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    No active supervisors or teachers found. Add a supervisor or teacher first.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isEditing = editRowId === u.user_id
                  const hasWindow = !!u.window_id
                  return (
                    <tr
                      key={u.user_id}
                      className={`hover:bg-gray-50 transition-colors ${
                        selectedIds.has(u.user_id) ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.has(u.user_id)}
                          onChange={() => toggleSelection(u.user_id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{u.user_name}</div>
                        <div className="text-xs text-gray-500 capitalize">{u.role}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.paathashaala_name}</td>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              className="block w-24 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.start_time}
                              onChange={(e) => setInlineForm((f) => ({ ...f, start_time: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="time"
                              className="block w-24 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.end_time}
                              onChange={(e) => setInlineForm((f) => ({ ...f, end_time: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              className="block w-16 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.interval_minutes}
                              onChange={(e) =>
                                setInlineForm((f) => ({ ...f, interval_minutes: Number(e.target.value) }))
                              }
                            />
                            <div className="mt-2 flex items-center gap-1 whitespace-nowrap">
                              <span className="text-xs text-gray-500 font-medium uppercase">From:</span>
                              <input
                                type="date"
                                className="block w-32 rounded-md border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={inlineForm.effective_from_date}
                                onChange={(e) =>
                                  setInlineForm((f) => ({ ...f, effective_from_date: e.target.value }))
                                }
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-indigo-600">Editing</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => saveInline(u)}
                                disabled={saveMutation.isPending}
                                className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                              >
                                {saveMutation.isPending ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditRowId(null)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 font-mono text-gray-900">{u.start_time}</td>
                          <td className="px-4 py-3 font-mono text-gray-900">{u.end_time}</td>
                          <td className="px-4 py-3 font-mono text-gray-900">{u.interval_minutes}m</td>
                          <td className="px-4 py-3">
                            {hasWindow ? (
                              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Not configured
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => startEdit(u)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                            >
                              {hasWindow ? 'Edit' : 'Set Window'}
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
