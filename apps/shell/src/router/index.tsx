import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { DashboardLayout } from './layouts/DashboardLayout';

// Lazy-loaded remote microfrontends
const RemoteLogin    = React.lazy(() => import('mfAuth/Login'));
const RemoteCalendar = React.lazy(() => import('mfScheduling/Calendar'));
const RemotePatients = React.lazy(() => import('mfClinical/Patients'));
const RemoteInvoices = React.lazy(() => import('mfPayments/Invoices'));
const RemoteDashboard = React.lazy(() => import('mfReports/Dashboard'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function RemoteFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<RemoteFallback />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<RemoteLogin />} />

        {/* Protected dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/reports" replace />} />
          <Route path="reports/*" element={<RemoteDashboard />} />
          <Route path="appointments/*" element={<RemoteCalendar />} />
          <Route path="patients/*" element={<RemotePatients />} />
          <Route path="invoices/*" element={<RemoteInvoices />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
