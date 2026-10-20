import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Package, Cpu, Settings, Download, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Badge, getStatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useComputer, useDeleteComputer, useUpdateComputer } from '../hooks/useQueries';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import type { Computer } from '../types';

export function ComputerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: computer, isLoading, error, refetch } = useComputer(id || '');
  const deleteMutation = useDeleteComputer();
  const updateMutation = useUpdateComputer();

  const handleStatusChange = async (status: Computer['status']) => {
    try {
      await updateMutation.mutateAsync({ id: id!, data: { status } });
      toast.success(`Status updated to ${status}`);
      refetch();
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Computer Details</h1>
        </div>
        <Card>
          <CardContent className="h-64 animate-pulse" />
        </Card>
      </div>
    );
  }

  if (error || !computer) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-destructive">Computer not found</h2>
        <Link to="/computers">
          <Button className="mt-4">Back to Computers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/computers" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{computer.name}</h1>
            <p className="text-muted-foreground">{computer.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{computer.status.charAt(0).toUpperCase() + computer.status.slice(1)}</Badge>
          <Link to={`/computers/${computer.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setDeleteConfirm(true)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Model</dt>
                  <dd className="font-medium">{computer.model}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Manufacturer</dt>
                  <dd className="font-medium">{computer.manufacturer}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Location</dt>
                  <dd className="font-medium">{computer.location}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="font-medium">{getStatusBadge(computer.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Purchase Date</dt>
                  <dd className="font-medium">{formatDate(computer.purchaseDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Purchase Price</dt>
                  <dd className="font-medium">{formatCurrency(computer.purchasePrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDateTime(computer.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{formatDateTime(computer.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">CPU</dt>
                  <dd className="font-medium">{computer.specifications.cpu}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">RAM</dt>
                  <dd className="font-medium">{computer.specifications.ram}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Storage</dt>
                  <dd className="font-medium">{computer.specifications.storage}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">GPU</dt>
                  <dd className="font-medium">{computer.specifications.gpu || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Operating System</dt>
                  <dd className="font-medium">{computer.specifications.os}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {computer.components.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Installed Components ({computer.components.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {computer.components.map((component) => (
                    <Link key={component.id} to={`/components/${component.id}`} className="no-underline">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{component.name}</p>
                            <p className="text-sm text-muted-foreground">{component.serialNumber}</p>
                          </div>
                        </div>
                        <Badge variant="success">Installed</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Change Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['available', 'rented', 'maintenance', 'retired'].map((status) => (
                    <Button
                      key={status}
                      variant={computer.status === status ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleStatusChange(status as Computer['status'])}
                      disabled={computer.status === status || updateMutation.isPending}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <hr />
              <Link to={`/rentals/create?computerId=${computer.id}`}>
                <Button variant="outline" className="w-full">
                  <Package className="h-4 w-4 mr-2" />
                  Create Rental
                </Button>
              </Link>
              <Link to={`/components?computerId=${computer.id}`}>
                <Button variant="outline" className="w-full">
                  <Cpu className="h-4 w-4 mr-2" />
                  View Components
                </Button>
              </Link>
              <Link to={`/rentals?computerId=${computer.id}`}>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Rental History
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Components Installed</p>
                <p className="text-2xl font-bold">{computer.components.length}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-lg font-bold capitalize">{computer.status}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={() => {
          deleteMutation.mutate(id!, {
            onSuccess: () => navigate('/computers'),
          });
        }}
        title="Delete Computer"
        message={`Are you sure you want to delete "${computer.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
  }
