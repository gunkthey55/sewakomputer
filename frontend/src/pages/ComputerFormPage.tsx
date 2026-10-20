import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import { useCreateComputer, useUpdateComputer, useComputer } from '../hooks/useQueries';
import { toast } from 'react-hot-toast';

const computerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  serialNumber: z.string().min(1, 'Serial number is required').max(50),
  model: z.string().min(1, 'Model is required').max(100),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100),
  status: z.enum(['available', 'rented', 'maintenance', 'retired']),
  location: z.string().min(1, 'Location is required').max(100),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchasePrice: z.number().min(0, 'Price must be positive'),
  specifications: z.object({
    cpu: z.string().min(1, 'CPU is required'),
    ram: z.string().min(1, 'RAM is required'),
    storage: z.string().min(1, 'Storage is required'),
    gpu: z.string().optional(),
    os: z.string().min(1, 'OS is required'),
  }),
});

type ComputerFormData = z.infer<typeof computerSchema>;

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'rented', label: 'Rented' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

export function ComputerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: computer, isLoading: loadingComputer } = useComputer(id || '', isEdit);
  const createMutation = useCreateComputer();
  const updateMutation = useUpdateComputer();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ComputerFormData>({
    resolver: zodResolver(computerSchema),
    defaultValues: {
      name: '',
      serialNumber: '',
      model: '',
      manufacturer: '',
      status: 'available',
      location: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      specifications: {
        cpu: '',
        ram: '',
        storage: '',
        gpu: '',
        os: '',
      },
    },
  });

  useEffect(() => {
    if (isEdit && computer) {
      setValue('name', computer.name);
      setValue('serialNumber', computer.serialNumber);
      setValue('model', computer.model);
      setValue('manufacturer', computer.manufacturer);
      setValue('status', computer.status);
      setValue('location', computer.location);
      setValue('purchaseDate', computer.purchaseDate.split('T')[0]);
      setValue('purchasePrice', computer.purchasePrice);
      setValue('specifications.cpu', computer.specifications.cpu);
      setValue('specifications.ram', computer.specifications.ram);
      setValue('specifications.storage', computer.specifications.storage);
      setValue('specifications.gpu', computer.specifications.gpu || '');
      setValue('specifications.os', computer.specifications.os);
    }
  }, [isEdit, computer, setValue]);

  const onSubmit = async (data: ComputerFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data });
        toast.success('Computer updated successfully');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Computer created successfully');
      }
      navigate('/computers');
    } catch (error) {
      toast.error('Failed to save computer');
    }
  };

  const isLoading = loadingComputer || isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/computers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Computer' : 'Add Computer'}</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update computer details' : 'Add a new computer to inventory'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Name"
                placeholder="e.g., Office Desktop 01"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                label="Serial Number"
                placeholder="e.g., SN123456789"
                error={errors.serialNumber?.message}
                {...register('serialNumber')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Model"
                placeholder="e.g., OptiPlex 7090"
                error={errors.model?.message}
                {...register('model')}
              />
              <Input
                label="Manufacturer"
                placeholder="e.g., Dell"
                error={errors.manufacturer?.message}
                {...register('manufacturer')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Status"
                error={errors.status?.message}
                options={statusOptions}
                {...register('status')}
              />
              <Input
                label="Location"
                placeholder="e.g., Building A, Floor 2, Room 201"
                error={errors.location?.message}
                {...register('location')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Purchase Date"
                type="date"
                error={errors.purchaseDate?.message}
                {...register('purchaseDate')}
              />
              <Input
                label="Purchase Price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                error={errors.purchasePrice?.message}
                {...register('purchasePrice', { valueAsNumber: true })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="CPU"
                placeholder="e.g., Intel Core i7-11700"
                error={errors.specifications?.cpu?.message}
                {...register('specifications.cpu')}
              />
              <Input
                label="RAM"
                placeholder="e.g., 16GB DDR4"
                error={errors.specifications?.ram?.message}
                {...register('specifications.ram')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Storage"
                placeholder="e.g., 512GB SSD"
                error={errors.specifications?.storage?.message}
                {...register('specifications.storage')}
              />
              <Input
                label="GPU (Optional)"
                placeholder="e.g., NVIDIA RTX 3060"
                {...register('specifications.gpu')}
              />
            </div>
            <Input
              label="Operating System"
              placeholder="e.g., Windows 11 Pro"
              error={errors.specifications?.os?.message}
              {...register('specifications.os')}
            />
          </CardContent>
        </Card>

        <CardFooter className="flex justify-end gap-3">
          <Link to="/computers">
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Computer
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}