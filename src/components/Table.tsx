import type { ReactNode } from 'react'

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Table<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  isLoading = false,
  emptyMessage = 'No records found.',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide ${col.className ?? ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr 
                  key={String(row[keyField as string])} 
                  className={`transition-colors ${onRowClick ? 'hover:bg-gray-50 cursor-pointer' : 'hover:bg-gray-50'}`}
                  onClick={(e) => {
                    if (!onRowClick) return
                    // Ignore clicks on buttons, links, inputs, and selects
                    const target = e.target as HTMLElement
                    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select')) {
                      return
                    }
                    onRowClick(row)
                  }}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-4 py-3 ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row)
                        : String(row[col.key as string] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
