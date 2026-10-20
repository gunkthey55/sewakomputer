import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useComputers, useComponents, useCreateRental, useUpdateRental, useRental } from '@/api/hooks'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/helpers'
import { formatCurrency, formatDate } from '@/utils/helpers'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  ComputerDesktopIcon,
  CubeIcon,
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

const componentItemSchema = z.object({
  component_id: z.string().min(1, 'Pilih komponen'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
  price_per_day: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
})

const rentalSchema = z.object({
  customer_name: z.string().min(2, 'Nama minimal 2 karakter'),
  customer_email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  customer_phone: z.string().optional(),
  computer_id: z.string().min(1, 'Pilih komputer'),
  start_date: z.string().min(1, 'Pilih tanggal mulai'),
  end_date: z.string().min(1, 'Pilih tanggal selesai'),
  notes: z.string().optional(),
  components: z.array(componentItemSchema).optional(),
})

type RentalFormData = z.infer<typeof rentalSchema>

const steps = [
  { id: 'customer', title: 'Pelanggan', icon: UserIcon },
  { id: 'computer', title: 'Komputer', icon: ComputerDesktopIcon },
  { id: 'components', title: 'Komponen', icon: CubeIcon },
  { id: 'duration', title: 'Durasi', icon: CalendarDaysIcon },
  { id: 'summary', title: 'Ringkasan', icon: CurrencyDollarIcon },
]

export function RentalForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const rentalId = id ? parseInt(id) : null

  const [currentStep, setCurrentStep] = useState(0)
  const { data: computers } = useComputers('available')
  const { data: components } = useComponents()
  const createMutation = useCreateRental()
  const updateMutation = useUpdateRental()

  const isSubmitting = isEdit ? updateMutation.isPending : createMutation.isPending

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema) as any,
    defaultValues: {
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      computer_id: '',
      start_date: '',
      end_date: '',
      notes: '',
      components: [],
    },
    mode: 'onChange',
  })

  const { fields: componentFields, append, remove } = useFieldArray({
    control,
    name: 'components',
  })

  const watchedValues = watch()
  const selectedComputer = computers?.find(c => String(c.id) === watchedValues.computer_id)
  const totalComponentPrice = watchedValues.components?.reduce(
    (sum, c) => sum + (c.price_per_day || 0) * (c.quantity || 1), 0
  ) || 0
  const computerPricePerDay = selectedComputer ? 100000 : 0 // placeholder
  const days = watchedValues.start_date && watchedValues.end_date
    ? Math.max(1, Math.ceil((new Date(watchedValues.end_date).getTime() - new Date(watchedValues.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 1
  const estimatedTotal = (computerPricePerDay + totalComponentPrice) * days

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const onSubmit = async (data: RentalFormData) => {
    const submitData = {
      ...data,
      computer_id: parseInt(data.computer_id),
      components: data.components?.map(c => ({
        component_id: parseInt(c.component_id),
        quantity: c.quantity,
        price_per_day: c.price_per_day,
      })) || [],
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: rentalId!, data: submitData })
        toast.success('Sewa berhasil diperbarui')
      } else {
        await createMutation.mutateAsync(submitData)
        toast.success('Sewa berhasil dibuat')
      }
      navigate('/rentals')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan sewa')
    }
  }

  const renderStep = () => {
    switch (steps[currentStep].id) {
      case 'customer':
        return (
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Data Pelanggan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                {...register('customer_name')}
                label="Nama Lengkap *"
                placeholder="Nama pelanggan"
                error={errors.customer_name?.message}
              />
              <Input
                {...register('customer_email')}
                type="email"
                label="Email"
                placeholder="email@contoh.com"
                error={errors.customer_email?.message}
              />
              <Input
                {...register('customer_phone')}
                label="Nomor Telepon"
                placeholder="08xxxxxxxxxx"
                error={errors.customer_phone?.message}
              />
              <div>
                <label className="label">Catatan</label>
                <textarea
                  {...register('notes')}
                  rows={3}
                  className="input"
                  placeholder="Catatan tambahan..."
                />
              </div>
            </CardContent>
          </Card>
        )
      case 'computer':
        return (
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Pilih Komputer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                options={[
                  { value: '', label: 'Pilih komputer' },
                  ...(computers?.map((c: { id: number; name: string; status: string }) => ({ value: String(c.id), label: `${c.name} (${c.status === 'available' ? 'Tersedia' : c.status})` })) || []),
                ]}
                {...register('computer_id')}
                error={errors.computer_id?.message}
                placeholder="Pilih komputer"
              />
              {selectedComputer && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedComputer.name}</p>
                  <p className="text-sm text-gray-500 mt-1">Spec: {JSON.stringify(selectedComputer.spec_json)}</p>
                  <p className="text-sm text-gray-500">Status: <Badge variant={selectedComputer.status as any}>{selectedComputer.status}</Badge></p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 'components':
        return (
          <Card padding="lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Komponen Tambahan</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => append({ component_id: '', quantity: 1, price_per_day: 0 })}>
                <PlusIcon className="h-4 w-4" />
                Tambah Komponen
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {componentFields.length === 0 && (
                <p className="text-center text-gray-500 py-8">Belum ada komponen ditambahkan</p>
              )}
              {componentFields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-4 border border-gray-200 rounded-lg">
                  <Select
                    options={[
                      { value: '', label: 'Pilih komponen' },
                      ...(components?.map((c: { id: number; name: string; quantity_available: number; price_per_day: number }) => ({ value: String(c.id), label: `${c.name} (Stok: ${c.quantity_available}) - ${formatCurrency(c.price_per_day)}/hari` })) || []),
                    ]}
                    {...register(`components.${index}.component_id`)}
                    error={errors.components?.[index]?.component_id?.message}
                    className="flex-1"
                  />
                  <Input
                    {...register(`components.${index}.quantity`, { valueAsNumber: true })}
                    type="number"
                    label="Qty"
                    placeholder="1"
                    className="w-24"
                    error={errors.components?.[index]?.quantity?.message}
                  />
                  <Input
                    {...register(`components.${index}.price_per_day`, { valueAsNumber: true })}
                    type="number"
                    label="Harga/Hari"
                    placeholder="0"
                    className="w-36"
                    error={errors.components?.[index]?.price_per_day?.message}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="mt-8"
                  >
                    <TrashIcon className="h-5 w-5 text-red-600" />
                  </Button>
                </div>
              ))}
              {componentFields.length > 0 && (
                <div className="text-right text-lg font-semibold text-gray-900">
                  Subtotal Komponen: {formatCurrency(totalComponentPrice * days)}/hari
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 'duration':
        return (
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Durasi Sewa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  {...register('start_date')}
                  type="date"
                  label="Tanggal Mulai *"
                  error={errors.start_date?.message}
                />
                <Input
                  {...register('end_date')}
                  type="date"
                  label="Tanggal Selesai *"
                  error={errors.end_date?.message}
                />
              </div>
              {watchedValues.start_date && watchedValues.end_date && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="font-medium">Durasi: {days} hari</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(watchedValues.start_date)} - {formatDate(watchedValues.end_date)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      case 'summary':
        return (
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Pelanggan</span><span className="font-medium">{watchedValues.customer_name || '-'}</span></div>
                <div className="flex justify-between"><span>Komputer</span><span className="font-medium">{selectedComputer?.name || '-'}</span></div>
                <div className="flex justify-between"><span>Durasi</span><span className="font-medium">{days} hari</span></div>
                <div className="flex justify-between"><span>Tanggal</span><span className="font-medium">{formatDate(watchedValues.start_date)} - {formatDate(watchedValues.end_date)}</span></div>
                <div className="border-t pt-2 flex justify-between"><span>Estimasi Total</span><span className="font-bold text-lg">{formatCurrency(estimatedTotal)}</span></div>
              </div>
              {watchedValues.components?.length && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Komponen:</h4>
                  <ul className="space-y-1 text-sm">
                    {watchedValues.components?.map((c: { component_id: string; quantity: number; price_per_day: number }, i: number) => {
                      const comp = components?.find(comp => String(comp.id) === c.component_id)
                      return (
                        <li key={i} className="flex justify-between">
                          <span>{comp?.name || 'Komponen'} x{c.quantity}</span>
                          <span>{formatCurrency(c.price_per_day * c.quantity)}/hari</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Sewa' : 'Sewa Baru'}</h1>
          <p className="text-gray-500">Lengkapi data sewa melalui langkah-langkah berikut</p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                index < currentStep
                  ? 'bg-green-500 text-white'
                  : index === currentStep
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              )}
            >
              {index < currentStep ? (
                <CheckCircleIcon className="h-5 w-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2',
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            Langkah {currentStep + 1} dari {steps.length}: {steps[currentStep].title}
          </span>
        </div>

        {renderStep()}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={prevStep} disabled={currentStep === 0}>
            <ChevronLeftIcon className="h-4 w-4" />
            Kembali
          </Button>
          {currentStep === steps.length - 1 ? (
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? 'Perbarui' : 'Buat Sewa'}
            </Button>
          ) : (
            <Button type="button" onClick={nextStep}>
              Lanjut
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}