import { useQuery } from '@tanstack/react-query'
import { listTrackingWindows } from '../../api/trackingWindows'
import { Table, type Column } from '../../components/Table'
import { StatusPill } from '../../components/StatusPill'
import type { TrackingWindow } from '../../types'

const COLUMNS: Column<TrackingWindow>[] = [
  { key: 'label',             header: 'Label' },
  { key: 'paathashaala_name', header: 'Paathashaala' },
  {
    key: 'days_of_week',
    header: 'Days',
    render: (row) => row.days_of_week.join(', '),
  },
  {
    key: 'start_time',
    header: 'Window',
    render: (row) => `${row.start_time} – ${row.end_time}`,
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (row) => <StatusPill status={row.is_active ? 'active' : 'inactive'} />,
  },
]

export function TrackingWindowListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trackingWindows'],
    queryFn: () => listTrackingWindows({ limit: 50 }),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Tracking Windows</h2>
        {/* TODO: Add "New Window" button + Modal */}
      </div>

      <Table<TrackingWindow>
        columns={COLUMNS}
        data={data?.data ?? []}
        keyField="id"
        isLoading={isLoading}
        emptyMessage="No tracking windows configured."
      />
    </div>
  )
}
