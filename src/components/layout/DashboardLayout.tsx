/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Menu, BookOpen } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[40] lg:hidden no-print"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-[50] lg:relative lg:block transition-transform duration-300 transform no-print",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 max-h-screen">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white dark:bg-slate-900 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 no-print">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight uppercase">Audit Pro</span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        <main className="flex-1 overflow-y-auto w-full">
          <div className="px-4 py-4 md:px-8 md:py-6 w-full max-w-[1600px] mx-auto pb-32 lg:pb-6">
            <Outlet />
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
