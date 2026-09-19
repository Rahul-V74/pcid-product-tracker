import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recordsApi } from '../services/api'
import { useFilterStore } from '../store/useFilterStore'
import type { PCIDRecordCreate, PCIDRecordUpdate } from '../types'

export function useRecords() {
  const { search, statusFilter, page, pageSize } = useFilterStore()

  return useQuery({
    queryKey: ['records', { search, statusFilter, page, pageSize }],
    queryFn: () => recordsApi.list({ search, status_filter: statusFilter, page, page_size: pageSize }),
  })
}

export function useSummary() {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => recordsApi.summary(),
  })
}

export function useCreateRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: PCIDRecordCreate) => recordsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useUpdateRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PCIDRecordUpdate }) => recordsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useDeleteRecord() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => recordsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useClearAllRecords() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => recordsApi.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

export function useExportRecords() {
  return useMutation({
    mutationFn: (params: { status_filter?: string; search?: string }) => recordsApi.export(params),
  })
}

export function useImportRecords() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => recordsApi.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}