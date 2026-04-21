/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCompany } from '../../hooks/useCompany';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Vouchers', path: '/vouchers', icon: Receipt },
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
        "flex flex-col bg-white border-r border-gray-200 transition-all duration-300 relative h-screen shadow-sm",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center gap-3 px-6 h-20 border-b border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 p-2 rounded-lg shrink-0">
          <BookOpen className="h-6 w-6 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-xl text-gray-900 truncate tracking-tight font-sans">
            CloudLedger
          </span>
        )}
      </div>

      <div className="px-3 py-4 flex flex-col gap-2 overflow-y-auto flex-1">
        {!collapsed && companies.length > 0 && (
          <div className="mb-4 px-3">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
              Active Company
            </label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
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
          </div>
        )}

        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all group",
              isActive 
                ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0 transition-transform group-hover:scale-110")} />
            {!collapsed && <span className="text-sm truncate">{item.name}</span>}
          </NavLink>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100 mt-auto">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-24 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:bg-gray-50 z-10 hidden md:block"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
