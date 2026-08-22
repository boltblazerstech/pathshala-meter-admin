import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { requestExport } from '../../api/export'
import { FormField } from '../../components/FormField'
import { toast } from '../../lib/toast'
import type { ExportRequest } from '../../types'

const today = new Date().toISOString().slice(0, 10)

export function ExportPage() {
  const [form, setForm] = useState<ExportRequest>({
    from: today,
    to: today,
    format: 'xlsx',
  })

  const mutation = useMutation({
    mutationFn: requestExport,
    onSuccess: (result) => {
      toast.success('Export ready — downloading…')
      window.open(result.download_url, '_blank')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold text-gray-700">Export Attendance Data</h2>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
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
        <FormField
          as="select"
          id="format"
          label="Format"
          value={form.format}
          onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as ExportRequest['format'] }))}
        >
          <option value="xlsx">Excel (.xlsx)</option>
          <option value="csv">CSV (.csv)</option>
        </FormField>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {mutation.isPending ? 'Generating…' : 'Export'}
        </button>
      </form>
    </div>
  )
}
