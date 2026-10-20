import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Pagination } from '../components/ui/Table';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge, getStatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useComputers, useDeleteComputer, useComputerStats } from '../hooks/useQueries';
import { useDebounce } from '../hooks/useUtils';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Computer, FilterParams } from '../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

export function ComputersPage() {
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

  const { data, isLoading, error, refetch } = useComputers({
    page,
    limit,
    search: debouncedSearch,
    status: statusFilter,
    sortBy,
    sortOrder,
  });
  const deleteMutation = useDeleteComputer();
  const { data: stats } = useComputerStats();

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
    { key: 'name', header: 'Name', sortable: true, render: (computer: Computer) => (
      <Link to={`/computers/${computer.id}`} className="font-medium text-primary hover:underline">
        {computer.name}
      </Link>
    )},
    { key: 'serialNumber', header: 'Serial Number', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (computer: Computer) => getStatusBadge(computer.status) },
    { key: 'location', header: 'Location', sortable: true },
    { key: 'purchasePrice', header: 'Price', sortable: true, render: (computer: Computer) => formatCurrency(computer.purchasePrice) },
    { key: 'createdAt', header: 'Created', sortable: true, render: (computer: Computer) => formatDate(computer.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Computers</h1>
          <p className="text-muted-foreground">Manage computer inventory</p>
        </div>
        <Link to="/computers/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Computer
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search computers..."
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
                  { value: 'name', label: 'Name' },
                  { value: 'serialNumber', label: 'Serial Number' },
                  { value: 'model', label: 'Model' },
                  { value: 'status', label: 'Status' },
                  { value: 'location', label: 'Location' },
                  { value: 'purchasePrice', label: 'Price' },
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
            keyExtractor={(computer) => computer.id}
            isLoading={isLoading}
            emptyMessage="No computers found"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowClassName={(computer) => computer.status === 'maintenance' ? 'bg-yellow-50/50' : computer.status === 'retired' ? 'bg-red-50/50' : ''}
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
        title="Delete Computer"
        message="Are you sure you want to delete this computer? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}