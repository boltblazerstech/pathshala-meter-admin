interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center border-b border-gray-200 bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
    </header>
  )
}
