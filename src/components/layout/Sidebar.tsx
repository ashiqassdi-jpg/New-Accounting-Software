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
  { name: 'User Access', path: '/users', icon: ShieldCheck, role: 'ADMIN' },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, profile } = useAuth();
  const { selectedCompany, companies, setSelectedCompany } = useCompany();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.role) return true;
    if (!profile) return false;
    const roles = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];
    return roles.indexOf(profile.role) >= roles.indexOf(item.role);
  });

  return (
    <aside 
      className={cn(
        "flex flex-col bg-white border-r border-slate-100 transition-all duration-300 relative h-screen shadow-[1px_0_0_0_rgba(0,0,0,0.02)]",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex items-center gap-3 px-8 h-24 border-b border-slate-50 overflow-hidden">
        <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-100 shrink-0">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-bold text-xl text-slate-900 truncate tracking-tight font-sans">
              Ashiq's Creation
            </span>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Enterprise Edition</span>
          </div>
        )}
      </div>

      <div className="px-4 py-8 flex flex-col gap-1.5 overflow-y-auto flex-1 custom-scrollbar">
        {!collapsed && companies.length > 0 && (
          <div className="mb-6 px-4">
            <label className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-3 block pl-1">
              Active Entity
            </label>
            <div className="relative group">
              <select 
                className="w-full bg-slate-50/50 border border-slate-100 text-sm rounded-xl px-4 py-3 text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                value={selectedCompany?.id || ''}
                onChange={(e) => {
                  const company = companies.find(c => c.id === e.target.value);
                  if (company) setSelectedCompany(company);
                }}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
          </div>
        )}

        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all relative overflow-hidden group",
              isActive 
                ? "bg-slate-900 text-white font-bold shadow-2xl shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-500 group-hover:scale-110",
                  "group-hover:rotate-3"
                )} />
                {!collapsed && <span className="text-sm tracking-wide">{item.name}</span>}
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
          className="flex items-center gap-3.5 w-full px-4 py-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all font-bold group"
        >
          <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="text-sm">Terminate Session</span>}
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
