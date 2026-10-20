import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { cn } from '@/utils/helpers'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

export function Header() {
  const { user, clearAuth } = useAuthStore()
  const { unreadCount, markAllAsRead } = useNotificationStore()

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200" data-testid="header">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
            SewaKomputer
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <Menu as="div" className="relative">
                      <Menu.Button className="relative btn-ghost btn-sm p-2" data-testid="notification-bell">
                        <BellIcon className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white py-2 shadow-lg ring-1 ring-gray-900/10 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Notifikasi</h3>
                    {unreadCount > 0 && (
                                          <button
                                            type="button"
                                            onClick={markAllAsRead}
                                            className="text-xs text-primary-600 hover:text-primary-700"
                                            data-testid="mark-all-read"
                                          >
                                            Tandai semua dibaca
                                          </button>
                                        )}
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <p className="px-4 py-6 text-center text-sm text-gray-500">
                    Belum ada notifikasi
                  </p>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 btn-ghost btn-sm px-3 py-1.5" data-testid="user-menu">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-700">{user?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role || 'admin'}</p>
              </div>
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white py-2 shadow-lg ring-1 ring-gray-900/10 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={cn(
                        'flex w-full items-center gap-2 px-4 py-2 text-sm',
                        active ? 'bg-gray-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
                      )}
                      onClick={() => window.location.href = '/settings'}
                    >
                      <Cog6ToothIcon className="h-5 w-5" />
                      Pengaturan
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      className={cn(
                                        'flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600',
                                        active ? 'bg-gray-50' : 'hover:bg-gray-50'
                                      )}
                                      onClick={handleLogout}
                                      data-testid="logout-button"
                                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      Keluar
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  )
}