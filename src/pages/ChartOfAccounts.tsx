/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, ListTree, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Search, 
  Download, FileText, Printer, X, Filter
} from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Account } from '../types';
import { ACCOUNT_GROUPS, formatBDT } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function ChartOfAccounts() {
  const { selectedCompany } = useCompany();
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ASSET');
  const [searchQuery, setSearchQuery] = useState('');
  const [balanceRange, setBalanceRange] = useState({ min: '', max: '' });
  const [deepFilterType, setDeepFilterType] = useState<string>('ALL');

  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<Account['type']>('ASSET');

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

  const openModal = (account?: Account, defaultType?: string) => {
    if (isModerator) return;
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setCode(account.code);
      setType(account.type);
    } else {
      setEditingAccount(null);
      setName('');
      
      const nextType = (defaultType || activeTab) as Account['type'];
      setType(nextType);
      
      const groupPrefix = nextType === 'ASSET' ? '1' : 
                          nextType === 'LIABILITY' ? '2' : 
                          nextType === 'EQUITY' ? '3' : 
                          nextType === 'INCOME' ? '4' : '5';
      
      const groupAccounts = accounts.filter(a => a.type === nextType);
      const lastCode = groupAccounts.length > 0 ? [...groupAccounts].sort((a,b) => b.code.localeCompare(a.code))[0].code : `${groupPrefix}000`;
      const nextCode = (parseInt(lastCode) + 1).toString();
      
      setCode(nextCode);
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
      };

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update(accountData)
          .eq('id', editingAccount.id);
        if (error) throw error;
        toast.success('Ledger Refined', { description: `${name} has been updated.` });
      } else {
        const { error } = await supabase
          .from('accounts')
          .insert([accountData]);
        if (error) throw error;
        toast.success('New Ledger Registered', { description: `Successfully added ${name} to the chart.` });
      }

      setIsModalOpen(false);
      await fetchAccounts();
    } catch (error: any) {
      toast.error('Sync Error', { description: error.message || 'An error occurred while saving the ledger.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isModerator) return;
    
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    if (Math.abs(account.current_balance) > 0.001) {
      toast.warning('Account Locked', { 
        description: 'This ledger has an active balance and cannot be purged.'
      });
      return;
    }

    setLoading(true);
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('account_id', id);

    if (count && count > 0) {
      toast.warning('Integrity Violation', { 
        description: `This ledger has historical transactions linked to it.`
      });
      setLoading(false);
      return;
    }

    if (!confirm(`Permanently delete ledger "${account.name}"?`)) {
      setLoading(false);
      return;
    }
    
    const { error } = await supabase.from('accounts').delete().eq('id', id);
    if (error) {
      toast.error('Deletion Failed');
    } else {
      toast.success('Ledger Removed');
      fetchAccounts();
    }
    setLoading(false);
  };

  const activeGroup = ACCOUNT_GROUPS.find(g => g.value === activeTab);
  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || acc.code.includes(searchQuery);
    const matchesTab = deepFilterType === 'ALL' ? acc.type === activeTab : true;
    const matchesDeepType = deepFilterType !== 'ALL' ? acc.type === deepFilterType : true;
    
    // Balance range check
    const balance = acc.current_balance || 0;
    const matchesMinAmount = balanceRange.min === '' || balance >= parseFloat(balanceRange.min);
    const matchesMaxAmount = balanceRange.max === '' || balance <= parseFloat(balanceRange.max);

    return matchesSearch && matchesTab && matchesDeepType && matchesMinAmount && matchesMaxAmount;
  });

  const totalGroupBalance = accounts
    .filter(acc => acc.type === activeTab)
    .reduce((sum, acc) => sum + (acc.current_balance || 0), 0);

  const handleExportExcel = () => {
    const data = accounts.map(acc => ({
      Type: acc.type,
      Code: acc.code,
      'Account Name': acc.name,
      'Balance': acc.current_balance
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "COA");
    XLSX.writeFile(wb, `chart_of_accounts_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 font-sans tracking-tight leading-none text-center md:text-left">
            Chart of Accounts
          </h1>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium uppercase tracking-widest leading-none text-center md:text-left">
            Vanguard Ledger Architecture
          </p>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-2 no-print">
          <button onClick={() => window.print()} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
            <Printer size={16} />
          </button>
          <button onClick={handleExportExcel} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors shadow-sm">
            <Download size={16} />
          </button>
          {!isModerator && (
            <button 
              onClick={() => openModal()}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
            >
              <Plus size={16} /> New Ledger
            </button>
          )}
        </div>
      </div>

      {/* Navigation & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <aside className="space-y-4 no-print">
          <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            {ACCOUNT_GROUPS.map((group) => (
              <button
                key={group.value}
                onClick={() => setActiveTab(group.value)}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl transition-all",
                  activeTab === group.value 
                    ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                    : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <ListTree size={16} className={cn(activeTab === group.value ? "text-indigo-400" : "text-slate-300")} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{group.label}</span>
                </div>
                <div className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  activeTab === group.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {accounts.filter(a => a.type === group.value).length}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
            <div className="px-6 py-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input 
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                    placeholder={`Search ${activeGroup?.label.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-slate-300 uppercase tracking-widest">Displaying All Nodes</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr className="text-center md:text-left">
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Code</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Entity Descriptor</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Balance Pool</th>
                    {!isModerator && <th className="px-5 py-3 w-20"></th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(acc => (
                    <tr key={acc.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0 text-center md:text-left">
                      <td className="px-5 py-3 text-xs font-mono text-slate-400">{acc.code}</td>
                      <td className="px-5 py-3 text-xs font-semibold text-slate-800">{acc.name}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={cn(
                          "text-xs font-mono font-semibold tabular-nums",
                          acc.current_balance < 0 ? "text-rose-500" : "text-slate-700"
                        )}>
                          {formatBDT(acc.current_balance)}
                        </span>
                      </td>
                      {!isModerator && (
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(acc)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredAccounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-32 text-center">
                        <div className="flex flex-col items-center">
                          <ListTree className="text-slate-200 mb-4" size={48} />
                          <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.2em]">Void Ledger Path</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div 
            className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-slate-900 leading-none">
                  {editingAccount ? 'Refine Ledger' : 'Incorporate Ledger'}
                </h2>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Protocol Assignment Mode</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="grid grid-cols-5 gap-2 mb-4">
                {ACCOUNT_GROUPS.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setType(g.value as Account['type'])}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all group",
                      type === g.value ? "border-indigo-600 bg-indigo-50/50 shadow-md" : "border-slate-50 hover:border-slate-100"
                    )}
                  >
                    <ListTree size={16} className={cn(type === g.value ? "text-indigo-600 shadow-xl" : "text-slate-300 group-hover:text-slate-400")} />
                    <span className={cn("text-[8px] font-semibold uppercase tracking-widest", type === g.value ? "text-indigo-700" : "text-slate-400")}>{g.label.charAt(0)}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Ledger Identifier (Name)</label>
                  <input 
                    required
                    className="w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Accounts Receivable"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-1">Atomic Code</label>
                    <input 
                      required
                      className="w-full font-mono font-semibold tracking-widest text-slate-700"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="e.g. 1201"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">
                  Dismiss
                </button>
                <button 
                  disabled={loading}
                  type="submit"
                  className="flex-1 px-4 py-3 bg-slate-900 text-white text-[10px] font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-100 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (editingAccount ? 'Apply Changes' : 'Register Ledger')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
