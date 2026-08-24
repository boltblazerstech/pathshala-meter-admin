import { NavLink, useNavigate } from 'react-router-dom'
import { logout } from '../../api/auth'
import { toast } from '../../lib/toast'

const NAV_ITEMS = [
  { to: '/paathshaalas',      label: 'Paathshaalas' },
  { to: '/supervisors',       label: 'Supervisors'   },
  { to: '/teachers',          label: 'Teachers'      },
  { to: '/tracking-windows',  label: 'Tracking Windows' },
  // { to: '/live-view',         label: 'Live View'     },
  { to: '/export',            label: 'Export'        },
]

export function Sidebar() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('Logout failed — please try again.')
    }
  }

  return (
    <aside className="flex h-full w-56 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <span className="text-lg font-bold tracking-tight">📍 PathshalaMeter</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-700 px-3 py-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
