import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useComputers, useCreateRental, useUpdateRental, useRental } from '@/api/hooks'
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
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

const rentalItemSchema = z.object({
  computer_id: z.string().min(1, 'Pilih komputer'),
  quantity: z.coerce.number().min(1, 'Minimal 1'),
  unit_price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
})

const rentalSchema = z.object({
  user_id: z.string().min(1, 'Pilih pelanggan'),
  start_date: z.string().min(1, 'Pilih tanggal mulai'),
  end_date: z.string().min(1, 'Pilih tanggal selesai'),
  deposit: z.coerce.number().min(0, 'Deposit tidak boleh negatif').optional(),
  notes: z.string().optional(),
  items: z.array(rentalItemSchema).min(1, 'Minimal 1 item sewa'),
})

type RentalFormData = z.infer<typeof rentalSchema>

const steps = [
  { id: 'customer', title: 'Pelanggan', icon: UserIcon },
  { id: 'items', title: 'Item Sewa', icon: ComputerDesktopIcon },
  { id: 'duration', title: 'Durasi', icon: CalendarDaysIcon },
  { id: 'summary', title: 'Ringkasan', icon: CurrencyDollarIcon },
]

export function RentalForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const rentalId = id ? parseInt(id) : null

  const [currentStep, setCurrentStep] = useState(0)
  const { data: computers } = useComputers({ is_available: true, page_size: 100 })
  const createMutation = useCreateRental()
  const updateMutation = useUpdateRental()
  const { data: rentalData } = useRental(rentalId || 0)

  const isSubmitting = isEdit ? updateMutation.isPending : createMutation.isPending

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RentalFormData>({
    resolver: zodResolver(rentalSchema) as any,
    defaultValues: {
      user_id: '',
      start_date: '',
      end_date: '',
      deposit: 0,
      notes: '',
      items: [{ computer_id: '', quantity: 1, unit_price: 0 }],
    },
    mode: 'onChange',
  })

  const { fields: itemFields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedValues = watch()

  // Calculate total price
  const calculateTotal = () => {
    const items = watchedValues.items || []
    const startDate = watchedValues.start_date
    const endDate = watchedValues.end_date
    let total = 0

    if (startDate && endDate) {
      const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
      items.forEach((item: any) => {
        const price = item.unit_price || 0
        const qty = item.quantity || 1
        total += price * qty * days
      })
    }
    return total
  }

  const estimatedTotal = calculateTotal()

  // Set unit_price when computer is selected
  const handleComputerChange = (index: number, computerId: string) => {
    const computer = computers?.items?.find((c: any) => String(c.id) === computerId)
    if (computer) {
      setValue(`items.${index}.unit_price`, computer.rental_price_per_day, { shouldValidate: true })
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const onSubmit = async (data: RentalFormData) => {
    const submitData = {
      user_id: parseInt(data.user_id),
      start_date: data.start_date,
      end_date: data.end_date,
      deposit: data.deposit || 0,
      notes: data.notes,
      items: data.items.map(item => ({
        computer_id: parseInt(item.computer_id),
        quantity: item.quantity,
        unit_price: item.unit_price,
      })),
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
              <Select
                options={[
                  { value: '', label: 'Pilih pelanggan' },
                  { value: '1', label: 'Admin User (admin@example.com)' },
                  { value: '2', label: 'Staff User (staff@example.com)' },
                  { value: '3', label: 'Customer User (customer@example.com)' },
                ]}
                {...register('user_id')}
                error={errors.user_id?.message}
                placeholder="Pilih pelanggan"
              />
              <Input
                {...register('notes')}
                label="Catatan"
                placeholder="Catatan tambahan..."
              />
              <Input
                {...register('deposit', { valueAsNumber: true })}
                type="number"
                label="Deposit (Opsional)"
                placeholder="0"
              />
            </CardContent>
          </Card>
        )
      case 'items':
        return (
          <Card padding="lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Item Sewa</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => append({ computer_id: '', quantity: 1, unit_price: 0 })}>
                <PlusIcon className="h-4 w-4" />
                Tambah Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itemFields.length === 0 && (
                <p className="text-center text-gray-500 py-8">Belum ada item ditambahkan</p>
              )}
              {itemFields.map((field, index) => (
                <div key={field.id} className="flex flex-col sm:flex-row gap-3 p-4 border border-gray-200 rounded-lg">
                  <Select
                    options={[
                      { value: '', label: 'Pilih komputer' },
                      ...(computers?.items?.map((c: any) => ({
                        value: String(c.id),
                        label: `${c.name} (${c.brand} ${c.model}) - ${formatCurrency(c.rental_price_per_day)}/hari`
                      })) || []),
                    ]}
                    {...register(`items.${index}.computer_id`)}
                    error={errors.items?.[index]?.computer_id?.message}
                    className="flex-1"
                    onChange={(e) => handleComputerChange(index, e.target.value)}
                  />
                  <Input
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    type="number"
                    label="Qty"
                    placeholder="1"
                    className="w-24"
                    error={errors.items?.[index]?.quantity?.message}
                  />
                  <Input
                    {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                    type="number"
                    label="Harga/Hari"
                    placeholder="0"
                    className="w-36"
                    error={errors.items?.[index]?.unit_price?.message}
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
              {itemFields.length > 0 && (
                <div className="text-right text-lg font-semibold text-gray-900">
                  Estimasi Total: {formatCurrency(estimatedTotal)}
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
                  <p className="font-medium">
                    Durasi: {Math.max(1, Math.ceil((new Date(watchedValues.end_date).getTime() - new Date(watchedValues.start_date).getTime()) / (1000 * 60 * 60 * 24)))} hari
                  </p>
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
                <div className="flex justify-between"><span>Pelanggan ID</span><span className="font-medium">{watchedValues.user_id || '-'}</span></div>
                <div className="flex justify-between"><span>Durasi</span><span className="font-medium">{watchedValues.start_date && watchedValues.end_date ? Math.max(1, Math.ceil((new Date(watchedValues.end_date).getTime() - new Date(watchedValues.start_date).getTime()) / (1000 * 60 * 60 * 24))) : 0} hari</span></div>
                <div className="flex justify-between"><span>Tanggal</span><span className="font-medium">{formatDate(watchedValues.start_date)} - {formatDate(watchedValues.end_date)}</span></div>
                <div className="border-t pt-2 flex justify-between"><span>Estimasi Total</span><span className="font-bold text-lg">{formatCurrency(estimatedTotal)}</span></div>
              </div>
              {watchedValues.items?.length && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Item Sewa:</h4>
                  <ul className="space-y-1 text-sm">
                    {watchedValues.items.map((item: any, i: number) => {
                      const computer = computers?.items?.find((c: any) => String(c.id) === item.computer_id)
                      return (
                        <li key={i} className="flex justify-between">
                          <span>{computer?.name || 'Komputer'} x{item.quantity}</span>
                          <span>{formatCurrency(item.unit_price * item.quantity)}/hari</span>
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