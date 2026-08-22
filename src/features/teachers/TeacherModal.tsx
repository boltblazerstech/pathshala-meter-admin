import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createTeacher, updateTeacher } from '../../api/teachers'
import { listPaathshaalas } from '../../api/paathshaalas'
import { Modal } from '../../components/Modal'
import { FormField } from '../../components/FormField'
import { toast } from '../../lib/toast'
import type { Teacher, CreateTeacherRequest } from '../../types'
import { AxiosError } from 'axios'

interface TeacherModalProps {
  isOpen: boolean
  onClose: () => void
  teacher?: Teacher | null
}

export function TeacherModal({ isOpen, onClose, teacher }: TeacherModalProps) {
  const queryClient = useQueryClient()
  
  const [form, setForm] = useState<CreateTeacherRequest>({ 
    name: '', 
    phone: '', 
    assigned_paathshaala_id: '' 
  })
  const [phoneError, setPhoneError] = useState<string>('')

  // Fetch active paathshaalas for the dropdown
  const { data: paathshaalasData } = useQuery({
    queryKey: ['paathshaalas', 'active-list'],
    queryFn: () => listPaathshaalas({ limit: 1000, is_active: true }),
    enabled: isOpen,
  })

  // Reset form when modal opens or teacher prop changes
  useEffect(() => {
    if (isOpen) {
      setPhoneError('')
      if (teacher) {
        setForm({ 
          name: teacher.name, 
          phone: teacher.phone,
          assigned_paathshaala_id: teacher.assigned_paathshaala_id
        })
      } else {
        setForm({ name: '', phone: '', assigned_paathshaala_id: '' })
      }
    }
  }, [isOpen, teacher])

  const onSuccess = () => {
    toast.success(teacher ? 'Teacher updated' : 'Teacher added')
    queryClient.invalidateQueries({ queryKey: ['teachers'] })
    onClose()
  }

  const onError = (error: any) => {
    if (error instanceof AxiosError && error.response?.status === 409) {
      setPhoneError('This phone number is already in use by another user.')
    } else {
      setPhoneError('')
    }
  }

  const createMutation = useMutation({
    mutationFn: createTeacher,
    onSuccess,
    onError,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: CreateTeacherRequest) => updateTeacher(teacher!.id, payload),
    onSuccess,
    onError,
  })

  const isPending = createMutation.isPending || updateMutation.isPending
  const isEditing = !!teacher
  const isSubmitDisabled = isPending || !form.assigned_paathshaala_id

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
      title={isEditing ? 'Edit Teacher' : 'Add Teacher'}
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
        
        <FormField
          as="select"
          id="assigned_paathshaala_id"
          label="Assigned Paathshaala"
          required
          value={form.assigned_paathshaala_id}
          onChange={(e) => setForm((f) => ({ ...f, assigned_paathshaala_id: e.target.value }))}
        >
          <option value="" disabled>Select a paathshaala</option>
          {paathshaalasData?.data.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </FormField>

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
            disabled={isSubmitDisabled}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
