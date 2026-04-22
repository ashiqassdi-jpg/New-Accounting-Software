/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { formatBDT } from '../constants';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import VoucherPrintPreview from '../components/VoucherPrintPreview';

export default function Ledger() {
  const { profile } = useAuth();
  const { selectedCompany } = useCompany();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<any>(null);

  useEffect(() => {
    if (selectedCompany) {
      supabase.from('accounts')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name')
        .then(({ data }) => setAccounts(data || []));
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions();
    }
  }, [selectedAccountId]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        voucher:vouchers(*)
      `)
      .eq('account_id', selectedAccountId)
      .order('date', { ascending: false });
    
    setTransactions(data || []);
    setLoading(false);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            General Ledger
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Atomic transaction traceability</p>
        </div>

        <div className="max-w-xs w-full">
          <select 
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm"
          >
            <option value="">Select Account Ledger</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedAccount && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LedgerStat label="Current Balance" value={selectedAccount.current_balance} />
          <LedgerStat label="Opening Balance" value={selectedAccount.opening_balance} />
          <LedgerStat label="Account Type" value={selectedAccount.type} isType />
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-slate-50 shadow-2xl shadow-indigo-100/10 overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Transaction History</h3>
          <button className="text-slate-400 hover:text-indigo-600 transition-colors">
            <Download size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-10 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref #</th>
                <th className="px-10 py-5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Narration</th>
                <th className="px-10 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit</th>
                <th className="px-10 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-12">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-5 text-sm font-bold text-slate-400 whitespace-nowrap">
                    {format(new Date(t.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-10 py-5 text-sm font-bold text-slate-900 font-mono">
                    {t.voucher?.voucher_no}
                  </td>
                  <td className="px-10 py-5 text-sm font-medium text-slate-500 max-w-md">
                    {t.voucher?.narration}
                  </td>
                  <td className="px-10 py-5 text-sm font-mono font-black text-rose-600 text-right">
                    {t.debit > 0 ? formatBDT(t.debit) : '-'}
                  </td>
                  <td className="px-10 py-5 text-sm font-mono font-black text-emerald-600 text-right pr-12">
                    <div className="flex items-center justify-end gap-3">
                      {t.credit > 0 ? formatBDT(t.credit) : '-'}
                      <button 
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        onClick={() => setViewingVoucher(t.voucher)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-300 font-medium italic">
                    {selectedAccountId ? 'No transactions recorded yet.' : 'Please select a ledger to begin analysis.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {viewingVoucher && (
          <VoucherPrintPreview 
            voucher={viewingVoucher}
            company={selectedCompany}
            profile={profile}
            onClose={() => setViewingVoucher(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function LedgerStat({ label, value, isType }: any) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-50 shadow-sm flex flex-col gap-1">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={cn(
        "text-2xl font-bold tracking-tight",
        isType ? "text-indigo-600" : "text-slate-900 font-mono"
      )}>
        {isType ? value : formatBDT(value)}
      </span>
    </div>
  );
}
