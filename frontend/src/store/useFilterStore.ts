import { create } from 'zustand'

interface FilterState {
  search: string
  statusFilter: string
  page: number
  pageSize: number
  setSearch: (search: string) => void
  setStatusFilter: (status: string) => void
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  resetFilters: () => void
}

export const useFilterStore = create<FilterState>((set) => ({
  search: '',
  statusFilter: 'All',
  page: 1,
  pageSize: 20,
  setSearch: (search) => set({ search, page: 1 }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  resetFilters: () => set({ search: '', statusFilter: 'All', page: 1 }),
}))