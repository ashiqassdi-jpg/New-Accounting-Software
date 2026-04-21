/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Receipt, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { Voucher } from '../types';
import { formatBDT } from '../constants';
import VoucherForm from '../components/VoucherForm';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Vouchers() {
  const { selectedCompany } = useCompany();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
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
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            Vouchers
          </h1>
          <p className="text-gray-500 mt-1">
            Transaction history and record keeping
          </p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={20} />
            <span>New Voucher</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <VoucherForm 
            onSuccess={() => {
              setIsAdding(false);
              fetchVouchers();
            }}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* toolbar */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  placeholder="Search voucher number or narration..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                <Filter size={18} />
                <span>Filters</span>
              </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Voucher No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Narration</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                          {format(new Date(v.date), 'dd MMM yyyy')}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          {v.voucher_no}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider",
                            v.type === 'PAYMENT' && "bg-rose-50 text-rose-600",
                            v.type === 'RECEIPT' && "bg-emerald-50 text-emerald-600",
                            v.type === 'JOURNAL' && "bg-amber-50 text-amber-600",
                            v.type === 'CONTRA' && "bg-indigo-50 text-indigo-600",
                            v.type === 'SALES' && "bg-blue-50 text-blue-600",
                            v.type === 'PURCHASE' && "bg-purple-50 text-purple-600",
                          )}>
                            {v.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {v.narration}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                          {formatBDT(v.amount)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredVouchers.length === 0 && !loading && (
                <div className="py-20 text-center">
                  <Receipt className="mx-auto text-gray-300 h-12 w-12 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">No vouchers found</h3>
                  <p className="text-gray-500">Add your first transaction using the button above.</p>
                </div>
              )}

              {loading && (
                <div className="py-20 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
