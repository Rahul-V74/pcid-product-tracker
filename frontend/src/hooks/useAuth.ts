import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/useAuthStore'
import type { LoginCredentials, RegisterData } from '../types'

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: ({ data }) => {
      localStorage.setItem('access_token', data.access_token)
      queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
  })
}

export function useAuth() {
  const { user, token, setAuth, clearAuth, isAuthenticated } = useAuthStore()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['auth'],
    queryFn: () => authApi.me(),
    enabled: isAuthenticated(),
    retry: false,
    staleTime: 1000 * 60 * 10,
  })

  if (data) {
    setAuth(data, token!)
  }

  const logout = () => {
    clearAuth()
    localStorage.removeItem('access_token')
    queryClient.clear()
  }

  return {
    user: data ?? user,
    isLoading,
    isAuthenticated: isAuthenticated() && !error,
    logout,
    refetch,
  }
}