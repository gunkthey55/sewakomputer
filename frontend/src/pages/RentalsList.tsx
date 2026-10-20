import { useState } from 'react'
import { useRentals } from '@/api/hooks'
import { formatCurrency, getStatusLabel, debounce } from '@/utils/helpers'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, Pagination } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { cn } from '@/utils/helpers'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'active', label: 'Aktif' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const sortOptions = [
  { value: 'created_at', label: 'Terbaru' },
  { value: 'start_date', label: 'Tanggal Mulai' },
  { value: 'end_date', label: 'Tanggal Selesai' },
  { value: 'total_price', label: 'Total Harga' },
  { value: 'customer_name', label: 'Nama Pelanggan' },
]

export function RentalsList() {
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    date_from: '',
    date_to: '',
    page: 1,
    page_size: 10,
    sort_by: 'created_at',
    sort_order: 'desc' as 'asc' | 'desc',
  })

  const { data, isLoading, error } = useRentals(filters)

  const rentalColumns = [
    { key: 'customer_name', header: 'Pelanggan' },
    { key: 'computer.name', header: 'Komputer', render: (row: { computer?: { name: string } }) => row.computer?.name || '-' },
    { key: 'start_date', header: 'Mulai', render: (row: { start_date: string }) => row.start_date },
    { key: 'end_date', header: 'Selesai', render: (row: { end_date: string }) => row.end_date },
    {
      key: 'status',
      header: 'Status',
      render: (row: { status: string }) => (
        <Badge variant={row.status as any}>{getStatusLabel(row.status)}</Badge>
      ),
    },
    {
      key: 'total_price',
      header: 'Total',
      render: (row: { total_price: number }) => formatCurrency(row.total_price),
      className: 'text-right',
    },
    {
      key: 'actions',
      header: '',
      render: (row: { id: number }) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = `/rentals/${row.id}/edit`}>
            Edit
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ]

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const debouncedSearch = debounce((value: unknown) => {
    handleFilterChange('customer_name', value as string)
  }, 300)

  const handleExportCSV = () => {
    if (!data?.items.length) return
    const exportData = data.items.map((rental) => ({
      ID: rental.id,
      Pelanggan: rental.customer_name,
      Email: rental.customer_email || '-',
      Telepon: rental.customer_phone || '-',
      Komputer: rental.computer?.name || '-',
      'Tanggal Mulai': rental.start_date,
      'Tanggal Selesai': rental.end_date,
      Status: getStatusLabel(rental.status),
      'Total Harga': formatCurrency(rental.total_price),
      'Dibayar': formatCurrency(rental.paid_amount),
      'Status Pembayaran': rental.payment_status,
      'Dibuat': rental.created_at,
    }))
    
    const headers = Object.keys(exportData[0])
    const rows = exportData.map(row => headers.map(h => `"${(row as Record<string, unknown>)[h]}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `rentals-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Sewa</h1>
          <p className="text-gray-500">Kelola dan pantau semua transaksi sewa</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExportCSV} variant="secondary">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => window.location.href = '/rentals/new'}>
            <PlusIcon className="h-4 w-4" />
            Sewa Baru
          </Button>
        </div>
      </div>

      <Card padding="md">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama pelanggan..."
              value={filters.customer_name}
              onChange={(e) => debouncedSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <Select
            options={statusOptions}
            value={filters.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('status', e.target.value)}
            placeholder="Filter Status"
            className="w-full sm:w-48"
          />
          <Select
            options={sortOptions}
            value={filters.sort_by}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('sort_by', e.target.value)}
            placeholder="Urutkan"
            className="w-full sm:w-48"
          />
          <Select
            options={[
              { value: 'desc', label: 'Menurun' },
              { value: 'asc', label: 'Menaik' },
            ]}
            value={filters.sort_order}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleFilterChange('sort_order', e.target.value)}
            className="w-full sm:w-32"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Dari:</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('date_from', e.target.value)}
              className="input w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sampai:</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange('date_to', e.target.value)}
              className="input w-40"
            />
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table
            columns={rentalColumns}
            data={data?.items || []}
            keyExtractor={(row) => String(row.id)}
            isLoading={isLoading}
            emptyMessage="Tidak ada data sewa yang sesuai filter"
          />
        </CardContent>
        {data && data.total_pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <Pagination
              currentPage={data.page}
              totalPages={data.total_pages}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </div>
        )}
      </Card>
    </div>
  )
}