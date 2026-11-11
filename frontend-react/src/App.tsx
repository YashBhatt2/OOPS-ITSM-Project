import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { ToastProvider } from '@/components/ui/Toast/Toast';

// Auth
import { SignInPage } from '@/features/auth/SignInPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { LandingPage } from '@/features/landing/LandingPage';

// Employee
import { EmployeeHomePage } from '@/features/employee/EmployeeHomePage';
import { ReportIncidentPage } from '@/features/employee/ReportIncidentPage';
import { IncidentDetailPage } from '@/features/employee/IncidentDetailPage';

// Technician
import { TechnicianQueuePage } from '@/features/technician/TechnicianQueuePage';
import { TechnicianIncidentDetailPage } from '@/features/technician/TechnicianIncidentDetailPage';

// Admin
import { AdminOverviewPage } from '@/features/admin/AdminOverviewPage';
import { AdminIncidentDetailPage } from '@/features/admin/AdminIncidentDetailPage';
import { VerificationQueuePage } from '@/features/admin/VerificationQueuePage';
import { ReportsPage } from '@/features/admin/ReportsPage';
import { SkillsSetupPage } from '@/features/admin/setup/SkillsSetupPage';
import { CategoriesSetupPage } from '@/features/admin/setup/CategoriesSetupPage';
import { ServicesSetupPage } from '@/features/admin/setup/ServicesSetupPage';
import { TechniciansSetupPage } from '@/features/admin/setup/TechniciansSetupPage';
import { UsersSetupPage } from '@/features/admin/setup/UsersSetupPage';

// Shared
import { AllIncidentsPage } from '@/features/incidents/AllIncidentsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

import { PageTransition } from '@/components/PageTransition';

const LoadingScreen: React.FC = () => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      backgroundColor: 'var(--bg)',
      color: 'var(--text-2)',
      gap: 'var(--space-3)',
    }}
  >
    <div
      style={{
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        border: '2px solid var(--line-2)',
        borderTopColor: 'var(--text-1)',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <span style={{ fontSize: 'var(--fs-body-s)' }}>Loading Service Desk…</span>
  </div>
);

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Array<'EMPLOYEE' | 'TECHNICIAN' | 'ADMIN'>;
}> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'TECHNICIAN') return <Navigate to="/technician" replace />;
    return <Navigate to="/employee" replace />;
  }

  return <PageTransition>{children}</PageTransition>;
};

const RoleIncidentRedirect: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  if (user?.role === 'ADMIN') return <Navigate to={`/admin/incidents/${id}`} replace />;
  if (user?.role === 'TECHNICIAN') return <Navigate to={`/technician/incidents/${id}`} replace />;
  return <Navigate to={`/employee/incidents/${id}`} replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/"
                element={
                  <PageTransition>
                    <LandingPage />
                  </PageTransition>
                }
              />
              <Route path="/login" element={<Navigate to="/signin" replace />} />
              <Route
                path="/signin"
                element={
                  <PageTransition>
                    <SignInPage />
                  </PageTransition>
                }
              />
              <Route
                path="/register"
                element={
                  <PageTransition>
                    <RegisterPage />
                  </PageTransition>
                }
              />

              {/* Employee Routes */}
              <Route
                path="/employee"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                    <EmployeeHomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/report"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                    <ReportIncidentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/employee/incidents/:id"
                element={
                  <ProtectedRoute allowedRoles={['EMPLOYEE', 'ADMIN']}>
                    <IncidentDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Technician Routes */}
              <Route
                path="/technician"
                element={
                  <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                    <TechnicianQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technician/incidents"
                element={
                  <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                    <AllIncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/technician/incidents/:id"
                element={
                  <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                    <TechnicianIncidentDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/incidents"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AllIncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/incidents/:id"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminIncidentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/verification"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <VerificationQueuePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/setup"
                element={<Navigate to="/admin/setup/skills" replace />}
              />
              <Route
                path="/admin/setup/skills"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <SkillsSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/setup/categories"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <CategoriesSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/setup/services"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <ServicesSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/setup/technicians"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <TechniciansSetupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/setup/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <UsersSetupPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Cross-Cutting Routes */}
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <AllIncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/:id"
                element={
                  <ProtectedRoute>
                    <RoleIncidentRedirect />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <NotificationsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
