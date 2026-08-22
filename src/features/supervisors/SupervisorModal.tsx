import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createSupervisor, updateSupervisor } from '../../api/supervisors'
import { Modal } from '../../components/Modal'
import { FormField } from '../../components/FormField'
import { toast } from '../../lib/toast'
import type { Supervisor, CreateSupervisorRequest } from '../../types'
import { AxiosError } from 'axios'

interface SupervisorModalProps {
  isOpen: boolean
  onClose: () => void
  supervisor?: Supervisor | null
}

export function SupervisorModal({ isOpen, onClose, supervisor }: SupervisorModalProps) {
  const queryClient = useQueryClient()
  
  const [form, setForm] = useState<CreateSupervisorRequest>({ name: '', phone: '' })
  const [phoneError, setPhoneError] = useState<string>('')

  // Reset form when modal opens or supervisor prop changes
  useEffect(() => {
    if (isOpen) {
      setPhoneError('')
      if (supervisor) {
        setForm({ name: supervisor.name, phone: supervisor.phone })
      } else {
        setForm({ name: '', phone: '' })
      }
    }
  }, [isOpen, supervisor])

  const onSuccess = () => {
    toast.success(supervisor ? 'Supervisor updated' : 'Supervisor added')
    queryClient.invalidateQueries({ queryKey: ['supervisors'] })
    onClose()
  }

  const onError = (error: any) => {
    if (error instanceof AxiosError && error.response?.status === 409) {
      // 409 Conflict - phone number already in use
      setPhoneError('This phone number is already in use by another user.')
    } else {
      // Other errors are handled by global interceptor, but we can clear the specific phone error
      setPhoneError('')
    }
  }

  const createMutation = useMutation({
    mutationFn: createSupervisor,
    onSuccess,
    onError,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CreateSupervisorRequest) => updateSupervisor(supervisor!.id, payload),
    onSuccess,
    onError,
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const isEditing = !!supervisor

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPhoneError('') // clear previous errors before submitting
    if (isEditing) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Supervisor' : 'Add Supervisor'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          id="name"
          label="Name"
          required
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <FormField
          id="phone"
          label="Phone Number"
          type="tel"
          required
          error={phoneError}
          hint="Must be unique. Used for login/identification."
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
