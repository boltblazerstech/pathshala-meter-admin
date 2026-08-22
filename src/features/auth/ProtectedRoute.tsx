import { useQuery } from '@tanstack/react-query'
import { getMe } from '../../api/auth'
import { getToken } from '../../lib/tokenStorage'
import { Navigate, Outlet } from 'react-router-dom'

/**
 * ProtectedRoute — wraps authenticated pages.
 * Redirects to /login if no access token is present.
 * Validates the token against /auth/me on mount.
 */
export function ProtectedRoute() {
  const hasToken = Boolean(getToken())

  const { isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
  })

  // If there's no token in localStorage, OR if /auth/me fails (401), redirect.
  // Note: apiClient interceptor will also catch 401s and force redirect.
  if (!hasToken || isError) {
    return <Navigate to="/login" replace />
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        Verifying session…
      </div>
    )
  }

  return <Outlet />
}
