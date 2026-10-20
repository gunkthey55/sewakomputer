import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Pagination } from '../components/ui/Table';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge, getStatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useRentals, useDeleteRental } from '../hooks/useQueries';
import { useDebounce } from '../hooks/useUtils';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Rental, FilterParams } from '../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'overdue', label: 'Overdue' },
];

export function RentalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState<FilterParams['sortBy']>(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<FilterParams['sortOrder']>((searchParams.get('sortOrder') as FilterParams['sortOrder']) || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [limit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, error, refetch } = useRentals({
    page,
    limit,
    search: debouncedSearch,
    status: statusFilter,
    sortBy,
    sortOrder,
  });
  const deleteMutation = useDeleteRental();

  useEffect(() => {
    setSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearch,
      status: statusFilter,
      sortBy,
      sortOrder,
    });
  }, [page, debouncedSearch, statusFilter, sortBy, sortOrder, setSearchParams]);

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
    { key: 'id', header: 'ID', sortable: true, render: (rental: Rental) => (
      <Link to={`/rentals/${rental.id}`} className="font-mono text-sm text-primary hover:underline">
        {rental.id.slice(0, 8)}...
      </Link>
    )},
    { key: 'computer', header: 'Computer', sortable: false, render: (rental: Rental) => (
      <Link to={`/computers/${rental.computer.id}`} className="font-medium text-primary hover:underline">
        {rental.computer.name}
      </Link>
    )},
    { key: 'user', header: 'User', sortable: false, render: (rental: Rental) => (
      <Link to={`/users/${rental.user.id}`} className="font-medium text-primary hover:underline">
        {rental.user.name}
      </Link>
    )},
    { key: 'startDate', header: 'Start Date', sortable: true, render: (rental: Rental) => formatDate(rental.startDate) },
    { key: 'endDate', header: 'End Date', sortable: true, render: (rental: Rental) => formatDate(rental.endDate) },
    { key: 'status', header: 'Status', sortable: true, render: (rental: Rental) => getStatusBadge(rental.status) },
    { key: 'totalPrice', header: 'Total', sortable: true, render: (rental: Rental) => formatCurrency(rental.totalPrice) },
    { key: 'createdAt', header: 'Created', sortable: true, render: (rental: Rental) => formatDate(rental.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rentals</h1>
          <p className="text-muted-foreground">Manage computer rentals</p>
        </div>
        <Link to="/rentals/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Rental
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search rentals..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={statusOptions}
              className="w-full sm:w-48"
            />
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" onClick={refetch} isLoading={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                options={[
                  { value: 'startDate', label: 'Start Date' },
                  { value: 'endDate', label: 'End Date' },
                  { value: 'status', label: 'Status' },
                  { value: 'totalPrice', label: 'Total Price' },
                  { value: 'createdAt', label: 'Created Date' },
                ]}
              />
              <Select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as FilterParams['sortOrder'])}
                options={[
                  { value: 'asc', label: 'Ascending' },
                  { value: 'desc', label: 'Descending' },
                ]}
              />
            </div>
          </CardContent>
        )}

        <CardContent className="pt-0">
          <Table
            columns={columns}
            data={data?.data || []}
            keyExtractor={(rental) => rental.id}
            isLoading={isLoading}
            emptyMessage="No rentals found"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
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

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          deleteMutation.mutate(deleteConfirm!, {
            onSuccess: () => setDeleteConfirm(null),
          });
        }}
        title="Delete Rental"
        message="Are you sure you want to delete this rental? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}