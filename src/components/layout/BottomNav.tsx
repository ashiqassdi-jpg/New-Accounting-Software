import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Receipt, 
  ChartBar, 
  BookOpen,
  Settings 
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Vouchers', path: '/vouchers', icon: Receipt },
  { name: 'Ledger', path: '/ledger', icon: BookOpen },
  { name: 'Reports', path: '/reports', icon: ChartBar },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800 rounded-3xl shadow-2xl z-[40] flex items-center justify-around px-2 no-print">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl transition-all duration-300",
            isActive 
              ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm scale-105" 
              : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400"
          )}
        >
          {({ isActive }) => (
            <>
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">
                {item.name}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
