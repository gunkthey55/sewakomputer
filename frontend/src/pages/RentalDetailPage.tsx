import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Play, CheckCircle, XCircle, Calendar, User, Package, Cpu, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { Badge, getStatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useRental, useDeleteRental, useStartRental, useCompleteRental, useCancelRental, useUpdateRental } from '../hooks/useQueries';
import { formatCurrency, formatDate, formatDateTime } from '../utils/helpers';
import { toast } from 'react-hot-toast';
import type { Rental } from '../types';

export function RentalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: rental, isLoading, error, refetch } = useRental(id || '');
  const deleteMutation = useDeleteRental();
  const startMutation = useStartRental();
  const completeMutation = useCompleteRental();
  const cancelMutation = useCancelRental();
  const updateMutation = useUpdateRental();

  const handleAction = async (action: 'start' | 'complete' | 'cancel') => {
    try {
      if (action === 'start') await startMutation.mutateAsync(id!);
      else if (action === 'complete') await completeMutation.mutateAsync(id!);
      else if (action === 'cancel') await cancelMutation.mutateAsync(id!);
      toast.success(`Rental ${action}ed successfully`);
      refetch();
    } catch {
      toast.error(`Failed to ${action} rental`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Rental Details</h1>
        </div>
        <Card>
          <CardContent className="h-64 animate-pulse" />
        </Card>
      </div>
    );
  }

  if (error || !rental) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-destructive">Rental not found</h2>
        <Link to="/rentals">
          <Button className="mt-4">Back to Rentals</Button>
        </Link>
      </div>
    );
  }

  const isPending = rental.status === 'pending';
  const isActive = rental.status === 'active';
  const isCompleted = rental.status === 'completed';
  const isCancelled = rental.status === 'cancelled';
  const isOverdue = rental.status === 'overdue';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/rentals" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Rental #{rental.id.slice(0, 8)}</h1>
            <p className="text-muted-foreground">{rental.purpose}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/rentals/${rental.id}/edit`}>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Rental Information</CardTitle>
              <Badge variant={['pending', 'overdue'].includes(rental.status) ? 'warning' : rental.status === 'active' ? 'success' : rental.status === 'completed' ? 'default' : 'destructive'}>
                {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-muted-foreground">Computer</dt>
                  <dd className="font-medium">
                    <Link to={`/computers/${rental.computer.id}`} className="text-primary hover:underline">
                      {rental.computer.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">User</dt>
                  <dd className="font-medium">
                    <Link to={`/users/${rental.user.id}`} className="text-primary hover:underline">
                      {rental.user.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Start Date</dt>
                  <dd className="font-medium">{formatDate(rental.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">End Date</dt>
                  <dd className="font-medium">{formatDate(rental.endDate)}</dd>
                </div>
                {rental.actualReturnDate && (
                  <div>
                    <dt className="text-sm text-muted-foreground">Actual Return</dt>
                    <dd className="font-medium">{formatDate(rental.actualReturnDate)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-muted-foreground">Total Price</dt>
                  <dd className="font-medium text-lg">{formatCurrency(rental.totalPrice)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Created</dt>
                  <dd className="font-medium">{formatDateTime(rental.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Updated</dt>
                  <dd className="font-medium">{formatDateTime(rental.updatedAt)}</dd>
                </div>
              </dl>

              {rental.notes && (
                <div className="pt-4 border-t">
                  <dt className="text-sm text-muted-foreground">Notes</dt>
                  <dd className="font-medium mt-1 whitespace-pre-wrap">{rental.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>

          {rental.components.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Components ({rental.components.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rental.components.map((rc) => (
                    <Link key={rc.id} to={`/components/${rc.component.id}`} className="no-underline">
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Cpu className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{rc.component.name}</p>
                            <p className="text-sm text-muted-foreground">{rc.component.serialNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">Qty: {rc.quantity}</p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(rc.price)} each</p>
                        </div>
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
              {isPending && (
                <Button
                  className="w-full"
                  onClick={() => handleAction('start')}
                  isLoading={startMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Rental
                </Button>
              )}
              {isActive && (
                <>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => handleAction('complete')}
                    isLoading={completeMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Rental
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => handleAction('cancel')}
                    isLoading={cancelMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Rental
                  </Button>
                </>
              )}
              {(isCompleted || isCancelled) && (
                <Button
                  className="w-full"
                  variant="outline"
                  disabled
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelled
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Rental Created</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(rental.createdAt)}</p>
                  </div>
                </div>
                {rental.status !== 'pending' && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Play className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Rental Started</p>
                      <p className="text-sm text-muted-foreground">{formatDate(rental.startDate)}</p>
                    </div>
                  </div>
                )}
                {rental.actualReturnDate && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Rental Completed</p>
                      <p className="text-sm text-muted-foreground">{formatDate(rental.actualReturnDate)}</p>
                    </div>
                  </div>
                )}
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
            onSuccess: () => navigate('/rentals'),
          });
        }}
        title="Delete Rental"
        message={`Are you sure you want to delete this rental? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
  }
