import { Fragment } from 'react'
import { Transition } from '@headlessui/react'
import { cn } from '@/utils/helpers'
import { useUIStore } from '@/stores/uiStore'

interface SidebarProps {
  children: React.ReactNode
  className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
  const { sidebarOpen, toggleSidebar, mobileMenuOpen, setMobileMenuOpen } = useUIStore()

  return (
    <Fragment>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 btn-secondary btn-sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="Toggle menu"
        aria-expanded={mobileMenuOpen}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {mobileMenuOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      <Transition.Root show={mobileMenuOpen} as={Fragment}>
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-300 ease-out"
          enterFrom="translate-x-[-100%]"
          enterTo="translate-x-0"
          leave="transition-transform duration-200 ease-in"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-[-100%]"
        >
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 lg:relative lg:translate-x-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
              className
            )}
            aria-label="Sidebar navigation"
          >
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center justify-between px-6 border-b border-gray-100">
                <h1 className="text-xl font-bold text-primary-600">SewaKomputer</h1>
                <button
                  type="button"
                  className="lg:hidden btn-ghost btn-sm"
                  onClick={toggleSidebar}
                  aria-label="Close sidebar"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1" aria-label="Main navigation">
                {children}
              </nav>
              <div className="p-4 border-t border-gray-100">
                <button
                  type="button"
                  className={cn('btn-secondary w-full justify-start', !sidebarOpen && 'lg:hidden')}
                  onClick={toggleSidebar}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {sidebarOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    )}
                  </svg>
                  <span className="ml-2">{sidebarOpen ? 'Collapse' : 'Expand'}</span>
                </button>
              </div>
            </div>
          </aside>
        </Transition.Child>
      </Transition.Root>
    </Fragment>
  )
}