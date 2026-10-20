import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Monitor, 
  Cpu, 
  Package, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useDashboardStats, useRecentActivity } from '../hooks/useQueries';
import { formatCurrency, formatRelativeTime } from '../utils/helpers';
import type { DashboardStats } from '../types';

const statCards = [
  { name: 'Total Computers', key: 'totalComputers', icon: Monitor, color: 'bg-blue-500', href: '/computers' },
  { name: 'Available', key: 'availableComputers', icon: CheckCircle, color: 'bg-green-500', href: '/computers?status=available' },
  { name: 'Rented', key: 'rentedComputers', icon: Package, color: 'bg-orange-500', href: '/computers?status=rented' },
  { name: 'Maintenance', key: 'maintenanceComputers', icon: Loader2, color: 'bg-yellow-500', href: '/computers?status=maintenance' },
  { name: 'Total Components', key: 'totalComponents', icon: Cpu, color: 'bg-purple-500', href: '/components' },
  { name: 'Available Components', key: 'availableComponents', icon: CheckCircle, color: 'bg-emerald-500', href: '/components?status=available' },
  { name: 'Active Rentals', key: 'activeRentals', icon: Package, color: 'bg-indigo-500', href: '/rentals?status=active' },
  { name: 'Pending Rentals', key: 'pendingRentals', icon: Clock, color: 'bg-amber-500', href: '/rentals?status=pending' },
  { name: 'Overdue Rentals', key: 'overdueRentals', icon: AlertTriangle, color: 'bg-red-500', href: '/rentals?status=overdue' },
  { name: 'Total Revenue', key: 'totalRevenue', icon: DollarSign, color: 'bg-green-600', format: 'currency', href: '/rentals' },
  { name: 'Monthly Revenue', key: 'monthlyRevenue', icon: TrendingUp, color: 'bg-teal-500', format: 'currency', href: '/rentals' },
] as const;

export function DashboardPage() {
  const { data: stats, isLoading, error, refetch } = useDashboardStats();
  const { data: recentActivity } = useRecentActivity();

  useEffect(() => {
    const interval = setInterval(() => refetch(), 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={refetch} isLoading={isLoading}>
            Refresh
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(() => (
            <Card key={Math.random()} className="animate-pulse">
              <CardContent className="h-24" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load dashboard data</p>
        <Button onClick={refetch} className="mt-4">Retry</Button>
      </div>
    );
  }

  const data = stats as DashboardStats;

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={refetch} isLoading={isLoading}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4" data-testid="stat-cards">
        {statCards.map((stat) => {
          const value = data[stat.key as keyof DashboardStats] as number;
          const formattedValue = stat.format === 'currency' ? formatCurrency(value) : value.toLocaleString();
          
          return (
            <Link key={stat.key} to={stat.href} className="hover:no-underline">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.name}</p>
                      <p className="text-2xl font-bold mt-1">{formattedValue}</p>
                    </div>
                    <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', stat.color)}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent data-testid="recent-activity-content">
            {recentActivity?.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity?.slice(0, 10).map((activity: { type: string; description: string; timestamp: string; user?: string }, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                      activity.type === 'rental' && 'bg-blue-100 text-blue-600',
                      activity.type === 'computer' && 'bg-green-100 text-green-600',
                      activity.type === 'component' && 'bg-purple-100 text-purple-600',
                      activity.type === 'payment' && 'bg-yellow-100 text-yellow-600'
                    )}>
                      {activity.type === 'rental' && <Package className="h-4 w-4" />}
                      {activity.type === 'computer' && <Monitor className="h-4 w-4" />}
                      {activity.type === 'component' && <Cpu className="h-4 w-4" />}
                      {activity.type === 'payment' && <DollarSign className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.user ? `${activity.user} • ` : ''}{formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent data-testid="quick-actions-content">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/computers/create" className="no-underline">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Monitor className="h-6 w-6" />
                  <span>Add Computer</span>
                </Button>
              </Link>
              <Link to="/components/create" className="no-underline">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Cpu className="h-6 w-6" />
                  <span>Add Component</span>
                </Button>
              </Link>
              <Link to="/rentals/create" className="no-underline">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Package className="h-6 w-6" />
                  <span>Create Rental</span>
                </Button>
              </Link>
              <Link to="/calendar" className="no-underline">
                <Button variant="outline" className="w-full h-20 flex-col gap-2">
                  <Clock className="h-6 w-6" />
                  <span>View Calendar</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { cn } from '../utils/helpers';