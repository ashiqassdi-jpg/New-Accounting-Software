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
  ListTree
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile, isSuperAdmin } = useAuth();
  const { selectedCompany, companies, setSelectedCompany } = useCompany();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
        "flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-300 relative h-screen shadow-[1px_0_0_0_rgba(0,0,0,0.02)] dark:shadow-none no-print",
        collapsed ? "w-20" : "w-80"
      )}
    >
      <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-900 dark:bg-indigo-600 p-2 rounded-xl shadow-md shrink-0">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-base text-slate-900 dark:text-slate-100 truncate tracking-tight font-sans leading-none">
              Control Panel
            </span>
            <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest mt-1 pl-0.5">Audit Pro</span>
          </div>
        )}
      </div>

      <div className="px-3 py-4 flex flex-col gap-1 overflow-y-auto flex-1 custom-scrollbar">
        {!collapsed && companies.length > 0 && (
          <div className="mb-4 px-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 block pl-1">
              Active Organization
            </label>
            <div className="relative group">
              <div 
                className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-all group"
                onClick={() => navigate('/companies')}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight truncate">
                    {selectedCompany?.name || 'Select Organization'}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors shrink-0 ml-2">
                  <Building2 size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all relative overflow-hidden group",
              isActive 
                ? "bg-slate-900 dark:bg-indigo-600 text-white font-bold shadow-lg shadow-slate-900/10 dark:shadow-none" 
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-105"
                )} />
                {!collapsed && <span className="text-[15px] font-semibold tracking-tight">{item.name}</span>}
                {/* Active Indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute right-0 top-1 bottom-1 w-1 bg-indigo-500 rounded-l-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-50 dark:border-slate-800 mt-auto space-y-4">
        {!collapsed && profile && (
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate uppercase tracking-tight">
                {profile.name}
              </span>
              <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] mt-1">
                {profile.role.replace('_', ' ')}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 rounded-xl transition-all font-black group text-[11px] uppercase tracking-widest"
        >
          <LogOut className="h-4 w-4 shrink-0 transition-transform" />
          {!collapsed && <span>Exit</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-10 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-2 shadow-xl shadow-slate-200 dark:shadow-none hover:bg-slate-50 dark:hover:bg-slate-700 z-20 group transition-all"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        ) : (
          <ChevronLeft size={16} className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
        )}
      </button>
    </aside>
  );
}
