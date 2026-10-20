import { cn } from '@/utils/helpers'
import { useDashboardStats } from '@/api/hooks'
import { formatCurrency, getStatusLabel } from '@/utils/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table } from '@/components/ui/Table'
import {
  HomeIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

const statCards = [
  { name: 'Sewa Aktif', value: (stats: any) => stats.active_rentals, icon: HomeIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Habis Hari Ini', value: (stats: any) => stats.ending_today, icon: CalendarDaysIcon, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { name: 'Terlambat', value: (stats: any) => stats.overdue_rentals, icon: ClockIcon, color: 'text-red-600', bg: 'bg-red-50' },
  { name: 'Pendapatan Bulan Ini', value: (stats: any) => formatCurrency(stats.revenue_this_month), icon: CurrencyDollarIcon, color: 'text-green-600', bg: 'bg-green-50' },
]

export function Dashboard() {
  const { data: stats, isLoading, error } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Gagal memuat data dashboard</p>
      </div>
    )
  }

  const recentRentals = stats?.recent_rentals || []

  const rentalColumns = [
    { key: 'customer_name', header: 'Pelanggan' },
    { key: 'computer.name', header: 'Komputer', render: (row: any) => row.computer?.name || '-' },
    { key: 'start_date', header: 'Mulai', render: (row: any) => row.start_date },
    { key: 'end_date', header: 'Selesai', render: (row: any) => row.end_date },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.status as any}>{getStatusLabel(row.status)}</Badge>
      ),
    },
    {
      key: 'total_price',
      header: 'Total',
      render: (row: any) => formatCurrency(row.total_price),
      className: 'text-right',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Ringkasan aktivitas sewa komputer</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.name} padding="md" hover>
            <CardContent className="flex items-center gap-4">
              <div className={cn('p-3 rounded-xl', stat.bg)}>
                <stat.icon className={cn('h-6 w-6', stat.color)} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stats ? stat.value(stats) : '...'}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Sewa Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            columns={rentalColumns}
            data={recentRentals}
            keyExtractor={(row) => String(row.id)}
            emptyMessage="Belum ada data sewa"
          />
        </CardContent>
      </Card>
    </div>
  )
}