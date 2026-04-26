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
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-all duration-300 relative group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg bg-slate-50/50", colorMap[color])}>
          <Icon size={16} />
        </div>
        <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <p className={cn(
        "text-xl font-bold font-mono tracking-tighter tabular-nums truncate",
        value < 0 ? "text-rose-600" : "text-slate-800"
      )}>
        {formatBDT(value)}
      </p>
    </motion.div>
  );
}
