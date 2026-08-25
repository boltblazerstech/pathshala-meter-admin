import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// Map path segments to readable page titles
const PAGE_TITLES: Record<string, string> = {
  paathshaalas:      'Paathshaalas',
  supervisors:       'Supervisors',
  teachers:          'Teachers',
  'tracking-windows':'Tracking Windows',
  'live-view':       'Live View',
  export:            'Export',
  settings:          'Settings',
  dashboard:         'Dashboard',
}

function getTitle(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] ?? 'dashboard'
  return PAGE_TITLES[segment] ?? 'Admin'
}

export function AppShell() {
  const location = useLocation()
  const title = getTitle(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
