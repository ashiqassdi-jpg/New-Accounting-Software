/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2, Printer, X, Eye, BookOpen, Search, ChevronDown } from 'lucide-react';
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
  const [activeAccountSearch, setActiveAccountSearch] = useState<{index: number, query: string, rect?: { top: number, left: number, width: number }} | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeAccountSearch && searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setActiveAccountSearch(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeAccountSearch]);

  const openSearch = (index: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveAccountSearch({ 
      index, 
      query: '', 
      rect: {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      }
    });
  };

  useEffect(() => {
    const handleScrollOrResize = () => {
      if (activeAccountSearch) setActiveAccountSearch(null);
    };
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [activeAccountSearch]);

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
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-5xl mx-auto"
      >
        {/* Pro Header */}
        <div className="px-8 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium tracking-tight leading-none">
                {editingVoucher ? 'Modify Ledger Entry' : 'New Voucher Registration'}
              </h2>
              <p className="text-[10px] font-semibold text-indigo-300 mt-1 uppercase tracking-widest opacity-80">
                Regulatory Double-Entry Protocol
              </p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">Document Type</label>
              <div className="relative group">
                <select 
                  className="appearance-none w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-900 cursor-pointer uppercase tracking-tight"
                  value={type}
                  onChange={(e) => setType(e.target.value as VoucherType)}
                >
                  {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-indigo-500 transition-colors">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">Payment Engine</label>
              <div className="relative group">
                <select 
                  className="appearance-none w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold text-slate-900 cursor-pointer uppercase tracking-tight"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as PaymentChannel)}
                >
                  {PAYMENT_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-indigo-500 transition-colors">
                  <ChevronDown size={12} />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">Posting Date</label>
              <input 
                type="date"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Reference ID</label>
                {!manualVoucherNo && (
                  <button type="button" onClick={() => setManualVoucherNo(true)} className="text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 uppercase">Override</button>
                )}
              </div>
              <input 
                className={cn(
                  "w-full border rounded-xl px-4 py-2 text-[11px] outline-none transition-all font-mono font-semibold",
                  manualVoucherNo ? "bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500/10" : "bg-slate-200/50 border-slate-200 text-slate-400 cursor-not-allowed"
                )}
                value={voucherNo}
                onChange={(e) => setVoucherNo(e.target.value)}
                readOnly={!manualVoucherNo}
                placeholder="AUTO-GEN"
              />
            </div>
          </div>

          {/* Consolidated Ledger Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                Transaction Ledger Nodes
                <span className="text-[9px] font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                  {items.length} Entries
                </span>
              </h3>
              <button 
                type="button" 
                onClick={addItem}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
              >
                <Plus size={14} /> Add Transaction
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="overflow-visible">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-6 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                      <th className="px-6 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Target Account Ledger</th>
                      <th className="px-6 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest w-36 text-right">Debit (৳)</th>
                      <th className="px-6 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest w-36 text-right">Credit (৳)</th>
                      <th className="px-6 py-3 text-[9px] font-semibold text-slate-400 uppercase tracking-widest w-14 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={index} className="group hover:bg-slate-50/20 transition-colors">
                        <td className="px-6 py-3 text-[10px] font-mono text-slate-300 text-center font-semibold">{index + 1}</td>
                        <td className="px-6 py-3">
                          <div className="relative">
                            <div 
                              className={cn(
                                "w-full bg-slate-50/30 border rounded-xl px-4 py-2 text-[11px] transition-all font-semibold flex items-center justify-between cursor-pointer group-hover:bg-white",
                                activeAccountSearch?.index === index ? "border-indigo-500 ring-2 ring-indigo-500/5 bg-white shadow-sm" : "border-slate-100 hover:border-slate-300"
                              )}
                              onClick={(e) => openSearch(index, e)}
                            >
                              <div className="flex flex-col truncate pr-4">
                                <span className={cn("truncate", item.account_id ? "text-slate-900" : "text-slate-300")}>
                                  {item.account_id 
                                    ? accounts.find(a => a.id === item.account_id)?.name 
                                    : "Search account..."}
                                </span>
                                {item.account_id && (
                                  <span className="text-[8px] font-mono text-slate-400 mt-0.5 tracking-wider uppercase truncate">
                                    {accounts.find(a => a.id === item.account_id)?.code}
                                  </span>
                                )}
                              </div>
                              <Search size={10} className={cn(activeAccountSearch?.index === index ? "text-indigo-500" : "text-slate-300")} />
                            </div>

                            {activeAccountSearch?.index === index && createPortal(
                                <div 
                                  ref={searchRef}
                                  style={{
                                    position: 'absolute',
                                    top: activeAccountSearch.rect?.top,
                                    left: activeAccountSearch.rect?.left,
                                    width: activeAccountSearch.rect?.width,
                                    zIndex: 9999
                                  }}
                                  className="bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.2)] rounded-xl overflow-hidden mt-1 animate-in fade-in zoom-in-95 duration-100"
                                >
                                  <div className="p-2 border-b border-slate-50 bg-slate-50/50">
                                    <div className="relative">
                                      <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input 
                                        autoFocus
                                        className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-1.5 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-medium uppercase placeholder:text-slate-300"
                                        placeholder="Type name or code..."
                                        value={activeAccountSearch.query}
                                        onChange={(e) => setActiveAccountSearch({ ...activeAccountSearch, query: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
                                    {(() => {
                                      const filtered = accounts.filter(a => 
                                        a.name.toLowerCase().includes(activeAccountSearch.query.toLowerCase()) || 
                                        a.code.toLowerCase().includes(activeAccountSearch.query.toLowerCase())
                                      );

                                      if (filtered.length === 0) {
                                        return (
                                          <div className="py-6 text-center text-[9px] font-medium text-slate-300 uppercase tracking-widest">
                                            No Ledgers Found
                                          </div>
                                        );
                                      }

                                      const groups = ACCOUNT_GROUPS.map(group => ({
                                        ...group,
                                        accounts: filtered.filter(a => a.type === group.value)
                                      })).filter(g => g.accounts.length > 0);

                                      const groupedIds = groups.flatMap(g => g.accounts.map(a => a.id));
                                      const others = filtered.filter(a => !groupedIds.includes(a.id));
                                      if (others.length > 0) {
                                        groups.push({ value: 'OTHER', label: 'Other Ledgers', color: 'slate', accounts: others });
                                      }

                                      return groups.map(group => (
                                        <div key={group.value} className="mb-1 last:mb-0">
                                          <div className="px-2 py-1 text-[7px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">{group.label}</div>
                                          {group.accounts.map(a => (
                                            <button
                                              key={a.id}
                                              type="button"
                                              onClick={() => {
                                                updateItem(index, 'account_id', a.id);
                                                setActiveAccountSearch(null);
                                              }}
                                              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-indigo-600 group flex items-center justify-between transition-all"
                                            >
                                              <div className="flex flex-col">
                                                <span className="text-[10px] font-medium text-slate-700 group-hover:text-white uppercase tracking-tight">{a.name}</span>
                                                <span className="text-[8px] font-mono text-slate-400 group-hover:text-indigo-100 tracking-widest">{a.code}</span>
                                              </div>
                                              <Plus size={10} className="text-slate-300 group-hover:text-white opacity-0 group-hover:opacity-100" />
                                            </button>
                                          ))}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>,
                                document.body
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-slate-50/30 border border-slate-100 rounded-xl px-4 py-2 text-[11px] text-right outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 transition-all font-mono font-semibold text-slate-900 group-hover:bg-white"
                            value={item.debit === 0 ? '' : item.debit}
                            onChange={(e) => updateItem(index, 'debit', e.target.value === '' ? 0 : Number(e.target.value))}
                          />
                        </td>
                        <td className="px-6 py-3">
                          <input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full bg-slate-50/30 border border-slate-100 rounded-xl px-4 py-2 text-[11px] text-right outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-300 transition-all font-mono font-semibold text-slate-900 group-hover:bg-white"
                            value={item.credit === 0 ? '' : item.credit}
                            onChange={(e) => updateItem(index, 'credit', e.target.value === '' ? 0 : Number(e.target.value))}
                          />
                        </td>
                        <td className="px-6 py-3 text-center">
                          {items.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeItem(index)}
                              className="p-1.5 text-slate-300 hover:text-white hover:bg-rose-500 rounded-lg transition-all active:scale-90"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Lower Narrative & Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">Primary Narration / Description</label>
              <textarea 
                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-3 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none h-28 font-medium leading-relaxed"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Detail the transaction purpose here..."
              />
            </div>

            <div className="flex flex-col justify-end space-y-4">
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                <div className="relative z-10 grid grid-cols-2 gap-6 divide-x divide-white/10">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-semibold text-indigo-300 uppercase tracking-[0.2em] block">Aggregate Debit</span>
                    <span className="text-xl font-semibold font-mono tracking-tighter">{formatBDT(totalDebit)}</span>
                  </div>
                  <div className="space-y-0.5 pl-6">
                    <span className="text-[8px] font-semibold text-indigo-300 uppercase tracking-[0.2em] block">Aggregate Credit</span>
                    <span className="text-xl font-semibold font-mono tracking-tighter">{formatBDT(totalCredit)}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between relative z-10 border-t border-white/10 pt-5">
                  {isBalanced && Math.max(totalDebit, totalCredit) > 0 ? (
                    <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest">
                      <CheckCircle2 size={12} /> Post Equilibrium Valid
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest">
                      <AlertCircle size={12} /> {Math.max(totalDebit, totalCredit) <= 0 ? 'Amount Required' : 'Variance Detected'}
                    </div>
                  )}
                  <div className="flex gap-4 items-center">
                    <button type="button" onClick={onCancel} className="text-[9px] font-semibold text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Discard</button>
                    <button 
                      disabled={loading || !isBalanced || Math.max(totalDebit, totalCredit) <= 0}
                      type="submit"
                      className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg active:scale-95 disabled:grayscale disabled:opacity-50 flex items-center gap-2"
                    >
                      <Save size={14} /> {loading ? 'Processing...' : (editingVoucher ? 'Update Transaction' : 'Post Voucher')}
                    </button>
                  </div>
                </div>

                <div className="absolute top-0 right-0 p-4 opacity-[0.02] scale-[3] rotate-12 pointer-events-none">
                  <CheckCircle2 size={48} />
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

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
    </>
  );
}
