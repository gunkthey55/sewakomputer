import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, Pagination } from '../components/ui/Table';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge, getStatusBadge, getComponentTypeLabel } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useComponents, useDeleteComponent } from '../hooks/useQueries';
import { useDebounce } from '../hooks/useUtils';
import { formatCurrency, formatDate } from '../utils/helpers';
import type { Component, FilterParams } from '../types';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'available', label: 'Available' },
  { value: 'installed', label: 'Installed' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'cpu', label: 'CPU' },
  { value: 'ram', label: 'RAM' },
  { value: 'storage', label: 'Storage' },
  { value: 'gpu', label: 'GPU' },
  { value: 'motherboard', label: 'Motherboard' },
  { value: 'psu', label: 'Power Supply' },
  { value: 'cooler', label: 'Cooler' },
  { value: 'case', label: 'Case' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'keyboard', label: 'Keyboard' },
  { value: 'mouse', label: 'Mouse' },
  { value: 'other', label: 'Other' },
];

export function ComponentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [sortBy, setSortBy] = useState<FilterParams['sortBy']>(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState<FilterParams['sortOrder']>((searchParams.get('sortOrder') as FilterParams['sortOrder']) || 'desc');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [limit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, error, refetch } = useComponents({
    page,
    limit,
    search: debouncedSearch,
    status: statusFilter,
    type: typeFilter,
    sortBy,
    sortOrder,
  });
  const deleteMutation = useDeleteComponent();

  useEffect(() => {
    setSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search: debouncedSearch,
      status: statusFilter,
      type: typeFilter,
      sortBy,
      sortOrder,
    });
  }, [page, debouncedSearch, statusFilter, typeFilter, sortBy, sortOrder, setSearchParams]);

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
    { key: 'name', header: 'Name', sortable: true, render: (component: Component) => (
      <Link to={`/components/${component.id}`} className="font-medium text-primary hover:underline">
        {component.name}
      </Link>
    )},
    { key: 'type', header: 'Type', sortable: true, render: (component: Component) => (
      <Badge variant="default">{getComponentTypeLabel(component.type)}</Badge>
    )},
    { key: 'serialNumber', header: 'Serial Number', sortable: true },
    { key: 'manufacturer', header: 'Manufacturer', sortable: true },
    { key: 'model', header: 'Model', sortable: true },
    { key: 'status', header: 'Status', sortable: true, render: (component: Component) => getStatusBadge(component.status) },
    { key: 'computer', header: 'Installed In', sortable: false, render: (component: Component) => (
      component.computer ? (
        <Link to={`/computers/${component.computer.id}`} className="text-primary hover:underline">
          {component.computer.name}
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    )},
    { key: 'purchasePrice', header: 'Price', sortable: true, render: (component: Component) => formatCurrency(component.purchasePrice) },
    { key: 'createdAt', header: 'Created', sortable: true, render: (component: Component) => formatDate(component.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Components</h1>
          <p className="text-muted-foreground">Manage computer components</p>
        </div>
        <Link to="/components/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Component
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={statusOptions}
              className="w-full sm:w-40"
            />
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              options={typeOptions}
              className="w-full sm:w-40"
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
                  { value: 'type', label: 'Type' },
                  { value: 'serialNumber', label: 'Serial Number' },
                  { value: 'manufacturer', label: 'Manufacturer' },
                  { value: 'model', label: 'Model' },
                  { value: 'status', label: 'Status' },
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
            keyExtractor={(component) => component.id}
            isLoading={isLoading}
            emptyMessage="No components found"
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            rowClassName={(component) => component.status === 'maintenance' ? 'bg-yellow-50/50' : component.status === 'retired' ? 'bg-red-50/50' : ''}
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
        title="Delete Component"
        message="Are you sure you want to delete this component? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}