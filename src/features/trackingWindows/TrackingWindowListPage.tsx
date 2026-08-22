import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUserWindows, updateUserWindow, bulkUpdateWindows } from '../../api/trackingWindows'
import { toast } from '../../lib/toast'
import type { UserTrackingWindow, UpdateWindowRequest } from '../../types'

export function TrackingWindowListPage() {
  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: users, isLoading } = useQuery({
    queryKey: ['trackingWindows', today],
    queryFn: () => listUserWindows(today),
  })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editRowId, setEditRowId] = useState<string | null>(null)
  
  // State for the inline row edit
  const [inlineForm, setInlineForm] = useState<UpdateWindowRequest>({
    start_time: '08:00',
    end_time: '16:00',
    interval_minutes: 30,
    effective_from: today
  })

  // State for bulk edit panel
  const [showBulkPanel, setShowBulkPanel] = useState(false)
  const [bulkForm, setBulkForm] = useState<UpdateWindowRequest>({
    start_time: '08:00',
    end_time: '16:00',
    interval_minutes: 30,
    effective_from: today
  })

  const inlineMutation = useMutation({
    mutationFn: (payload: { id: string; data: UpdateWindowRequest }) => updateUserWindow(payload.id, payload.data),
    onSuccess: () => {
      toast.success('Schedule updated')
      queryClient.invalidateQueries({ queryKey: ['trackingWindows'] })
      setEditRowId(null)
    }
  })

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateWindows,
    onSuccess: () => {
      toast.success('Schedules updated successfully')
      queryClient.invalidateQueries({ queryKey: ['trackingWindows'] })
      setShowBulkPanel(false)
      setSelectedIds(new Set())
    }
  })

  function toggleSelection(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  function toggleAll() {
    if (!users) return
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map(u => u.user_id)))
    }
  }

  function startEdit(user: UserTrackingWindow) {
    setEditRowId(user.user_id)
    setInlineForm({
      start_time: user.start_time,
      end_time: user.end_time,
      interval_minutes: user.interval_minutes,
      effective_from: today
    })
  }

  function saveInline() {
    if (!editRowId) return
    inlineMutation.mutate({ id: editRowId, data: inlineForm })
  }

  function saveBulk(e: React.FormEvent) {
    e.preventDefault()
    if (selectedIds.size === 0) return
    bulkMutation.mutate({
      ...bulkForm,
      user_ids: Array.from(selectedIds)
    })
  }

  const isAllSelected = users && users.length > 0 && selectedIds.size === users.length
  const isIndeterminate = users && selectedIds.size > 0 && selectedIds.size < users.length

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-700">Tracking Schedules</h2>
          <p className="text-sm text-gray-500">Manage effective tracking windows for supervisors and teachers.</p>
        </div>
        
        {selectedIds.size > 0 && (
          <button
            onClick={() => setShowBulkPanel(!showBulkPanel)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Set window for {selectedIds.size} selected
          </button>
        )}
      </div>

      {showBulkPanel && selectedIds.size > 0 && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
          <form onSubmit={saveBulk} className="flex flex-col sm:flex-row gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700">Start Time</label>
              <input 
                type="time" 
                required 
                value={bulkForm.start_time}
                onChange={e => setBulkForm(f => ({ ...f, start_time: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">End Time</label>
              <input 
                type="time" 
                required 
                value={bulkForm.end_time}
                onChange={e => setBulkForm(f => ({ ...f, end_time: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Interval (min)</label>
              <input 
                type="number" 
                min="5" 
                required 
                value={bulkForm.interval_minutes}
                onChange={e => setBulkForm(f => ({ ...f, interval_minutes: Number(e.target.value) }))}
                className="mt-1 block w-24 rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Effective From</label>
              <input 
                type="date" 
                required 
                value={bulkForm.effective_from}
                onChange={e => setBulkForm(f => ({ ...f, effective_from: e.target.value }))}
                className="mt-1 block rounded-md border-gray-300 py-1.5 px-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" 
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={bulkMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {bulkMutation.isPending ? 'Applying…' : 'Apply Bulk Update'}
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
                    ref={el => { if (el) el.indeterminate = isIndeterminate ?? false }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Name / Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Paathashaala</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Start</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">End</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide">Interval</th>
                <th className="px-4 py-3 text-left w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading schedules…</td>
                </tr>
              ) : !users || users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No active users found.</td>
                </tr>
              ) : (
                users.map(u => {
                  const isEditing = editRowId === u.user_id
                  return (
                    <tr key={u.user_id} className={`hover:bg-gray-50 transition-colors ${selectedIds.has(u.user_id) ? 'bg-indigo-50/30' : ''}`}>
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
                        <div className="text-xs text-gray-500 capitalize">{u.user_type}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.paathashaala_name}
                      </td>
                      {isEditing ? (
                        <>
                          <td className="px-4 py-3">
                            <input 
                              type="time" 
                              className="block w-24 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.start_time}
                              onChange={e => setInlineForm(f => ({ ...f, start_time: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="time" 
                              className="block w-24 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.end_time}
                              onChange={e => setInlineForm(f => ({ ...f, end_time: e.target.value }))}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input 
                              type="number" 
                              min="5"
                              className="block w-16 rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                              value={inlineForm.interval_minutes}
                              onChange={e => setInlineForm(f => ({ ...f, interval_minutes: Number(e.target.value) }))}
                            />
                            <div className="mt-2 flex items-center gap-1 whitespace-nowrap">
                              <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">Effective From:</span>
                              <input 
                                type="date" 
                                className="block w-32 rounded-md border-gray-300 px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={inlineForm.effective_from}
                                onChange={e => setInlineForm(f => ({ ...f, effective_from: e.target.value }))}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={saveInline}
                                disabled={inlineMutation.isPending}
                                className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                              >
                                Save
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
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => startEdit(u)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
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
