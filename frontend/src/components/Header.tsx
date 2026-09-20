import { useRef } from 'react'
import { Plus, Download, Trash2, Search, Upload } from 'lucide-react'
import { useFilterStore } from '../store/useFilterStore'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { useExportRecords, useImportRecords, useClearAllRecords } from '../hooks/useRecords'
import { useToast } from './ui/Toast'

export function Header({ onAddClick }: { onAddClick: () => void }) {
  const { search, statusFilter, setSearch, setStatusFilter } = useFilterStore()
  const { logout } = useAuth()
  const { showToast } = useToast()

  const exportMutation = useExportRecords()
  const importMutation = useImportRecords()
  const clearAllMutation = useClearAllRecords()

  const handleExport = async () => {
    try {
      const blob = await exportMutation.mutateAsync({
        status_filter: statusFilter === 'All' ? undefined : statusFilter,
        search: search || undefined,
      })
      const url = window.URL.createObjectURL(blob as Blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `pcid_records_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('success', 'Records exported successfully')
    } catch {
      showToast('error', 'Failed to export records')
    }
  }

  const handleImport = (file: File) => {
    importMutation.mutate(file, {
      onSuccess: (result) => {
        if (result.errors.length > 0) {
          showToast('error', `Imported ${result.success} records with ${result.errors.length} errors`)
        } else {
          showToast('success', result.message)
        }
      },
      onError: () => showToast('error', 'Failed to import file'),
    })
  }

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL records? This action cannot be undone.')) {
      clearAllMutation.mutate(undefined, {
        onSuccess: () => showToast('success', 'All records cleared'),
        onError: () => showToast('error', 'Failed to clear records'),
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer PCID Status Tracker</h1>
          <p className="text-gray-500">Manage customer delivery and PCID status</p>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} className="ml-auto">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onAddClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
        <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
        <ImportButton onImport={handleImport} disabled={importMutation.isPending} />
        <Button variant="outline" onClick={handleClearAll} disabled={clearAllMutation.isPending} className="text-red-600 border-red-300 hover:bg-red-50">
          <Trash2 className="h-4 w-4 mr-2" />
          Clear All
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search Customer ID, PCID, or Designer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'All', label: 'All Status' },
            { value: 'IP', label: 'IP' },
            { value: 'Completed', label: 'Completed' },
            { value: 'HOLD', label: 'HOLD' },
          ]}
          className="w-full sm:w-48"
        />
      </div>
    </div>
  )
}

function ImportButton({ onImport, disabled }: { onImport: (file: File) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      onImport(selected)
      e.target.value = ''
    }
  }

  return (
    <>
      <input type="file" ref={inputRef} accept=".xlsx,.xls" onChange={handleChange} className="hidden" />
      <Button variant="outline" onClick={handleClick} disabled={disabled}>
        <Upload className="h-4 w-4 mr-2" />
        Import Excel
      </Button>
    </>
  )
}