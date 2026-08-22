import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

interface BaseFieldProps {
  label: string
  error?: string
  hint?: string
}

// ── Text / number / email / password input ───────────────────────────────────
type InputFieldProps = BaseFieldProps &
  InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input'
    id: string
  }

// ── Select ────────────────────────────────────────────────────────────────────
type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    as: 'select'
    id: string
    children: React.ReactNode
  }

type FormFieldProps = InputFieldProps | SelectFieldProps

export function FormField(props: FormFieldProps) {
  const { label, id, error, hint, as: asEl = 'input', ...rest } = props

  const labelEl = (
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
      {label}
      {props.required && <span className="ml-1 text-red-500">*</span>}
    </label>
  )

  const inputClass = [
    'block w-full rounded-md border px-3 py-2 text-sm shadow-sm outline-none transition',
    'focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
    error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white',
  ].join(' ')

  return (
    <div className="space-y-0.5">
      {labelEl}

      {asEl === 'select' ? (
        <select
          id={id}
          className={inputClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...(rest as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {(props as SelectFieldProps).children}
        </select>
      ) : (
        <input
          id={id}
          className={inputClass}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}

      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
