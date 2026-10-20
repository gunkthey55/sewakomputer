import { useState, useEffect } from 'react';
import { Bell, Check, Mail, X, Filter, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Pagination } from '../components/ui/Table';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification } from '../hooks/useQueries';
import { useDebounce } from '../hooks/useUtils';
import { formatRelativeTime } from '../utils/helpers';
import { useNotificationsStore } from '../store/notificationsStore';
import { useWebSocketNotifications } from '../hooks/useWebSocket';
import type { Notification, FilterParams } from '../types';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

export function NotificationsPage() {
  const { isConnected } = useWebSocketNotifications();
  const { notifications: storeNotifications, unreadCount, fetchUnreadCount } = useNotificationsStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [readFilter, setReadFilter] = useState(searchParams.get('read') || '');
  const [sortBy, setSortBy] = useState<FilterParams['sortBy']>(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<FilterParams['sortOrder']>((searchParams.get('sortOrder') as FilterParams['sortOrder']) || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [limit] = useState(20);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, refetch } = useNotifications({
    page,
    limit,
    search: debouncedSearch,
    type: typeFilter,
    read: readFilter === 'true' ? 'true' : readFilter === 'false' ? 'false' : undefined,
    sortBy,
    sortOrder,
  });
  const { data: unreadCountQuery } = useUnreadNotificationsCount();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  useEffect(() => {
    setSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearch,
      type: typeFilter,
      read: readFilter,
      sortBy,
      sortOrder,
    });
  }, [page, debouncedSearch, typeFilter, readFilter, sortBy, sortOrder, setSearchParams]);

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const columns = [
    { key: 'type', header: 'Type', sortable: true, render: (notification: Notification) => (
      <Badge variant={notification.type === 'success' ? 'success' : notification.type === 'warning' ? 'warning' : notification.type === 'error' ? 'destructive' : 'info'}>
        {notification.type}
      </Badge>
    )},
    { key: 'title', header: 'Title', sortable: true, render: (notification: Notification) => (
      <span className={cn('font-medium', !notification.read && 'font-bold')}>
        {notification.title}
      </span>
    )},
    { key: 'message', header: 'Message', sortable: false, render: (notification: Notification) => (
      <span className={cn('text-muted-foreground truncate max-w-xs', !notification.read && 'font-medium')}>
        {notification.message}
      </span>
    )},
    { key: 'read', header: 'Status', sortable: true, render: (notification: Notification) => (
      <Badge variant={notification.read ? 'default' : 'success'}>
        {notification.read ? 'Read' : 'Unread'}
      </Badge>
    )},
    { key: 'createdAt', header: 'Time', sortable: true, render: (notification: Notification) => formatRelativeTime(notification.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', isConnected ? 'bg-green-100' : 'bg-red-100')}>
            <Bell className={cn('h-5 w-5', isConnected ? 'text-green-600' : 'text-red-600')} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCountQuery || unreadCount} unread of {data?.total || 0} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending || unreadCount === 0}>
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
          <Button variant="outline" onClick={refetch} isLoading={isLoading}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              options={typeOptions}
              className="w-full sm:w-40"
            />
            <Select
              value={readFilter}
              onChange={(e) => { setReadFilter(e.target.value); setPage(1); }}
              options={[
                { value: '', label: 'All' },
                { value: 'false', label: 'Unread' },
                { value: 'true', label: 'Read' },
              ]}
              className="w-full sm:w-40"
            />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <Table
            columns={columns}
            data={data?.data || []}
            keyExtractor={(notification) => notification.id}
            isLoading={isLoading}
            emptyMessage="No notifications found"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowClassName={(notification) => !notification.read ? 'bg-primary/5' : ''}
            onRowClick={(notification) => {
              if (!notification.read) {
                markAsReadMutation.mutate(notification.id);
              }
            }}
          />
          {data && (
            <Pagination
              currentPage={data.page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Link, useSearchParams } from 'react-router-dom';
import { cn } from '../utils/helpers';
import { Search } from 'lucide-react';