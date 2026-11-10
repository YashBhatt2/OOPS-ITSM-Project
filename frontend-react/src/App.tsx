import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast/Toast';
import { SignInPage } from '@/features/auth/SignInPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { EmployeeHomePage } from '@/features/employee/EmployeeHomePage';
import { TechnicianQueuePage } from '@/features/technician/TechnicianQueuePage';
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          backgroundColor: 'var(--bg)',
        }}
      >
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TECHNICIAN') return <Navigate to="/technician" replace />;
    return <Navigate to="/employee" replace />;
  }

  return <>{children}</>;
};

const RootRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'TECHNICIAN') return <Navigate to="/technician" replace />;
  return <Navigate to="/employee" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<SignInPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Protected Role-Based Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                    <EmployeeHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technician"
                element={
                  <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                    <TechnicianQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminOverviewPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Protected Stubs */}
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <RootRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <RootRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Catch-All */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

