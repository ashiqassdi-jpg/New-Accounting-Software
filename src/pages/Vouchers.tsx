/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Receipt, ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { Voucher, VoucherType } from '../types';
import { formatBDT, VOUCHER_TYPES } from '../constants';
import VoucherForm from '../components/VoucherForm';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Vouchers() {
  const { selectedCompany } = useCompany();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormType, setActiveFormType] = useState<VoucherType | null>(null);
  const [search, setSearch] = useState('');

  const fetchVouchers = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else {
      setVouchers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, [selectedCompany]);

  const filteredVouchers = vouchers.filter(v => 
    v.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
    v.narration.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Voucher Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Record entries for {selectedCompany?.name || 'Selected Entity'}
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeFormType ? (
          <VoucherForm 
            initialType={activeFormType}
            onSuccess={() => {
              setActiveFormType(null);
              fetchVouchers();
            }}
            onCancel={() => setActiveFormType(null)}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {VOUCHER_TYPES.map((vt) => (
                <button
                  key={vt.value}
                  onClick={() => setActiveFormType(vt.value as VoucherType)}
                  className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 hover:-translate-y-1 transition-all group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                    vt.value === 'PAYMENT' && "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
                    vt.value === 'RECEIPT' && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                    vt.value === 'JOURNAL' && "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                    vt.value === 'CONTRA' && "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                    vt.value === 'SALES' && "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white",
                    vt.value === 'PURCHASE' && "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white",
                  )}>
                    <Receipt size={24} />
                  </div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{vt.label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Recent Transactions</h2>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    placeholder="Filter by description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Type</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-10">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 pl-10">
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider",
                              v.type === 'PAYMENT' && "bg-rose-50 text-rose-600",
                              v.type === 'RECEIPT' && "bg-emerald-50 text-emerald-600",
                              v.type === 'JOURNAL' && "bg-amber-50 text-amber-600",
                              v.type === 'CONTRA' && "bg-indigo-50 text-indigo-600",
                              v.type === 'SALES' && "bg-sky-50 text-sky-600",
                              v.type === 'PURCHASE' && "bg-slate-100 text-slate-600",
                            )}>
                              {v.type}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-400">
                            {format(new Date(v.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{v.voucher_no}</span>
                              <span className="text-xs text-slate-400 font-medium truncate max-w-xs">{v.narration}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-mono font-black text-slate-900 text-right pr-10">
                            {formatBDT(v.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredVouchers.length === 0 && !loading && (
                  <div className="py-20 text-center">
                    <Receipt className="mx-auto text-gray-300 h-10 w-10 mb-4" />
                    <p className="text-slate-400 text-sm font-medium">No transactions found match your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
