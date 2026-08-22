import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../../api/auth'
import { FormField } from '../../components/FormField'
import type { LoginRequest } from '../../types'

export function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginRequest>({ email: '', password: '' })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate('/'), // Redirects to Dashboard/Paathshaalas
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-800">Admin Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            as="input"
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <FormField
            as="input"
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          />

          {mutation.isError && (
            <p className="text-sm text-red-600">Invalid credentials. Please try again.</p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
