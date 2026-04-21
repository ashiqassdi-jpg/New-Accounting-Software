/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VoucherType, PaymentChannel, Account } from '../types';
import { VOUCHER_TYPES, PAYMENT_CHANNELS } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { motion, AnimatePresence } from 'motion/react';

interface VoucherItem {
  account_id: string;
  debit: number;
  credit: number;
}

interface VoucherFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function VoucherForm({ onSuccess, onCancel }: VoucherFormProps) {
  const { user } = useAuth();
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  // Voucher state
  const [type, setType] = useState<VoucherType>('PAYMENT');
  const [channel, setChannel] = useState<PaymentChannel>('CASH');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherNo, setVoucherNo] = useState('');
  const [narration, setNarration] = useState('');
  const [items, setItems] = useState<VoucherItem[]>([
    { account_id: '', debit: 0, credit: 0 }
  ]);

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

  const addItem = () => {
    setItems([...items, { account_id: '', debit: 0, credit: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof VoucherItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const totalDebit = items.reduce((sum, item) => sum + (Number(item.debit) || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (Number(item.credit) || 0), 0);
  const isBalanced = type === 'JOURNAL' ? totalDebit === totalCredit : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCompany) return;
    if (type === 'JOURNAL' && !isBalanced) return;
    if (items.some(i => !i.account_id)) return;

    setLoading(true);

    try {
      // 1. Create Voucher
      const { data: voucher, error: vError } = await supabase
        .from('vouchers')
        .insert([{
          company_id: selectedCompany.id,
          voucher_no: voucherNo || `V-${Date.now()}`,
          date,
          type,
          payment_channel: (type === 'PAYMENT' || type === 'RECEIPT' || type === 'CONTRA') ? channel : null,
          narration,
          amount: type === 'PAYMENT' ? totalDebit : totalCredit,
          created_by: user.id
        }])
        .select()
        .single();

      if (vError) throw vError;

      // 2. Create Transactions (Double Entry)
      const transactions = [];

      // Add line items
      for (const item of items) {
        transactions.push({
          voucher_id: voucher.id,
          company_id: selectedCompany.id,
          account_id: item.account_id,
          debit: item.debit,
          credit: item.credit,
          date
        });
      }

      // Add symmetric entry for Payment/Receipt/Contra based on channel
      if (type === 'PAYMENT' || type === 'RECEIPT' || type === 'CONTRA') {
        // Find the account corresponding to the payment channel
        const channelAccount = accounts.find(a => a.name.toUpperCase() === channel.toUpperCase());
        if (channelAccount) {
          transactions.push({
            voucher_id: voucher.id,
            company_id: selectedCompany.id,
            account_id: channelAccount.id,
            debit: type === 'RECEIPT' ? totalCredit : 0,
            credit: type === 'PAYMENT' ? totalDebit : 0,
            date
          });
        }
      }

      const { error: tError } = await supabase
        .from('transactions')
        .insert(transactions);

      if (tError) throw tError;

      onSuccess();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden"
    >
      <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h2 className="text-xl font-bold text-gray-900">New Accounting Voucher</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <Trash2 size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</label>
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={type}
              onChange={(e) => setType(e.target.value as VoucherType)}
            >
              {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {(type === 'PAYMENT' || type === 'RECEIPT' || type === 'CONTRA') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Channel</label>
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={channel}
                onChange={(e) => setChannel(e.target.value as PaymentChannel)}
              >
                {PAYMENT_CHANNELS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</label>
            <input 
              type="date"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Voucher No</label>
            <input 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              placeholder="Auto-generated if empty"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Narration / Notes</label>
          <textarea 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-20"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Describe the transaction..."
          />
        </div>

        {/* Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Line Items</h3>
            <button 
              type="button" 
              onClick={addItem}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <Plus size={14} /> Add Line
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-4 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Account</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={item.account_id}
                    onChange={(e) => updateItem(index, 'account_id', e.target.value)}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
                  </select>
                </div>
                
                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Debit</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={item.debit}
                    onChange={(e) => updateItem(index, 'debit', Number(e.target.value))}
                  />
                </div>

                <div className="w-32 space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Credit</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    value={item.credit}
                    onChange={(e) => updateItem(index, 'credit', Number(e.target.value))}
                  />
                </div>

                <button 
                  type="button" 
                  onClick={() => removeItem(index)}
                  className="p-2.5 text-gray-300 hover:text-red-500 transition-colors mb-0.5"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer with Totals */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Debit</span>
              <span className="text-xl font-bold text-gray-900">৳{totalDebit.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Credit</span>
              <span className="text-xl font-bold text-gray-900">৳{totalCredit.toLocaleString()}</span>
            </div>
            {type === 'JOURNAL' && (
              <div className="flex items-center">
                {isBalanced ? (
                  <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold">
                    <CheckCircle2 size={14} /> Balanced
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-3 py-1 rounded-full text-xs font-bold">
                    <AlertCircle size={14} /> Unbalanced
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button 
              disabled={loading || (type === 'JOURNAL' && !isBalanced)}
              type="submit"
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Voucher'}
            </button>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
