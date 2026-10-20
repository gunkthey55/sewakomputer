import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, User, Calendar, Package, Plus } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { ComponentSelector } from '../components/ui/ComponentSelector';
import { Badge } from '../components/ui/Badge';
import { useCreateRental, useUpdateRental, useRental, useAvailableComponents } from '../hooks/useQueries';
import { useComputers } from '../hooks/useQueries';
import { toast } from 'react-hot-toast';
import type { Component } from '../types';

const rentalSchema = z.object({
  computerId: z.string().min(1, 'Computer is required'),
  userId: z.string().min(1, 'User is required'),
  components: z.array(z.object({
    componentId: z.string(),
    quantity: z.number().min(1),
  })).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  purpose: z.string().min(1, 'Purpose is required'),
  notes: z.string().optional(),
});

type RentalFormData = z.infer<typeof rentalSchema>;

export function RentalFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const isEdit = !!id;
  const preSelectedComputerId = searchParams.get('computerId');

  const { data: rental, isLoading: loadingRental } = useRental(id || '', isEdit);
  const { data: computers, isLoading: loadingComputers } = useComputers({ status: 'available', limit: 100 });
  const { data: availableComponents } = useAvailableComponents();
  const createMutation = useCreateRental();
  const updateMutation = useUpdateRental();

  const [selectedComponents, setSelectedComponents] = useState<Array<{ component: Component; quantity: number }>>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema),
    defaultValues: {
      computerId: preSelectedComputerId || '',
      userId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purpose: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (isEdit && rental) {
      setValue('computerId', rental.computerId);
      setValue('userId', rental.userId);
      setValue('startDate', rental.startDate.split('T')[0]);
      setValue('endDate', rental.endDate.split('T')[0]);
      setValue('purpose', rental.purpose);
      setValue('notes', rental.notes || '');
      setSelectedComponents(rental.components.map((rc) => ({
        component: rc.component,
        quantity: rc.quantity,
      })));
    }
  }, [isEdit, rental, setValue]);

  const watchedComputerId = watch('computerId');
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  const filteredComponents = availableComponents?.filter(
    (c) => c.status === 'available' && (!watchedComputerId || c.computerId === watchedComputerId)
  ) || [];

  const onSubmit = async (data: RentalFormData) => {
    const componentData = selectedComponents.map((sc) => ({
      componentId: sc.component.id,
      quantity: sc.quantity,
    }));

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data: { ...data, components: componentData } });
        toast.success('Rental updated successfully');
      } else {
        await createMutation.mutateAsync({ ...data, components: componentData });
        toast.success('Rental created successfully');
      }
      navigate('/rentals');
    } catch (error) {
      toast.error('Failed to save rental');
    }
  };

  const isLoading = loadingRental || loadingComputers || isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/rentals" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Rental' : 'Create Rental'}</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update rental details' : 'Create a new computer rental'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rental Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Computer"
                error={errors.computerId?.message}
                options={[
                  { value: '', label: 'Select a computer' },
                  ...(computers?.data || []).map((c) => ({ value: c.id, label: `${c.name} (${c.serialNumber})` })),
                ]}
                {...register('computerId')}
              />
              <Select
                label="User"
                error={errors.userId?.message}
                options={[
                  { value: '', label: 'Select a user' },
                  { value: '1', label: 'John Doe' },
                  { value: '2', label: 'Jane Smith' },
                  { value: '3', label: 'Bob Wilson' },
                ]}
                {...register('userId')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <DatePicker
                label="End Date"
                error={errors.endDate?.message}
                minDate={watchedStartDate ? new Date(watchedStartDate) : undefined}
                {...register('endDate')}
              />
            </div>
            <Input
              label="Purpose"
              placeholder="e.g., Software development project"
              error={errors.purpose?.message}
              {...register('purpose')}
            />
            <Textarea
              label="Notes (Optional)"
              placeholder="Additional notes about this rental"
              {...register('notes')}
              rows={3}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Components</CardTitle>
              <span className="text-sm text-muted-foreground">{selectedComponents.length} selected</span>
            </div>
          </CardHeader>
          <CardContent>
            <ComponentSelector
              selectedComponents={selectedComponents}
              onChange={setSelectedComponents}
              availableComponents={filteredComponents}
              allowMultiple
              showQuantity
            />
          </CardContent>
        </Card>

        <CardFooter className="flex justify-end gap-3">
          <Link to="/rentals">
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Rental
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}