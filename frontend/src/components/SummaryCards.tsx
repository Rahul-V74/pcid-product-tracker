import { FileText, Clock, CheckCircle, PauseCircle } from 'lucide-react'
import { Card, CardContent } from './ui/Card'
import { cn } from '../lib/utils'
import type { SummaryStats } from '../types'

interface SummaryCardsProps {
  stats: SummaryStats
}

const statCards = [
  {
    key: 'total_records',
    label: 'Total Records',
    icon: FileText,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    key: 'ip_count',
    label: 'IP',
    icon: Clock,
    color: 'text-yellow-600 bg-yellow-100',
  },
  {
    key: 'completed_count',
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100',
  },
  {
    key: 'hold_count',
    label: 'HOLD',
    icon: PauseCircle,
    color: 'text-red-600 bg-red-100',
  },
] as const

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map(({ key, label, icon: Icon, color }) => (
        <Card key={key}>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats[key as keyof SummaryStats]}
              </p>
            </div>
            <div className={cn('p-3 rounded-lg', color)}>
              <Icon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}