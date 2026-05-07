import React from 'react';
import { cn } from '../../lib/utils';
import { formatBDT } from '../../constants';
import { motion } from 'motion/react';

export function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/60 dark:border-slate-800 transition-all duration-200">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg bg-slate-50 dark:bg-slate-800", colorMap[color])}>
          <Icon size={20} />
        </div>
        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</h3>
      </div>
      <p className={cn(
        "text-xl font-bold font-mono tracking-tight tabular-nums truncate",
        value < 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-100"
      )}>
        {formatBDT(value)}
      </p>
    </div>
  );
}
