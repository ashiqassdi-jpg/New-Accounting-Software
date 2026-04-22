/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, ListTree, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Account } from '../types';
import { ACCOUNT_GROUPS, formatBDT } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function ChartOfAccounts() {
  const { selectedCompany } = useCompany();
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE']);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<Account['type']>('ASSET');
  const [openingBalance, setOpeningBalance] = useState(0);

  const isModerator = profile?.role === 'MODERATOR';

  useEffect(() => {
    if (selectedCompany) {
      fetchAccounts();
    }
  }, [selectedCompany]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', selectedCompany!.id)
      .order('code');

    if (error) {
      console.error('Error fetching accounts:', error);
    } else {
      setAccounts(data || []);
    }
    setLoading(false);
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => 
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const openModal = (account?: Account) => {
    if (isModerator) return;
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setCode(account.code);
      setType(account.type);
      setOpeningBalance(account.opening_balance);
    } else {
      setEditingAccount(null);
      setName('');
      setCode('');
      setType('ASSET');
      setOpeningBalance(0);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isModerator || !selectedCompany) return;
    setLoading(true);

    try {
      const accountData = {
        company_id: selectedCompany.id,
        name,
        code,
        type,
        opening_balance: openingBalance,
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([accountData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await fetchAccounts();
    } catch (error: any) {
      alert(error.message || 'An error occurred while saving the ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isModerator) return;
    if (!confirm('Are you sure you want to delete this account? It will only work if there are no transactions linked to it.')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Cannot delete account. It might have existing transactions.');
    } else {
      fetchAccounts();
    }
    setLoading(false);
  };

  const groupedAccounts = ACCOUNT_GROUPS.map(group => ({
    ...group,
    list: accounts.filter(acc => acc.type === group.value && (
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.includes(searchQuery)
    ))
  }));

  const totalBalanceByGroup = (group: string) => {
    return accounts
      .filter(acc => acc.type === group)
      .reduce((sum, acc) => sum + (acc.opening_balance || 0), 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-slate-500 mt-1">
            Build and manage your professional ledger structure
          </p>
        </div>
        {!isModerator && (
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            <span>Add Ledger</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
          placeholder="Search by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4 pb-20">
        {groupedAccounts.map((group) => (
          <div key={group.value} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
            <button 
              onClick={() => toggleGroup(group.value)}
              className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-1.5 rounded-lg",
                  group.value === 'ASSET' && "bg-slate-100 text-slate-600",
                  group.value === 'LIABILITY' && "bg-rose-100 text-rose-600",
                  group.value === 'EQUITY' && "bg-amber-100 text-amber-600",
                  group.value === 'INCOME' && "bg-emerald-100 text-emerald-600",
                  group.value === 'EXPENSE' && "bg-indigo-100 text-indigo-600",
                )}>
                  {expandedGroups.includes(group.value) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {group.label}
                    <span className="text-[10px] font-bold bg-slate-200/50 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {group.list.length}
                    </span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">Opening sum: {formatBDT(totalBalanceByGroup(group.value))}</span>
                </div>
              </div>
            </button>

            <AnimatePresence>
              {expandedGroups.includes(group.value) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-slate-50">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="border-b border-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Opening Bal</th>
                            {!isModerator && <th className="px-4 py-3"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {group.list.map((acc) => (
                            <tr key={acc.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-sm font-mono text-slate-400">{acc.code}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-800">{acc.name}</td>
                              <td className="px-4 py-3 text-sm font-mono text-slate-900 text-right">{formatBDT(acc.opening_balance)}</td>
                              {!isModerator && (
                                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="flex items-center justify-end gap-1">
                                    <button 
                                      onClick={() => openModal(acc)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDelete(acc.id)}
                                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          {group.list.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm italic">
                                No ledgers found in this group
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingAccount ? 'Edit Ledger' : 'New Ledger'}
                </h2>
                <div className="text-slate-400 hover:text-slate-600 cursor-pointer" onClick={() => setIsModalOpen(false)}>
                  <Plus className="rotate-45" size={24} />
                </div>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Accounts Receivable"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Code</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-mono"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. 1201"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Group</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm"
                      value={type}
                      onChange={(e) => setType(e.target.value as Account['type'])}
                    >
                      {ACCOUNT_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={loading}
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
