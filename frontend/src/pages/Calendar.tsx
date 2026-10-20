import { useState, useMemo } from 'react'
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { id } from 'date-fns/locale/id'
import { useRentals } from '@/api/hooks'
import { getStatusLabel, formatDateTime } from '@/utils/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'

const locales = { id }
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales })

const statusColors: Record<string, string> = {
  active: '#10b981',
  pending: '#f59e0b',
  overdue: '#ef4444',
  completed: '#6b7280',
  cancelled: '#9ca3af',
}

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  resource: any
  backgroundColor: string
  borderColor: string
}

export function Calendar() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedRental, setSelectedRental] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const { data } = useRentals({ page_size: 500 })

  const events = useMemo((): CalendarEvent[] => {
    if (!data?.items) return []
    return data.items.map((rental) => {
      // Get the first computer from items for display
      const firstItem = rental.items?.[0]
      const computerName = firstItem?.computer?.name || firstItem?.computer?.brand + ' ' + firstItem?.computer?.model || 'PC'
      const customerName = rental.user?.full_name || 'Unknown'
      return {
        id: rental.id,
        title: `${customerName} - ${computerName}`,
        start: new Date(rental.start_date),
        end: new Date(rental.end_date),
        resource: rental,
        backgroundColor: statusColors[rental.status] || '#6b7280',
        borderColor: statusColors[rental.status] || '#6b7280',
      }
    })
  }, [data])

  const handleSelectEvent = (event: { resource: any }) => {
    setSelectedRental(event.resource)
    setModalOpen(true)
  }

  const formatDate = (date: Date) => {
    return formatDateTime(date)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalender Sewa</h1>
          <p className="text-gray-500">Lihat jadwal sewa dalam tampilan kalender</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as any)}
            className="input w-auto"
          >
            <option value="month">Bulan</option>
            <option value="week">Minggu</option>
            <option value="day">Hari</option>
          </select>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="btn-secondary btn-sm"
          >
            <HomeIcon className="h-4 w-4" />
            Hari Ini
          </button>
          <button
            onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()))}
            className="btn-secondary btn-sm"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(d => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()))}
            className="btn-secondary btn-sm"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '70vh' }}>
            <BigCalendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              defaultDate={selectedDate}
              defaultView={view}
              views={['month', 'week', 'day']}
              onSelectEvent={handleSelectEvent}
              onNavigate={(date: Date) => setSelectedDate(date)}
              components={{
                event: ({ event }: { event: CalendarEvent }) => (
                  <div
                    className="bg-primary-600 text-white px-1 py-0.5 rounded text-xs truncate"
                    style={{ backgroundColor: event.backgroundColor, borderColor: event.borderColor }}
                  >
                    {event.title}
                  </div>
                ),
                dateCellWrapper: ({ children }: { children: React.ReactNode }) => <div className="h-full">{children}</div>,
              }}
              min={new Date(2020, 0, 1)}
              max={new Date(2030, 11, 31)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legenda Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusColors).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm text-gray-700">{getStatusLabel(status)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Detail Sewa"
        size="lg"
      >
        {selectedRental && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Pelanggan</p>
                <p className="font-medium">{selectedRental.user?.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedRental.user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Telepon</p>
                <p className="font-medium">{selectedRental.user?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Komputer</p>
                <p className="font-medium">{selectedRental.items?.[0]?.computer?.name || selectedRental.items?.[0]?.computer?.brand + ' ' + selectedRental.items?.[0]?.computer?.model || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Mulai</p>
                <p className="font-medium">{formatDate(new Date(selectedRental.start_date))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Selesai</p>
                <p className="font-medium">{formatDate(new Date(selectedRental.end_date))}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium"><Badge variant={selectedRental.status as any}>{getStatusLabel(selectedRental.status)}</Badge></p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(selectedRental.total_price)}</p>
              </div>
            </div>
            {selectedRental.items?.length > 0 && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Item Sewa:</p>
                <ul className="space-y-1 text-sm">
                  {selectedRental.items.map((item: any) => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.computer?.name || item.computer?.brand + ' ' + item.computer?.model} x{item.quantity}</span>
                      <span>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.unit_price)}/hari</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedRental.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Catatan:</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedRental.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}