import { cn } from '@/utils/helpers'

export interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'active' | 'pending' | 'overdue' | 'completed' | 'cancelled'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-gray-100 text-gray-600',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeProps['variant']> = {
    active: 'active',
    pending: 'pending',
    overdue: 'overdue',
    completed: 'completed',
    cancelled: 'cancelled',
  }
  return <Badge variant={variantMap[status] || 'default'}>{status}</Badge>
}