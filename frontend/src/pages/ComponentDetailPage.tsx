import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Monitor, Settings, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Badge, getStatusBadge, getComponentTypeLabel } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useComponent, useDeleteComponent, useUpdateComponent } from '../hooks/useQueries';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import type { Component } from '../types';

export function ComponentDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: component, isLoading, error, refetch } = useComponent(id || '');
  const deleteMutation = useDeleteComponent();
  const updateMutation = useUpdateComponent();

  const handleStatusChange = async (status: Component['status']) => {
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
          <h1 className="text-3xl font-bold">Component Details</h1>
        </div>
        <Card>
          <CardContent className="h-64 animate-pulse" />
        </Card>
      </div>
    );
  }

  if (error || !component) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-destructive">Component not found</h2>
        <Link to="/components">
          <Button className="mt-4">Back to Components</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/components" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{component.name}</h1>
            <p className="text-muted-foreground">{component.serialNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/components/${component.id}/edit`}>
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
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="font-medium">{getComponentTypeLabel(component.type)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Manufacturer</dt>
                  <dd className="font-medium">{component.manufacturer}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Model</dt>
                  <dd className="font-medium">{component.model}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Status</dt>
                  <dd className="font-medium">{getStatusBadge(component.status)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Installed In</dt>
                  <dd className="font-medium">
                    {component.computer ? (
                      <Link to={`/computers/${component.computer.id}`} className="text-primary hover:underline">
                        {component.computer.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Not installed</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Purchase Date</dt>
                  <dd className="font-medium">{formatDate(component.purchaseDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Purchase Price</dt>
                  <dd className="font-medium">{formatCurrency(component.purchasePrice)}</dd>
                </div>
                {component.warrantyExpiry && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Warranty Expiry</dt>
                    <dd className="font-medium">{formatDate(component.warrantyExpiry)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDateTime(component.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{formatDateTime(component.updatedAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {Object.keys(component.specifications).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(component.specifications).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm text-muted-foreground">
                        {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                      </dt>
                      <dd className="font-medium font-mono text-sm">{value}</dd>
                    </div>
                  ))}
                </dl>
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
              {component.status !== 'installed' && component.computerId && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Install / Uninstall</p>
                  <Button
                    variant={component.status === 'available' ? 'primary' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusChange('installed')}
                    disabled={updateMutation.isPending}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Mark as Installed
                  </Button>
                </div>
              )}
              
              {component.status === 'installed' && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Install / Uninstall</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleStatusChange('available')}
                    disabled={updateMutation.isPending}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Mark as Available
                  </Button>
                </div>
              )}

              <hr />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Change Status</p>
                <div className="space-y-2">
                  {['available', 'installed', 'maintenance', 'retired'].map((status) => (
                    <Button
                      key={status}
                      variant={component.status === status ? 'primary' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleStatusChange(status as Component['status'])}
                      disabled={component.status === status || updateMutation.isPending}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-lg font-bold">{getComponentTypeLabel(component.type)}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="text-lg font-bold capitalize">{component.status}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Value</p>
                <p className="text-lg font-bold">{formatCurrency(component.purchasePrice)}</p>
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
            onSuccess: () => navigate('/components'),
          });
        }}
        title="Delete Component"
        message={`Are you sure you want to delete "${component.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
  }
