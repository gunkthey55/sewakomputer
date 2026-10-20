import { Badge, getStatusBadge as getStatusBadgeUtil } from './Badge';
import type { ComponentType } from '../types';

export interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, showIcon = false, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'info'; icon?: React.ReactNode }> = {
    available: { label: 'Available', variant: 'success' },
    rented: { label: 'Rented', variant: 'info' },
    maintenance: { label: 'Maintenance', variant: 'warning' },
    retired: { label: 'Retired', variant: 'destructive' },
    pending: { label: 'Pending', variant: 'warning' },
    active: { label: 'Active', variant: 'success' },
    completed: { label: 'Completed', variant: 'default' },
    cancelled: { label: 'Cancelled', variant: 'destructive' },
    overdue: { label: 'Overdue', variant: 'destructive' },
    installed: { label: 'Installed', variant: 'info' },
  };

  const config = statusConfig[status] || { label: status.charAt(0).toUpperCase() + status.slice(1), variant: 'default' };

  return (
    <Badge variant={config.variant} className={sizeClasses[size]}>
      {showIcon && config.icon}
      {config.label}
    </Badge>
  );
}

export function RentalStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} showIcon />;
}

export function ComputerStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

export function ComponentStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}

export function getStatusBadge(status: string) {
  return getStatusBadgeUtil(status);
}

export function getComponentTypeBadge(type: ComponentType) {
  const labels: Record<ComponentType, string> = {
    cpu: 'CPU',
    ram: 'RAM',
    storage: 'Storage',
    gpu: 'GPU',
    motherboard: 'Motherboard',
    psu: 'Power Supply',
    cooler: 'Cooler',
    case: 'Case',
    monitor: 'Monitor',
    keyboard: 'Keyboard',
    mouse: 'Mouse',
    other: 'Other',
  };
  
  return <Badge variant="default">{labels[type] || type}</Badge>;
}