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
    <div className={cn("grid grid-cols-2 gap-4 w-full", compact ? "" : "")}>
      <div className="space-y-1.5 w-full">
        <label className="text-xs text-slate-500 font-medium">From</label>
        <div className="relative">
          <input 
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={cn(
              "w-full bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700",
              compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
            )}
          />
          {/* Removed clear button for 'From' */}
        </div>
      </div>
      
      <div className="space-y-1.5 w-full">
        <label className="text-xs text-slate-500 font-medium">To</label>
        <div className="relative">
          <input 
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={cn(
              "w-full bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm text-slate-700",
              compact ? "px-2 pr-6 py-1.5 text-xs" : "px-3 pr-8 py-2 text-sm"
            )}
          />
          {(value.from && value.to) && (
            <button
              onClick={() => onChange({ from: '', to: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors p-0.5"
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
