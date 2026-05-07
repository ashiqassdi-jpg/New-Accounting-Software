import React from 'react';

export function ChartBox({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200/60 dark:border-slate-800 relative">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-slate-400 dark:text-slate-500">
          <Icon size={20} />
        </div>
        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">{title}</h3>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
