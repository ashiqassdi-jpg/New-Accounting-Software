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
        "flex flex-col bg-white border-r border-slate-100 transition-all duration-300 relative h-screen shadow-[1px_0_0_0_rgba(0,0,0,0.02)] no-print",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-50 overflow-hidden">
        <div className="bg-slate-900 p-2 rounded-xl shadow-lg shadow-slate-100 shrink-0">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-lg text-slate-900 truncate tracking-tight font-sans leading-none">
              Ashiq's Creation
            </span>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Enterprise</span>
          </div>
        )}
      </div>

      <div className="px-3 py-6 flex flex-col gap-1 overflow-y-auto flex-1 custom-scrollbar">
        {!collapsed && companies.length > 0 && (
          <div className="mb-6 px-3">
            <label className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em] mb-2.5 block pl-1">
              Active Organization
            </label>
            <div className="relative group">
              <div 
                className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-4 py-3.5 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-lg hover:shadow-indigo-500/5 group"
                onClick={() => navigate('/companies')}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                    {selectedCompany?.name || 'No Organization'}
                  </span>
                  <span className="text-[8px] font-mono text-slate-400 mt-0.5 tracking-widest font-black uppercase">
                    ID: {selectedCompany?.id.split('-')[0]}
                  </span>
                </div>
                <div className="bg-white p-1.5 rounded-lg border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                  <Building2 size={12} className="text-slate-400 group-hover:text-indigo-600" />
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
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all relative overflow-hidden group",
              isActive 
                ? "bg-slate-900 text-white font-bold shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-transform duration-500 group-hover:scale-110",
                  "group-hover:rotate-3"
                )} />
                {!collapsed && <span className="text-[13px] tracking-wide">{item.name}</span>}
                {/* Active Indicator */}
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-full"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-slate-50 mt-auto">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-all font-bold group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="text-[13px]">Terminate</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-4 top-10 bg-white border border-slate-100 rounded-2xl p-2 shadow-xl shadow-slate-200 hover:bg-slate-50 z-20 group transition-all"
      >
        {collapsed ? (
          <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600" />
        ) : (
          <ChevronLeft size={16} className="text-slate-400 group-hover:text-indigo-600" />
        )}
      </button>
    </aside>
  );
}
