import { useState } from 'react'
import { useRentals } from '@/api/hooks'
import { formatCurrency, getStatusLabel, debounce } from '@/utils/helpers'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Table, Pagination } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { cn } from '@/utils/helpers'
import type { RentalStatus } from '@/api/types'
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

const statusOptions = [
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'active', label: 'Aktif' },
  { value: 'overdue', label: 'Terlambat' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const sortOptions = [
  { value: 'created_at', label: 'Terbaru' },
  { value: 'start_date', label: 'Tanggal Mulai' },
  { value: 'end_date', label: 'Tanggal Selesai' },
  { value: 'total_price', label: 'Total Harga' },
]

export function RentalsList() {
  const [filters, setFilters] = useState<{
    status: RentalStatus | undefined
    search: string
    page: number
    page_size: number
  }>({
    status: undefined,
    search: '',
    page: 1,
    page_size: 10,
  })

  const { data, isLoading, error } = useRentals(filters)

  const rentalColumns = [
    { 
      key: 'user', 
      header: 'Pelanggan', 
      render: (row: any) => row.user?.full_name || row.user?.email || '-' 
    },
    { 
      key: 'items', 
      header: 'Item Sewa', 
      render: (row: any) => row.items?.map((item: any) => item.computer?.name || item.computer?.brand + ' ' + item.computer?.model).join(', ') || '-' 
    },
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
    {
      key: 'actions',
      header: '',
      render: (row: any) => (
        <div className="flex items-center gap-2 justify-end">
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
    handleFilterChange('search', value as string)
  }, 300)

  const handleExportCSV = () => {
    if (!data?.items.length) return
    const exportData = data.items.map((rental: any) => ({
      ID: rental.id,
      Pelanggan: rental.user?.full_name || rental.user?.email || '-',
      'Tanggal Mulai': rental.start_date,
      'Tanggal Selesai': rental.end_date,
      Status: getStatusLabel(rental.status),
      'Total Harga': formatCurrency(rental.total_price),
      Item: rental.items?.map((item: any) => `${item.computer?.name || ''} x${item.quantity}`).join('; ') || '-',
      Dibuat: rental.created_at,
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
              placeholder="Cari pelanggan..."
              value={filters.search}
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