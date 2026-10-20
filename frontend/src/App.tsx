import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout, AuthLayout } from './components/layout';
import { 
  LoginPage, 
  DashboardPage, 
  ComputersPage, 
  ComputerFormPage, 
  ComputerDetailPage,
  ComponentsPage,
  ComponentFormPage,
  ComponentDetailPage,
  RentalsPage,
  RentalFormPage,
  RentalDetailPage,
  CalendarPage,
  NotificationsPage,
  SettingsPage,
} from './pages';
import { useAuthStore } from './store/authStore';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><AuthLayout><LoginPage /></AuthLayout></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><AuthLayout><div>Register Page</div></AuthLayout></PublicRoute>} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/computers" element={<ComputersPage />} />
        <Route path="/computers/create" element={<ComputerFormPage />} />
        <Route path="/computers/:id/edit" element={<ComputerFormPage />} />
        <Route path="/computers/:id" element={<ComputerDetailPage />} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/components/create" element={<ComponentFormPage />} />
        <Route path="/components/:id/edit" element={<ComponentFormPage />} />
        <Route path="/components/:id" element={<ComponentDetailPage />} />
        <Route path="/rentals" element={<RentalsPage />} />
        <Route path="/rentals/create" element={<RentalFormPage />} />
        <Route path="/rentals/:id/edit" element={<RentalFormPage />} />
        <Route path="/rentals/:id" element={<RentalDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}