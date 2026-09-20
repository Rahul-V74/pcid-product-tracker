import { formatDate, getStatusColor, cn } from '../lib/utils'
import { Edit, Trash2, Download } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/Table'
import { Button } from './ui/Button'
import { Badge } from './ui/Badge'
import { Select } from './ui/Select'
import { recordsApi } from '../services/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from './ui/Toast'
import type { PCIDRecord } from '../types'

export function RecordsTable({ records, onEdit, total, page, pageSize, setPage, setPageSize }: { records: PCIDRecord[]; onEdit: (record: PCIDRecord) => void; total: number; page: number; pageSize: number; setPage: (page: number) => void; setPageSize: (pageSize: number) => void }) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const deleteMutation = useMutation({
    mutationFn: (id: number) => recordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      showToast('success', 'Record deleted successfully')
    },
    onError: () => showToast('error', 'Failed to delete record'),
  })

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id)
    }
  }

  if (records.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
        <Download className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">No records found</h3>
        <p className="mt-2 text-gray-500">Get started by adding a new record or importing from Excel.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">S.No</TableHead>
            <TableHead>Customer ID</TableHead>
            <TableHead>PCID</TableHead>
            <TableHead>Designer Name</TableHead>
            <TableHead>Delivery Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record, index) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium text-gray-900">
                {(page - 1) * pageSize + index + 1}
              </TableCell>
              <TableCell className="font-medium">{record.customer_id}</TableCell>
              <TableCell>{record.pcid}</TableCell>
              <TableCell>{record.designer_name}</TableCell>
              <TableCell>{formatDate(record.delivery_date)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn(getStatusColor(record.status))}>
                  {record.status}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-500 max-w-xs truncate">{record.remarks || '-'}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(record)}
                    aria-label="Edit record"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(record.id)}
                    aria-label="Delete record"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Rows per page:</span>
          <Select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: '50', label: '50' },
              { value: '100', label: '100' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Page {page} of {Math.ceil(total / pageSize) || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page * pageSize >= total}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}