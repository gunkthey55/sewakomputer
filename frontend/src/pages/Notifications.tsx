import { useNotifications, useUnreadNotificationsCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/api/hooks'
import { formatDateTime, getStatusLabel } from '@/utils/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/helpers'
import { BellIcon, CheckCircleIcon, EnvelopeOpenIcon } from '@heroicons/react/24/outline'

export function Notifications() {
  const { data: notificationsData, isLoading } = useNotifications()
  const { data: unreadCountData } = useUnreadNotificationsCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = notificationsData?.items || []
  const unreadCount = unreadCountData?.unread_count || 0

  const handleMarkRead = (id: number) => {
    markRead.mutate(id)
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-gray-500">Kelola notifikasi dan reminder sewa</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead} disabled={markAllRead.isPending}>
            <CheckCircleIcon className="h-4 w-4" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Semua Notifikasi</CardTitle>
          {unreadCount > 0 && (
            <Badge variant="active">{unreadCount} belum dibaca</Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Belum ada notifikasi</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-4 hover:bg-gray-50 transition-colors',
                    notification.status !== 'read' && 'bg-blue-50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'w-2 h-2 mt-2 rounded-full flex-shrink-0',
                        notification.status !== 'read' ? 'bg-primary-500' : 'bg-gray-300'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={cn('font-medium', notification.status !== 'read' && 'font-semibold')}>
                          {notification.title}
                        </h4>
                        {notification.status !== 'read' && (
                          <Badge variant="active" className="text-xs">Baru</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{formatDateTime(notification.created_at)}</span>
                        {notification.rental && (
                          <span className="flex items-center gap-1">
                            <Badge variant={notification.rental.status as any}>
                              {getStatusLabel(notification.rental.status)}
                            </Badge>
                            {notification.rental.user?.full_name || notification.rental.user?.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {notification.status !== 'read' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRead(notification.id)}
                        disabled={markRead.isPending}
                        aria-label="Tandai sudah dibaca"
                      >
                        <EnvelopeOpenIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}