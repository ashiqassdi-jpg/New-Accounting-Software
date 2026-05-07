import React from 'react';

export function ChartBox({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] relative">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800 p-1.5 rounded-lg text-slate-400 dark:text-slate-500">
          <Icon size={14} />
        </div>
        <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
