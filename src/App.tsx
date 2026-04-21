/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { CompanyProvider } from './hooks/useCompany';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vouchers from './pages/Vouchers';
import Ledger from './pages/Ledger';
import Reports from './pages/Reports';
import Companies from './pages/Companies';
import UserManagement from './pages/Users';
import Settings from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <CompanyProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<DashboardLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="vouchers" element={<Vouchers />} />
              <Route path="ledger" element={<Ledger />} />
              <Route path="reports" element={<Reports />} />
              <Route path="companies" element={<Companies />} />
              <Route 
                path="users" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CompanyProvider>
    </AuthProvider>
  );
}
