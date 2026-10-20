import { cn } from '../utils/helpers';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
}

export const Badge = ({ className, variant = 'default', ...props }: BadgeProps) => {
  const variantClasses = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    destructive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
};

export function getStatusBadge(status: string) {
  const variants: Record<string, BadgeProps['variant']> = {
    available: 'success',
    rented: 'info',
    maintenance: 'warning',
    retired: 'destructive',
    pending: 'warning',
    active: 'success',
    completed: 'default',
    cancelled: 'destructive',
    overdue: 'destructive',
    installed: 'info',
  };
  
  return <Badge variant={variants[status] || 'default'}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

export function getComponentTypeBadge(type: string) {
  return <Badge variant="default">{type.toUpperCase()}</Badge>;
}