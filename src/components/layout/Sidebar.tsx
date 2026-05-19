/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Building2, 
  Receipt, 
  BookOpen, 
  Users, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChartBar,
  ShieldCheck,
  ListTree,
  X
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../hooks/useCompany';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Vouchers', path: '/vouchers', icon: Receipt },
  { name: 'Chart of Accounts', path: '/coa', icon: ListTree },
  { name: 'Ledger', path: '/ledger', icon: BookOpen },
  { name: 'Reports', path: '/reports', icon: ChartBar },
  { name: 'Companies', path: '/companies', icon: Building2 },
  { name: 'User Access', path: '/users', icon: ShieldCheck, role: 'SUPER_ADMIN' },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile, isSuperAdmin } = useAuth();
  const { selectedCompany, companies } = useCompany();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.role) return true;
    if (item.role === 'SUPER_ADMIN') return isSuperAdmin;
    if (!profile) return false;
    const roles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    return roles.indexOf(profile.role) >= roles.indexOf(item.role);
  });

  return (
    <aside 
      className={cn(
        "flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-800 transition-all duration-200 relative h-screen no-print",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate tracking-tight uppercase">
                Audit Pro
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">Enterprise Edition</span>
            </div>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="lg:hidden p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="px-3 py-6 flex flex-col gap-1 overflow-y-auto flex-1 scrollbar-hide">
        {!collapsed && companies.length > 0 && (
          <div className="mb-6 px-2">
            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block pl-1">
              Active Entity
            </label>
            <button 
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-lg px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
              onClick={() => {
                navigate('/companies');
                handleNavClick();
              }}
            >
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase truncate">
                  {selectedCompany?.name || 'Select Company'}
                </span>
              </div>
              <Building2 size={14} className="text-slate-400 dark:text-slate-500 ml-2" />
            </button>
          </div>
        )}

        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={({ isActive }) => cn(
              "flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-all duration-200 group text-sm font-medium",
              isActive 
                ? "bg-indigo-600 text-white font-bold" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <item.icon size={20} className={cn(
              "shrink-0",
              collapsed && "mx-auto"
            )} />
            {!collapsed && <span>{item.name}</span>}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
        {!collapsed && profile && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate uppercase">
                {profile.name}
              </span>
              <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">
                {profile.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-lg transition-all text-xs font-bold uppercase tracking-widest"
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 z-20 transition-all"
      >
        {collapsed ? (
          <ChevronRight size={14} className="text-slate-400" />
        ) : (
          <ChevronLeft size={14} className="text-slate-400" />
        )}
      </button>
    </aside>
  );
}

