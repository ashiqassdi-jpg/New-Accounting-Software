/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2, Printer, X, Eye, BookOpen, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VoucherType, PaymentChannel, Account, Voucher } from '../types';
import { VOUCHER_TYPES, PAYMENT_CHANNELS, ACCOUNT_GROUPS, formatBDT } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { motion, AnimatePresence } from 'motion/react';
import VoucherPrintPreview from './VoucherPrintPreview';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface VoucherItem {
  account_id: string;
  debit: number;
  credit: number;
}

interface VoucherFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialType?: VoucherType;
  editingVoucher?: Voucher | null;
}

import { toast } from 'sonner';

export default function VoucherForm({ onSuccess, onCancel, initialType, editingVoucher }: VoucherFormProps) {
  const { user, profile } = useAuth();
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [lastVoucher, setLastVoucher] = useState<any>(null);
  
  // Voucher state
  const [type, setType] = useState<VoucherType>(initialType || 'PAYMENT');
  const [channel, setChannel] = useState<PaymentChannel>('CASH');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState('');
  const [manualVoucherNo, setManualVoucherNo] = useState(false);
  const [narration, setNarration] = useState('');
  const [items, setItems] = useState<VoucherItem[]>([
    { account_id: '', debit: 0, credit: 0 },
    { account_id: '', debit: 0, credit: 0 }
  ]);
  const [activeAccountSearch, setActiveAccountSearch] = useState<{index: number, query: string} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setActiveAccountSearch(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (editingVoucher) {
      setType(editingVoucher.type);
      setChannel(editingVoucher.payment_channel || 'CASH');
      setDate(editingVoucher.date);
      setVoucherNo(editingVoucher.voucher_no);
      setNarration(editingVoucher.narration || '');
      setManualVoucherNo(true); // Preserve manual number when editing
      fetchVoucherTransactions();
    }
  }, [editingVoucher]);

  const fetchVoucherTransactions = async () => {
    if (!editingVoucher) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('voucher_id', editingVoucher.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setItems(data.map(t => ({
        account_id: t.account_id,
        debit: t.debit,
        credit: t.credit
      })));
    }
  };

  useEffect(() => {
    if (selectedCompany) {
      fetchAccounts();
    }
  }, [selectedCompany]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', selectedCompany!.id)
      .order('name');
    setAccounts(data || []);
  };

  const getVoucherPrefix = (vType: VoucherType) => {
    switch (vType) {
      case 'PAYMENT': return 'PV';
      case 'RECEIPT': return 'RV';
      case 'JOURNAL': return 'JV';
      case 'CONTRA': return 'CV';
      case 'SALES': return 'SV';
      case 'PURCHASE': return 'PU';
      default: return 'VO';
    }
  };

  const generateVoucherNo = async () => {
    if (!selectedCompany) return;

    try {
      const prefix = getVoucherPrefix(type);
      
      const { data, error } = await supabase
        .from('vouchers')
        .select('voucher_no')
        .eq('company_id', selectedCompany.id)
        .eq('type', type)
        .order('voucher_no', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNo = data[0].voucher_no;
        const lastSequence = lastNo.split('-').pop();
        if (lastSequence && !isNaN(Number(lastSequence))) {
          nextNumber = parseInt(lastSequence) + 1;
        }
      }

      const generated = `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
      if (!manualVoucherNo) {
        setVoucherNo(generated);
      }
    } catch (err) {
      console.error('Error auto-generating voucher number:', err);
    }
  };

  useEffect(() => {
    generateVoucherNo();
  }, [type, selectedCompany]);

  const addItem = () => {
    setItems([...items, { account_id: '', debit: 0, credit: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 2) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof VoucherItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCompany) return;

    // Client-side validation
    if (!type) {
      toast.error('Validation Error', { description: 'Please select a voucher type.' });
      return;
    }
    if (!date) {
      toast.error('Validation Error', { description: 'Please select a date.' });
      return;
    }
    if (!voucherNo || voucherNo.trim() === '') {
      toast.error('Validation Error', { description: 'Voucher number is required.' });
      return;
    }
    if (Math.max(totalDebit, totalCredit) <= 0) {
      toast.error('Validation Error', { description: 'Voucher amount must be greater than zero.' });
      return;
    }

    if (!isBalanced) {
      toast.error('Voucher unbalanced', { description: 'Total Debit must equal Total Credit' });
      return;
    }
    if (items.some(i => !i.account_id)) {
      toast.error('Missing Account', { description: 'Please select an account for all line items' });
      return;
    }

    setLoading(true);

    try {
      let voucherId = editingVoucher?.id;

      if (editingVoucher) {
        // Update existing voucher
        const { error: vError } = await supabase
          .from('vouchers')
          .update({
            voucher_no: voucherNo,
            date,
            type,
            payment_channel: (type === 'PAYMENT' || type === 'RECEIPT' || type === 'CONTRA') ? channel : null,
            narration,
            amount: Math.max(totalDebit, totalCredit)
          })
          .eq('id', editingVoucher.id);

        if (vError) throw vError;

        // Delete old transactions to re-insert new ones (safest way to handle splits)
        const { error: dError } = await supabase
          .from('transactions')
          .delete()
          .eq('voucher_id', editingVoucher.id);

        if (dError) throw dError;
      } else {
        // Create new voucher
        const { data: voucher, error: vError } = await supabase
          .from('vouchers')
          .insert([{
            company_id: selectedCompany.id,
            voucher_no: voucherNo || `V-${Date.now()}`,
            date,
            type,
            payment_channel: (type === 'PAYMENT' || type === 'RECEIPT' || type === 'CONTRA') ? channel : null,
            narration,
            amount: Math.max(totalDebit, totalCredit),
            created_by: user.id
          }])
          .select()
          .single();

        if (vError) throw vError;
        voucherId = voucher.id;
      }

      // Create Transactions (Double Entry)
      const transactions = items.map(item => ({
        voucher_id: voucherId,
        company_id: selectedCompany.id,
        account_id: item.account_id,
        debit: item.debit,
        credit: item.credit,
        date
      }));

      const { error: tError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (tError) throw tError;

      toast.success(editingVoucher ? 'Voucher Updated' : 'Voucher Posted Successfully');

      if (!editingVoucher) {
        const { data: voucher } = await supabase.from('vouchers').select('*').eq('id', voucherId).single();
        setLastVoucher({
          ...voucher,
          items: items.map(i => ({
            ...i,
            account_name: accounts.find(a => a.id === i.account_id)?.name
          }))
        });
        setShowPrintPreview(true);
      } else {
        onSuccess();
      }
    } catch (error: any) {
      toast.error('Process Failed', { description: error.message || 'Error occurred while posting voucher.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2rem] border border-slate-200 shadow-2xl overflow-hidden max-w-5xl mx-auto"
      >
        {/* Pro Header */}
        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-none">
                {editingVoucher ? 'Modify Ledger Entry' : 'New Voucher Registration'}
              </h2>
              <p className="text-[10px] font-bold text-indigo-300 mt-1 uppercase tracking-widest opacity-80">
                Regulatory Double-Entry Protocol
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Document Type</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 cursor-pointer"
                value={type}
                onChange={(e) => setType(e.target.value as VoucherType)}
              >
                {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Payment Engine</label>
              <select 
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700 cursor-pointer"
                value={channel}
                onChange={(e) => setChannel(e.target.value as PaymentChannel)}
              >
                {PAYMENT_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Posting Date</label>
              <input 
                type="date"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Reference ID</label>
                {!manualVoucherNo && (
                  <button type="button" onClick={() => setManualVoucherNo(true)} className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 uppercase">Override</button>
                )}
              </div>
              <input 
                className={cn(
                  "w-full border rounded-xl px-4 py-2.5 text-xs outline-none transition-all font-mono font-bold",
                  manualVoucherNo ? "bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500/10" : "bg-slate-200/50 border-slate-200 text-slate-400 cursor-not-allowed"
                )}
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                readOnly={!manualVoucherNo}
                placeholder="AUTO-GEN"
              />
            </div>
          </div>

          {/* Tabular Entry Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                Transaction Ledger Splits
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{items.length} Nodes</span>
              </h3>
              <button 
                type="button" 
                onClick={addItem}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                <Plus size={14} /> Add Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-[1.5rem] shadow-sm bg-slate-50/30">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Account / Ledger</th>
                    <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Debit Value</th>
                    <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Credit Value</th>
                    <th className="px-6 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => (
                    <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-[10px] font-mono text-slate-300 text-center">{index + 1}</td>
                      <td className="px-6 py-4 relative z-auto" ref={activeAccountSearch?.index === index ? searchRef : null}>
                        <div 
                          className={cn(
                            "w-full bg-white border rounded-xl px-4 py-2.5 text-xs transition-all font-bold cursor-pointer flex items-center justify-between",
                            activeAccountSearch?.index === index ? "border-indigo-500 ring-4 ring-indigo-500/5 shadow-sm" : "border-slate-100 hover:border-slate-200"
                          )}
                          onClick={() => setActiveAccountSearch({ index, query: '' })}
                        >
                          <span className={cn(item.account_id ? "text-slate-900" : "text-slate-300 font-medium")}>
                            {item.account_id 
                              ? accounts.find(a => a.id === item.account_id)?.name 
                              : "Search ledger account..."}
                          </span>
                          <Search size={14} className={cn(activeAccountSearch?.index === index ? "text-indigo-500" : "text-slate-200")} />
                        </div>

                        <AnimatePresence>
                          {activeAccountSearch?.index === index && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.98 }}
                              className="absolute left-6 right-6 top-full mt-2 bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-2xl z-[999] overflow-hidden"
                            >
                              <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    autoFocus
                                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                                    placeholder="Type Ledger Name or Atomic Code..."
                                    value={activeAccountSearch.query}
                                    onChange={(e) => setActiveAccountSearch({ ...activeAccountSearch, query: e.target.value })}
                                  />
                                </div>
                              </div>
                              <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-2 py-2">
                                {ACCOUNT_GROUPS.map(group => {
                                  const groupAccounts = accounts.filter(a => 
                                    a.type === group.value && 
                                    (a.name.toLowerCase().includes(activeAccountSearch.query.toLowerCase()) || 
                                     a.code.includes(activeAccountSearch.query))
                                  );
                                  if (groupAccounts.length === 0) return null;
                                  
                                  return (
                                    <div key={group.value} className="mb-3 last:mb-0">
                                      <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.label}</div>
                                      {groupAccounts.map(a => (
                                        <button
                                          key={a.id}
                                          type="button"
                                          onClick={() => {
                                            updateItem(index, 'account_id', a.id);
                                            setActiveAccountSearch(null);
                                          }}
                                          className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-indigo-50 group flex items-center justify-between transition-all"
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700">{a.name}</span>
                                            <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-400">{a.code}</span>
                                          </div>
                                          <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Plus size={12} className="text-indigo-600" />
                                          </div>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                })}
                                {accounts.filter(a => 
                                  a.name.toLowerCase().includes(activeAccountSearch.query.toLowerCase()) || 
                                  a.code.includes(activeAccountSearch.query)
                                ).length === 0 && (
                                  <div className="py-12 text-center">
                                    <AlertCircle className="mx-auto text-slate-200 mb-2" size={32} />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No matching ledgers</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-right outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-mono font-bold text-slate-900"
                          value={item.debit === 0 ? '' : item.debit}
                          onChange={(e) => updateItem(index, 'debit', e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs text-right outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white transition-all font-mono font-bold text-slate-900"
                          value={item.credit === 0 ? '' : item.credit}
                          onChange={(e) => updateItem(index, 'credit', e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          type="button" 
                          onClick={() => removeItem(index)}
                          disabled={items.length <= 2}
                          className="p-2 text-slate-200 hover:text-rose-500 transition-colors disabled:opacity-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lower Narrative & Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Primary Narration / Description</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-[1.5rem] px-5 py-4 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none h-32 font-medium leading-relaxed"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Detail the transaction purpose here..."
              />
            </div>

            <div className="flex flex-col justify-end space-y-6">
              <div className="bg-slate-900 rounded-[1.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10 grid grid-cols-2 gap-8 divide-x divide-white/10">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] block">Aggregate Debit</span>
                    <span className="text-2xl font-black font-mono tracking-tighter">{formatBDT(totalDebit)}</span>
                  </div>
                  <div className="space-y-1 pl-8">
                    <span className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.2em] block">Aggregate Credit</span>
                    <span className="text-2xl font-black font-mono tracking-tighter">{formatBDT(totalCredit)}</span>
                  </div>
                </div>
                
                <div className="mt-8 flex items-center justify-between relative z-10 border-t border-white/10 pt-6">
                  {isBalanced && Math.max(totalDebit, totalCredit) > 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle2 size={14} className="animate-pulse" /> Post Equilibrium Valid
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      <AlertCircle size={14} /> {Math.max(totalDebit, totalCredit) <= 0 ? 'Amount Required' : 'Variance Detected'}
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button type="button" onClick={onCancel} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                    <button 
                      disabled={loading || !isBalanced || Math.max(totalDebit, totalCredit) <= 0}
                      type="submit"
                      className="bg-indigo-500 text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save size={16} /> {loading ? 'Processing...' : (editingVoucher ? 'Update Transaction' : 'Post Voucher')}
                    </button>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.03] scale-[4] rotate-12 group-hover:scale-[4.2] transition-transform pointer-events-none">
                  <CheckCircle2 size={64} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </motion.div>

      <AnimatePresence>
        {showPrintPreview && lastVoucher && (
          <VoucherPrintPreview 
            voucher={lastVoucher}
            company={selectedCompany}
            profile={profile}
            onClose={() => {
              setShowPrintPreview(false);
              onSuccess();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
