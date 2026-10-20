import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/utils/helpers'
import { UserIcon, LockClosedIcon, BellIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
})

const passwordSchema = z.object({
  current_password: z.string().min(6, 'Password saat ini minimal 6 karakter'),
  new_password: z.string().min(6, 'Password baru minimal 6 karakter'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirm_password'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

const tabs = [
  { id: 'profile', label: 'Profil', icon: UserIcon },
  { id: 'password', label: 'Keamanan', icon: LockClosedIcon },
  { id: 'notifications', label: 'Notifikasi', icon: BellIcon },
  { id: 'preferences', label: 'Preferensi', icon: Cog6ToothIcon },
]

export function Settings() {
  const { user, setAuth } = useAuthStore()
  const [activeTab, setActiveTab] = useState('profile')

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema) as any,
  })

  const handleProfileSubmit = async (data: ProfileForm) => {
    try {
      // In a real app, this would call an API
      setAuth({ ...user!, ...data }, '', '')
      toast.success('Profil berhasil diperbarui')
    } catch (error) {
      toast.error('Gagal memperbarui profil')
    }
  }

  const handlePasswordSubmit = async (data: PasswordForm) => {
    try {
      // In a real app, this would call an API
      toast.success('Password berhasil diubah')
      passwordForm.reset()
    } catch (error) {
      toast.error('Gagal mengubah password')
    }
  }

  const handleProfileSubmitHandler = profileForm.handleSubmit(handleProfileSubmit)
  const handlePasswordSubmitHandler = passwordForm.handleSubmit(handlePasswordSubmit)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="text-gray-500">Kelola profil dan preferensi akun Anda</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto" aria-label="Settings tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              <tab.icon className="h-5 w-5" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmitHandler} className="space-y-4">
              <Input
                {...profileForm.register('full_name')}
                label="Nama Lengkap"
                error={profileForm.formState.errors.full_name?.message}
              />
              <Input
                {...profileForm.register('email')}
                type="email"
                label="Email"
                error={profileForm.formState.errors.email?.message}
              />
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Role: <Badge variant="default">{user?.role || 'admin'}</Badge>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Terdaftar sejak: {user?.created_at ? new Date(user.created_at).toLocaleDateString('id-ID') : '-'}
                </p>
              </div>
              <Button type="submit">Simpan Perubahan</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'password' && (
        <Card>
          <CardHeader>
            <CardTitle>Ubah Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmitHandler} className="space-y-4">
              <Input
                {...passwordForm.register('current_password')}
                type="password"
                label="Password Saat Ini"
                error={passwordForm.formState.errors.current_password?.message}
              />
              <Input
                {...passwordForm.register('new_password')}
                type="password"
                label="Password Baru"
                error={passwordForm.formState.errors.new_password?.message}
              />
              <Input
                {...passwordForm.register('confirm_password')}
                type="password"
                label="Konfirmasi Password Baru"
                error={passwordForm.formState.errors.confirm_password?.message}
              />
              <Button type="submit">Ubah Password</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferensi Notifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Notifikasi In-App</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reminder Sewa</p>
                  <p className="text-sm text-gray-500">Dapatkan notifikasi saat sewa akan berakhir</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-gray-300 text-primary-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Sewa Terlambat</p>
                  <p className="text-sm text-gray-500">Notifikasi saat sewa melewati tanggal kembali</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-gray-300 text-primary-600" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Status Berubah</p>
                  <p className="text-sm text-gray-500">Notifikasi saat status sewa berubah</p>
                </div>
                <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-gray-300 text-primary-600" />
              </div>
            </div>
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium text-gray-900">Notifikasi Telegram</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Aktifkan Telegram Bot</p>
                  <p className="text-sm text-gray-500">Terima reminder via Telegram</p>
                </div>
                <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-primary-600" />
              </div>
              <p className="text-sm text-gray-500">
                Konfigurasi bot Telegram dapat dilakukan di panel admin backend.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'preferences' && (
        <Card>
          <CardHeader>
            <CardTitle>Preferensi Aplikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Tampilan</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Tema Gelap</p>
                  <p className="text-sm text-gray-500">Gunakan mode gelap untuk tampilan</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={false}
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors"
                >
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bahasa</p>
                  <p className="text-sm text-gray-500">Pilih bahasa aplikasi</p>
                </div>
                <select className="input w-auto">
                  <option value="id">Indonesia</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium text-gray-900">Format Tanggal & Waktu</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Format Tanggal</p>
                  <p className="text-sm text-gray-500">Pilih format tampilan tanggal</p>
                </div>
                <select className="input w-auto">
                  <option value="DD MMM YYYY">20 Oct 2026</option>
                  <option value="DD/MM/YYYY">20/10/2026</option>
                  <option value="YYYY-MM-DD">2026-10-20</option>
                </select>
              </div>
            </div>
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium text-gray-900">Zona Waktu</h4>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Zona Waktu</p>
                  <p className="text-sm text-gray-500">Pilih zona waktu untuk reminder</p>
                </div>
                <select className="input w-auto">
                  <option value="Asia/Jakarta">WIB (UTC+7)</option>
                  <option value="Asia/Makassar">WITA (UTC+8)</option>
                  <option value="Asia/Jayapura">WIT (UTC+9)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}