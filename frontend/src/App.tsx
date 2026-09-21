import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { Header } from './components/Header'
import { RecordForm } from './components/RecordForm'
import { RecordsTable } from './components/RecordsTable'
import { SummaryCards } from './components/SummaryCards'
import { useRecords, useSummary } from './hooks/useRecords'
import { useAuth, useLogin, useRegister } from './hooks/useAuth'
import { useFilterStore } from './store/useFilterStore'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card'
import { useToast } from './components/ui/Toast'
import type { PCIDRecord } from './types'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useLogin()
  const { showToast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    login.mutate({ username: email, password }, {
      onSuccess: () => {
        showToast('success', 'Logged in successfully')
      },
      onError: () => {
        setError('Invalid email or password')
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign in to PCID Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/register'}>
              Sign up
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const register = useRegister()
  const { showToast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    register.mutate({ email, password, full_name: fullName }, {
      onSuccess: () => {
        showToast('success', 'Account created successfully')
        window.location.href = '/login'
      },
      onError: (err: any) => {
        setError(err.response?.data?.detail || 'Registration failed')
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-red-600 text-sm text-center">{error}</div>}
            <Input
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/login'}>
              Sign in
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function Dashboard() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PCIDRecord | null>(null)
  const { data: recordsData, isError } = useRecords()
  const { data: summary } = useSummary()
  const { page, pageSize, setPage, setPageSize } = useFilterStore()

  const handleAddClick = () => {
    setEditingRecord(null)
    setIsFormOpen(true)
  }

  const handleEdit = (record: PCIDRecord) => {
    setEditingRecord(record)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingRecord(null)
  }

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load records</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header onAddClick={handleAddClick} />
        {summary && <SummaryCards stats={summary} />}
        <RecordsTable
          records={recordsData?.records || []}
          onEdit={handleEdit}
          total={recordsData?.total || 0}
          page={page}
          pageSize={pageSize}
          setPage={setPage}
          setPageSize={setPageSize}
        />
      </div>
      <RecordForm isOpen={isFormOpen} onClose={handleCloseForm} record={editingRecord} />
    </div>
  )
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  )
}

export default App