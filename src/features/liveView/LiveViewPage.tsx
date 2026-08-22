import { useQuery } from '@tanstack/react-query'
import { getLiveView } from '../../api/locations'
import { Table, type Column } from '../../components/Table'
import { StatusPill } from '../../components/StatusPill'
import type { LocationPing } from '../../types'

const COLUMNS: Column<LocationPing>[] = [
  { key: 'teacher_name',      header: 'Teacher' },
  { key: 'paathashaala_name', header: 'Paathashaala' },
  { key: 'window_label',      header: 'Window' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusPill status={row.status} />,
  },
  {
    key: 'timestamp',
    header: 'Last Ping',
    render: (row) => new Date(row.timestamp).toLocaleTimeString(),
  },
  {
    key: 'lat',
    header: 'Location',
    render: (row) => `${row.lat.toFixed(5)}, ${row.lng.toFixed(5)}`,
  },
]

/** Refetch every 30 seconds — swap to WebSocket/SSE once real backend is live */
const REFETCH_INTERVAL = 30_000

export function LiveViewPage() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['liveView'],
    queryFn: () => getLiveView(),
    refetchInterval: REFETCH_INTERVAL,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Live View</h2>
        <span className="text-xs text-gray-400">
          {dataUpdatedAt
            ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}`
            : 'Loading…'}
        </span>
      </div>

      <Table<LocationPing>
        columns={COLUMNS}
        data={data?.pings ?? []}
        keyField="teacher_id"
        isLoading={isLoading}
        emptyMessage="No active location pings."
      />
    </div>
  )
}
