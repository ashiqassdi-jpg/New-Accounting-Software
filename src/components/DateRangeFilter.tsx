import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DateRange {
  from: string;
  to: string;
}

interface Props {
  value: DateRange;
  onChange: (value: DateRange) => void;
  compact?: boolean;
}

export function DateRangeFilter({ value, onChange, compact }: Props) {
  return (
    <div className={cn(
      "grid gap-2 sm:gap-4 w-full", 
      compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"
    )}>
      <div className="space-y-1 w-full">
        {!compact && <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pl-1">From</label>}
        <div className="relative group">
          <input 
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={cn(
              "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm text-slate-700 dark:text-slate-200 font-medium",
              compact ? "px-2 py-2 text-[11px] h-10" : "px-4 py-3 text-sm h-12"
            )}
          />
        </div>
      </div>
      
      <div className="space-y-1 w-full">
        {!compact && <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold pl-1">To</label>}
        <div className="relative group">
          <input 
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={cn(
              "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm text-slate-700 dark:text-slate-200 font-medium",
              compact ? "px-2 pr-8 py-2 text-[11px] h-10" : "px-4 pr-10 py-3 text-sm h-12"
            )}
          />
          {(value.from || value.to) && (
            <button
              onClick={() => onChange({ from: '', to: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors p-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg lg:bg-transparent lg:dark:bg-transparent"
              title="Clear Dates"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
