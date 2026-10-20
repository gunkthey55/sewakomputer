import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/utils/helpers'
import { useUIStore } from '@/stores/uiStore'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import {
  HomeIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Daftar Sewa', href: '/rentals', icon: DocumentTextIcon },
  { name: 'Kalender', href: '/calendar', icon: CalendarDaysIcon },
  { name: 'Notifikasi', href: '/notifications', icon: BellIcon },
  { name: 'Pengaturan', href: '/settings', icon: Cog6ToothIcon },
]

export function Layout() {
  const { sidebarOpen } = useUIStore()

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar>
        <ul className="space-y-1" role="list" aria-label="Main navigation">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }: { isActive: boolean }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    !sidebarOpen && 'justify-center px-2'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span className={cn(sidebarOpen ? 'flex-1' : 'sr-only')}>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </Sidebar>

      <div className={cn('lg:pl-64 transition-all duration-300', sidebarOpen ? 'lg:pl-64' : 'lg:pl-20')}>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}