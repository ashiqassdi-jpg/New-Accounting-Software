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
        collapsed ? "w-20" : "w-80"
      )}
    >
      <div className="flex items-center gap-4 px-6 h-24 border-b border-slate-50 overflow-hidden">
        <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg shadow-slate-100 shrink-0">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-xl text-slate-900 truncate tracking-tight font-sans leading-none">
              Ashik's Creation
            </span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1.5 pl-0.5">Enterprise</span>
          </div>
        )}
      </div>

      <div className="px-3 py-6 flex flex-col gap-1 overflow-y-auto flex-1 custom-scrollbar">
        {!collapsed && companies.length > 0 && (
          <div className="mb-8 px-3">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-3.5 block pl-1">
              Active Organization
            </label>
            <div className="relative group">
              <div 
                className="w-full bg-slate-50/80 border border-slate-100 rounded-2xl px-5 py-4.5 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-indigo-500/5 group"
                onClick={() => navigate('/companies')}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-black text-slate-900 uppercase tracking-tight truncate">
                    {selectedCompany?.name || 'No Organization'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 tracking-widest font-black uppercase">
                    ID: {selectedCompany?.id.split('-')[0]}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                  <Building2 size={14} className="text-slate-400 group-hover:text-indigo-600" />
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
              "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all relative overflow-hidden group",
              isActive 
                ? "bg-slate-900 text-white font-bold shadow-xl shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-6 w-6 shrink-0 transition-transform duration-500 group-hover:scale-110",
                  "group-hover:rotate-3"
                )} />
                {!collapsed && <span className="text-[15px] font-bold tracking-tight">{item.name}</span>}
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

      <div className="p-6 border-t border-slate-50 mt-auto">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-4 w-full px-4 py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-black group"
        >
          <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="text-[15px] uppercase tracking-widest">Terminate</span>}
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
