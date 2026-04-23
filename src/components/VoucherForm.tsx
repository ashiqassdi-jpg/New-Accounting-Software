/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2, Printer, X, Eye, BookOpen } from 'lucide-react';
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl overflow-hidden"
      >
      <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{editingVoucher ? 'Edit Voucher' : 'Voucher Entry'}</h2>
          <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">{editingVoucher ? 'Modify platform history' : 'Double-Entry Simulation Mode'}</p>
        </div>
        <button onClick={onCancel} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-10 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Voucher Type</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
              value={type}
              onChange={(e) => setType(e.target.value as VoucherType)}
            >
              {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Method</label>
            <select 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
              value={channel}
              onChange={(e) => setChannel(e.target.value as PaymentChannel)}
            >
              {PAYMENT_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Entry Date</label>
            <input 
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Voucher Number</label>
              {!manualVoucherNo && (
                <button 
                  type="button"
                  onClick={() => setManualVoucherNo(true)}
                  className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-tighter"
                >
                  Manual Entry
                </button>
              )}
            </div>
            <input 
              className={cn(
                "w-full border rounded-2xl px-4 py-3 text-sm outline-none transition-all font-mono",
                manualVoucherNo ? "bg-white border-slate-300 focus:ring-2 focus:ring-indigo-500/10" : "bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed"
              )}
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              readOnly={!manualVoucherNo}
              placeholder="e.g. PV-001"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description / Narration</label>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none h-24"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="What is this transaction for?"
          />
        </div>

        {/* Improved Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Transaction Split</h3>
            <button 
              type="button" 
              onClick={addItem}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Row
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-bold text-slate-300 uppercase block pl-1">Ledger Account</label>
                  <select 
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700"
                    value={item.account_id}
                    onChange={(e) => updateItem(index, 'account_id', e.target.value)}
                  >
                    <option value="">Select Ledger from COA</option>
                    {ACCOUNT_GROUPS.map(group => (
                      <optgroup key={group.value} label={group.label}>
                        {accounts.filter(a => a.type === group.value).map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                
                <div className="w-40 space-y-2 relative">
                  <label className="text-[10px] font-bold text-slate-300 uppercase block pl-1">Debit (৳)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-indigo-50/10 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-900"
                    value={item.debit === 0 ? '' : item.debit}
                    onChange={(e) => updateItem(index, 'debit', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>

                <div className="w-40 space-y-2 relative">
                  <label className="text-[10px] font-bold text-slate-300 uppercase block pl-1">Credit (৳)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono font-bold text-slate-900"
                    value={item.credit === 0 ? '' : item.credit}
                    onChange={(e) => updateItem(index, 'credit', e.target.value === '' ? 0 : Number(e.target.value))}
                  />
                </div>

                <button 
                  type="button" 
                  onClick={() => removeItem(index)}
                  disabled={items.length <= 2}
                  className="p-3 text-slate-200 hover:text-rose-500 transition-colors disabled:opacity-0 mb-0.5"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Summary */}
        <div className="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex gap-10 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Debit</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tighter">{formatBDT(totalDebit)}</span>
            </div>
            <div className="w-px h-10 bg-slate-200 my-auto" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Credit</span>
              <span className="text-2xl font-bold text-slate-900 font-mono tracking-tighter">{formatBDT(totalCredit)}</span>
            </div>
            
            <div className="flex items-center ml-4">
              {isBalanced ? (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                  <CheckCircle2 size={16} /> Balanced
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider border border-rose-100">
                  <AlertCircle size={16} /> Unbalanced
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 md:flex-none px-8 py-3.5 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
            >
              Discard
            </button>
            <button 
              disabled={loading || !isBalanced}
              type="submit"
              className="flex-1 md:flex-none items-center justify-center gap-2 px-12 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <Save size={18} />
              {loading ? 'Processing...' : (editingVoucher ? 'Update Voucher' : 'Post Voucher')}
            </button>
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
