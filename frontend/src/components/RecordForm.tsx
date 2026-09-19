import { useState, FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { recordsApi } from '../services/api'
import { useFilterStore } from '../store/useFilterStore'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { DatePicker } from './ui/DatePicker'
import { Textarea } from './ui/Textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/Dialog'
import type { PCIDRecord, PCIDRecordCreate, PCIDRecordUpdate } from '../types'
import { cn } from '../lib/utils'

interface RecordFormProps {
  isOpen: boolean
  onClose: () => void
  record?: PCIDRecord | null
}

const statusOptions = [
  { value: 'IP', label: 'IP' },
  { value: 'Completed', label: 'Completed' },
  { value: 'HOLD', label: 'HOLD' },
]

export function RecordForm({ isOpen, onClose, record }: RecordFormProps) {
  const queryClient = useQueryClient()
  const isEditing = !!record
  const [formData, setFormData] = useState<PCIDRecordCreate | PCIDRecordUpdate>({
    customer_id: '',
    pcid: '',
    designer_name: '',
    delivery_date: null,
    status: 'IP',
    remarks: '',
  })
  const [errors, setErrors] = useState<Partial<PCIDRecordCreate>>({})

  const createMutation = useMutation({
    mutationFn: (data: PCIDRecordCreate) => recordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: PCIDRecordUpdate }) => recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      onClose()
    },
  })

  const validate = (): boolean => {
    const newErrors: Partial<PCIDRecordCreate> = {}
    if (!formData.customer_id.trim()) newErrors.customer_id = 'Customer ID is required'
    if (!formData.pcid.trim()) newErrors.pcid = 'PCID is required'
    if (!formData.designer_name.trim()) newErrors.designer_name = 'Designer Name is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    const payload = {
      customer_id: formData.customer_id.trim(),
      pcid: formData.pcid.trim(),
      designer_name: formData.designer_name.trim(),
      delivery_date: formData.delivery_date || null,
      status: formData.status,
      remarks: formData.remarks?.trim() || null,
    }

    if (isEditing && record) {
      updateMutation.mutate({ id: record.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, delivery_date: value || null }))
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value as 'IP' | 'Completed' | 'HOLD' }))
  }

  const resetForm = () => {
    setFormData({
      customer_id: '',
      pcid: '',
      designer_name: '',
      delivery_date: null,
      status: 'IP',
      remarks: '',
    })
    setErrors({})
  }

  if (record) {
    setFormData({
      customer_id: record.customer_id,
      pcid: record.pcid,
      designer_name: record.designer_name,
      delivery_date: record.delivery_date ? record.delivery_date.split('T')[0] : '',
      status: record.status,
      remarks: record.remarks || '',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogClose onClick={() => { resetForm(); onClose(); }} />
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Record' : 'Add Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="Customer ID *"
            value={formData.customer_id}
            onChange={(e) => handleChange('customer_id', e.target.value)}
            error={errors.customer_id}
            placeholder="Enter Customer ID"
            autoFocus
          />
          <Input
            label="PCID *"
            value={formData.pcid}
            onChange={(e) => handleChange('pcid', e.target.value)}
            error={errors.pcid}
            placeholder="Enter PCID"
          />
          <Input
            label="Designer Name *"
            value={formData.designer_name}
            onChange={(e) => handleChange('designer_name', e.target.value)}
            error={errors.designer_name}
            placeholder="Enter Designer Name"
          />
          <DatePicker
            label="Delivery Date"
            value={formData.delivery_date || ''}
            onChange={(e) => handleDateChange(e.target.value)}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            options={statusOptions}
          />
          <Textarea
            label="Remarks"
            value={formData.remarks || ''}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="Enter remarks..."
            rows={3}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {isEditing ? 'Update' : 'Add Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}