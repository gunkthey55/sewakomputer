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
import { useCreateComponent, useUpdateComponent, useComponent } from '../hooks/useQueries';
import { toast } from 'react-hot-toast';

const componentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['cpu', 'ram', 'storage', 'gpu', 'motherboard', 'psu', 'cooler', 'case', 'monitor', 'keyboard', 'mouse', 'other']),
  serialNumber: z.string().min(1, 'Serial number is required').max(50),
  manufacturer: z.string().min(1, 'Manufacturer is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  status: z.enum(['available', 'installed', 'maintenance', 'retired']),
  computerId: z.string().optional(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  purchasePrice: z.number().min(0, 'Price must be positive'),
  warrantyExpiry: z.string().optional(),
  specifications: z.record(z.string()).optional(),
});

type ComponentFormData = z.infer<typeof componentSchema>;

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'installed', label: 'Installed' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
];

const typeOptions = [
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

const specFields: Record<string, string[]> = {
  cpu: ['cores', 'threads', 'baseClock', 'boostClock', 'socket', 'tdp'],
  ram: ['capacity', 'speed', 'type', 'formFactor', 'voltage'],
  storage: ['capacity', 'type', 'interface', 'formFactor', 'readSpeed', 'writeSpeed'],
  gpu: ['vram', 'memoryType', 'baseClock', 'boostClock', 'tdp', 'powerConnectors'],
  motherboard: ['socket', 'chipset', 'formFactor', 'ramSlots', 'maxRam', 'pciSlots'],
  psu: ['wattage', 'efficiency', 'modular', 'formFactor'],
  cooler: ['type', 'fanSize', 'noiseLevel', 'tdpRating', 'socketCompatibility'],
  case: ['formFactor', 'material', 'color', 'maxGpuLength', 'maxCpuCoolerHeight', 'driveBays'],
  monitor: ['size', 'resolution', 'refreshRate', 'panelType', 'responseTime', 'ports'],
  keyboard: ['layout', 'switchType', 'backlight', 'connectivity', 'formFactor'],
  mouse: ['sensor', 'dpi', 'buttons', 'connectivity', 'weight', 'gripStyle'],
  other: [],
};

export function ComponentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  
  const { data: component, isLoading: loadingComponent } = useComponent(id || '', isEdit);
  const createMutation = useCreateComponent();
  const updateMutation = useUpdateComponent();

  const watchedType = useForm<ComponentFormData>({ resolver: zodResolver(componentSchema) }).watch('type');
  const [specInputs, setSpecInputs] = useState<Record<string, string>>({});

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ComponentFormData>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      type: 'cpu',
      serialNumber: '',
      manufacturer: '',
      model: '',
      status: 'available',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      specifications: {},
    },
  });

  const type = watch('type');

  useEffect(() => {
    if (isEdit && component) {
      setValue('name', component.name);
      setValue('type', component.type);
      setValue('serialNumber', component.serialNumber);
      setValue('manufacturer', component.manufacturer);
      setValue('model', component.model);
      setValue('status', component.status);
      setValue('computerId', component.computerId || '');
      setValue('purchaseDate', component.purchaseDate.split('T')[0]);
      setValue('purchasePrice', component.purchasePrice);
      setValue('warrantyExpiry', component.warrantyExpiry?.split('T')[0] || '');
      setSpecInputs(component.specifications || {});
    }
  }, [isEdit, component, setValue]);

  useEffect(() => {
    const fields = specFields[type] || [];
    const newSpecs: Record<string, string> = {};
    fields.forEach((field) => {
      newSpecs[field] = specInputs[field] || '';
    });
    setSpecInputs(newSpecs);
    setValue('specifications', newSpecs);
  }, [type, setValue, specInputs]);

  const handleSpecChange = (field: string, value: string) => {
    const newSpecs = { ...specInputs, [field]: value };
    setSpecInputs(newSpecs);
    setValue('specifications', newSpecs);
  };

  const onSubmit = async (data: ComponentFormData) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: id!, data });
        toast.success('Component updated successfully');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Component created successfully');
      }
      navigate('/components');
    } catch (error) {
      toast.error('Failed to save component');
    }
  };

  const isLoading = loadingComponent || isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/components" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Component' : 'Add Component'}</h1>
          <p className="text-muted-foreground">{isEdit ? 'Update component details' : 'Add a new component to inventory'}</p>
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
                placeholder="e.g., Intel Core i7-11700"
                error={errors.name?.message}
                {...register('name')}
              />
              <Select
                label="Type"
                error={errors.type?.message}
                options={typeOptions}
                {...register('type')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Serial Number"
                placeholder="e.g., SN123456789"
                error={errors.serialNumber?.message}
                {...register('serialNumber')}
              />
              <Input
                label="Manufacturer"
                placeholder="e.g., Intel"
                error={errors.manufacturer?.message}
                {...register('manufacturer')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Model"
                placeholder="e.g., Core i7-11700"
                error={errors.model?.message}
                {...register('model')}
              />
              <Select
                label="Status"
                error={errors.status?.message}
                options={statusOptions}
                {...register('status')}
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
            <Input
              label="Warranty Expiry (Optional)"
              type="date"
              {...register('warrantyExpiry')}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {specFields[type] && specFields[type].length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {specFields[type].map((field) => (
                  <Input
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    placeholder={`Enter ${field}`}
                    value={specInputs[field] || ''}
                    onChange={(e) => handleSpecChange(field, e.target.value)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No specific fields for this component type. Add custom specifications below.</p>
            )}
            <Textarea
              label="Additional Specifications (JSON)"
              placeholder='{"customField": "value"}'
              value={JSON.stringify(specInputs, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setSpecInputs(parsed);
                  setValue('specifications', parsed);
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              rows={4}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        <CardFooter className="flex justify-end gap-3">
          <Link to="/components">
            <Button type="button" variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Update' : 'Create'} Component
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}

import { useState } from 'react';