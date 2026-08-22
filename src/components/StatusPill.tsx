type StatusVariant = 'active' | 'inactive' | 'on_time' | 'late' | 'absent' | string

const VARIANT_CLASSES: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  on_time:  'bg-green-100 text-green-700',
  late:     'bg-yellow-100 text-yellow-700',
  absent:   'bg-red-100 text-red-600',
}

const LABELS: Record<string, string> = {
  active:   'Active',
  inactive: 'Inactive',
  on_time:  'On Time',
  late:     'Late',
  absent:   'Absent',
}

interface StatusPillProps {
  status: StatusVariant
  /** Override the display label */
  label?: string
}

export function StatusPill({ status, label }: StatusPillProps) {
  const classes = VARIANT_CLASSES[status] ?? 'bg-gray-100 text-gray-600'
  const displayLabel = label ?? LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
    >
      {displayLabel}
    </span>
  )
}
