/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && profile) {
    // Simple hierarchy: SUPER_ADMIN > ADMIN > MODERATOR
    const roles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    const requiredIdx = roles.indexOf(requiredRole);
    const userIdx = roles.indexOf(profile.role);

    if (userIdx < requiredIdx) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
