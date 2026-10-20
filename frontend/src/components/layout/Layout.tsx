import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/helpers';
import { useUIStore } from '../../store/uiStore';

export function Layout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="page-container">
      <Sidebar />
      <main className={cn('main-content', sidebarCollapsed && 'lg:ml-16')}>
        <Header />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}