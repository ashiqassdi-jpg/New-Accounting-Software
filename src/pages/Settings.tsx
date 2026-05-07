/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  ShieldAlert, 
  Trash2, 
  Save,
  CheckCircle2,
  Calendar,
  Building2,
  Globe,
  Coins,
  History,
  AlertCircle,
  Shield,
  Eye,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

import Dashboard from './Dashboard';
import Users from './Users';

import { toast } from 'sonner';

export default function Settings() {
  const { profile, refreshProfile, isSuperAdmin, canWipeData, canManageCompanies } = useAuth();
  const { selectedCompany, refreshCompanies } = useCompany();
  
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'COMPANY' | 'USERS' | 'RECYCLE_BIN'>('PROFILE');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  
  // Profile state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');

  // Company state
  const [fiscalYear, setFiscalYear] = useState('');
  const [currency, setCurrency] = useState('');
  const [status, setStatus] = useState<any>('ACTIVE');

  // Reset states
  const [confirmCompanyReset, setConfirmCompanyReset] = useState('');
  const [confirmGlobalReset, setConfirmGlobalReset] = useState('');

  // Sync state when profile or company changes
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setAddress(profile.address || '');
      setDesignation(profile.designation || '');
      setJoiningDate(profile.joining_date || '');
    }
  }, [profile]);

  useEffect(() => {
    if (selectedCompany) {
      setFiscalYear(selectedCompany.fiscal_year_start || '2024-01-01');
      setCurrency(selectedCompany.currency_symbol || '৳');
      setStatus(selectedCompany.financial_status || 'ACTIVE');
    }
  }, [selectedCompany]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name,
          phone,
          address,
          designation,
          joining_date: joiningDate || null
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success('Profile Updated', { description: 'Your personal information has been saved.' });
      await refreshProfile();
    } catch (error: any) {
      toast.error('Update Failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          fiscal_year_start: fiscalYear,
          currency_symbol: currency,
          financial_status: status
        })
        .eq('id', selectedCompany.id);

      if (error) throw error;
      
      toast.success('Company Updated', { description: 'Regional settings have been applied.' });
      await refreshCompanies();
    } catch (error: any) {
      toast.error('Update Failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleWipeCompanyData = async () => {
    if (!selectedCompany) return;
    if (confirmCompanyReset !== selectedCompany.name) {
      toast.error('Verification Failed', { description: 'Company name mismatch. Wipe aborted.' });
      return;
    }
    
    setLoading(true);

    try {
      // 1. Delete all vouchers (this will cascade delete all transactions)
      const { error: vError } = await supabase
        .from('vouchers')
        .delete()
        .eq('company_id', selectedCompany.id);

      if (vError) throw vError;
      
      // 2. Since all account balances are calculated from transactions (via trigger),
      // and we just deleted all vouchers/transactions, the current_balance 
      // should naturally go back to 0. 
      // All ledgers in this system are purely transactional.
      
      toast.success('Data Purged', { description: `Financial data for ${selectedCompany.name} has been erased.` });
      setConfirmCompanyReset('');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err: any) {
      toast.error('Wipe Failed', { description: err.message || 'Error occurred during data purge.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalWipe = async () => {
    if (confirmGlobalReset !== 'WIPE ENTIRE SYSTEM') {
      toast.error('Verification Failed', { description: 'Text mismatch. Global wipe aborted.' });
      return;
    }

    const firstConfirm = window.confirm("CRITICAL WARNING: You are about to initiate a TOTAL SYSTEM WIPE. This will delete all companies, users, transactions, and settings. Are you sure?");
    if (!firstConfirm) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000012345'); 
      
      if (error) throw error;
      toast.success('System Reset Successful', { description: 'Factory default state restored.' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error('Operation Failed', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl space-y-10 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-sans tracking-tight uppercase">
            System Infrastructure
          </h1>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-[0.2em]">
            Policy configuration & core administrative parameters
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-fit no-print">
        <button 
          onClick={() => setActiveTab('PROFILE')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
            activeTab === 'PROFILE' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-900"
          )}
        >
          Identity
        </button>
        <button 
          onClick={() => setActiveTab('COMPANY')}
          className={cn(
            "px-6 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest",
            activeTab === 'COMPANY' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-slate-500 hover:text-slate-900"
          )}
        >
          Entity Config
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('RECYCLE_BIN')}
            className={cn(
              "px-6 py-2 rounded-lg text-[10px] font-bold transition-all uppercase tracking-widest flex items-center gap-2",
              activeTab === 'RECYCLE_BIN' ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm" : "text-rose-500 hover:text-rose-600"
            )}
          >
            <History size={14} /> Recycle Bin
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'PROFILE' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <section className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-4">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <User className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-slate-100 text-[10px] uppercase tracking-widest">Authentication Profile</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Personal Identity Verification</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Legal Name</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Contact Protocol</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Organizational Title</label>
                      <input 
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Commission Entry</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-200"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Domicile Address</label>
                      <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-slate-200 resize-none h-24"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Verified headquarters or residence..."
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-fit flex items-center justify-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Save size={18} />
                    Sync Identity Data
                  </button>
                </form>
              </section>

              <div className="lg:col-span-5 space-y-8">
                <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-indigo-200 overflow-hidden relative">
                   <div className="absolute top-0 right-0 p-10 opacity-10">
                      <Shield size={160} />
                   </div>
                   <div className="relative z-10">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Security Level</span>
                      <h3 className="text-3xl font-black mt-2 mb-6 uppercase tracking-tighter">
                        {isSuperAdmin ? 'Root Architect' : 'System Operator'}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={14} className="text-indigo-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Full Ledger Oversight</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={14} className="text-indigo-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Audit Trail Visibility</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={14} className="text-indigo-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Master Encryption Key</span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'COMPANY' && (
          <motion.div
            key="company"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-10"
          >
            {selectedCompany ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <section className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden h-fit">
                  <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <Building2 className="text-emerald-600 dark:text-emerald-400" size={24} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-900 dark:text-slate-100 text-sm uppercase tracking-tight">{selectedCompany.name}</h2>
                        <p className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-0.5">Entity Meta-Configuration</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-50 dark:bg-slate-800">
                    <form onSubmit={handleUpdateCompany} className="bg-white dark:bg-slate-900 p-10 space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <Calendar size={12} /> Fiscal Baseline
                          </label>
                          <input 
                            type="date"
                            className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <Coins size={12} /> Unit ISO Symbol
                          </label>
                          <input 
                            className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-3.5 text-xs font-semibold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">Operational State</label>
                          <select 
                            className="w-full bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-4 text-[10px] font-semibold uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-slate-200"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            <option value="ACTIVE" className="bg-white dark:bg-slate-900">System Active</option>
                            <option value="CLOSED" className="bg-white dark:bg-slate-900">Period Terminated</option>
                            <option value="AUDITED" className="bg-white dark:bg-slate-900">Verification Locked</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-semibold text-[10px] uppercase tracking-[0.2em] transform active:scale-[0.98] transition-all hover:bg-slate-900 dark:hover:bg-indigo-500 shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-center gap-3"
                      >
                        <Save size={16} /> Apply Entity Changes
                      </button>
                    </form>

                    <div className="bg-white dark:bg-slate-900 p-10 flex flex-col gap-8 justify-center">
                      <div className="space-y-8">
                        {canManageCompanies && (
                          <div className="bg-amber-50/30 dark:bg-amber-900/10 p-8 rounded-[2rem] border border-amber-100 dark:border-amber-900/30">
                             <div className="flex items-center gap-3 mb-6">
                                <Trash2 size={16} className="text-amber-600 dark:text-amber-500" />
                                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-amber-900 dark:text-amber-400">Selective Purge</h3>
                             </div>
                             <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-4 tracking-tight leading-relaxed">Reset all financial footprint for <strong>{selectedCompany.name}</strong>. All vouchers and ledgers will be erased.</p>
                             <div className="space-y-3">
                                <input 
                                  className="w-full bg-white dark:bg-slate-950 border border-amber-200 dark:border-amber-900/50 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:border-amber-500 dark:focus:border-amber-400 placeholder:text-amber-200 dark:placeholder:text-amber-900/50 text-slate-900 dark:text-slate-100"
                                  placeholder={`Type "${selectedCompany.name}"`}
                                  value={confirmCompanyReset}
                                  onChange={(e) => setConfirmCompanyReset(e.target.value)}
                                />
                                <button 
                                  disabled={confirmCompanyReset !== selectedCompany.name || loading}
                                  onClick={handleWipeCompanyData}
                                  className="w-full bg-amber-600 text-white py-2.5 rounded-xl font-semibold text-[9px] uppercase tracking-widest hover:bg-amber-700 dark:hover:bg-amber-500 disabled:opacity-20 transition-all shadow-lg shadow-amber-100 dark:shadow-none"
                                >
                                  Execute Purge Protocol
                                </button>
                             </div>
                          </div>
                        )}

                        {canWipeData && (
                          <div className="bg-rose-50/30 dark:bg-rose-900/10 p-8 rounded-[2rem] border border-rose-100 dark:border-rose-900/30">
                             <div className="flex items-center gap-3 mb-6">
                                <ShieldAlert size={16} className="text-rose-600 dark:text-rose-500" />
                                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-rose-900 dark:text-rose-400">Platform Reset</h3>
                             </div>
                             <div className="space-y-3">
                                <input 
                                  className="w-full bg-white dark:bg-slate-950 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-2.5 text-[11px] font-mono font-black outline-none focus:border-rose-500 dark:focus:border-rose-400 uppercase placeholder:text-rose-200 dark:placeholder:text-rose-900/50 text-slate-900 dark:text-slate-100"
                                  placeholder="WIPE ENTIRE SYSTEM"
                                  value={confirmGlobalReset}
                                  onChange={(e) => setConfirmGlobalReset(e.target.value.toUpperCase())}
                                />
                                <button 
                                  disabled={confirmGlobalReset !== 'WIPE ENTIRE SYSTEM' || loading}
                                  onClick={handleGlobalWipe}
                                  className="w-full bg-rose-600 text-white py-2.5 rounded-xl font-semibold text-[9px] uppercase tracking-widest hover:bg-rose-900 dark:hover:bg-rose-500 disabled:opacity-20 transition-all shadow-lg shadow-rose-100 dark:shadow-none"
                                >
                                  Reset Infrastructure
                                </button>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-40 flex flex-col items-center justify-center space-y-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3rem]">
                <div className="p-8 bg-white dark:bg-slate-800 rounded-full text-slate-200 dark:text-slate-700 border border-slate-100 dark:border-slate-700 shadow-sm">
                   <Building2 size={64} />
                </div>
                <p className="font-black uppercase tracking-[0.3em] text-xs text-slate-300 dark:text-slate-600">Entity Buffer Empty</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'USERS' && isSuperAdmin && (
          <motion.div
            key="users"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Users />
          </motion.div>
        )}
        {activeTab === 'RECYCLE_BIN' && isSuperAdmin && (
          <motion.div
            key="recycle_bin"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <RecycleBin />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RecycleBin() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [deletedCompanies, setDeletedCompanies] = useState<any[]>([]);
  const [deletedAccounts, setDeletedAccounts] = useState<any[]>([]);
  const [deletedVouchers, setDeletedVouchers] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'COMPANIES' | 'ACCOUNTS' | 'VOUCHERS'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companiesRes, accountsRes, vouchersRes] = await Promise.all([
        supabase.from('companies').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('accounts').select('*, companies(name)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('vouchers').select('*, companies(name), items:transactions(*)').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
      ]);

      setDeletedCompanies(companiesRes.data || []);
      setDeletedAccounts(accountsRes.data || []);
      setDeletedVouchers(vouchersRes.data || []);
    } catch (error) {
      console.error('Error fetching recycle bin:', error);
      toast.error('Fetch Failed', { description: 'Could not retrieve deleted items.' });
    } finally {
      setLoading(false);
    }
  };

  const [previewItem, setPreviewItem] = useState<{type: string, data: any} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const handleRestore = async (type: 'company' | 'account' | 'voucher', id: string, name: string) => {
    const confirmed = window.confirm(`Restore "${name}" to active records?`);
    if (!confirmed) return;

    try {
      let table = '';
      if (type === 'company') table = 'companies';
      else if (type === 'account') table = 'accounts';
      else if (type === 'voucher') table = 'vouchers';

      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
      if (error) throw error;

      if (type === 'voucher') {
        // Also restore transactions
        await supabase.from('transactions').update({ deleted_at: null }).eq('voucher_id', id);
      }

      toast.success('Record Restored', { description: `"${name}" is now active again.` });
      fetchData();
    } catch (error: any) {
      toast.error('Restore Failed', { description: error.message });
    }
  };

  const handlePurge = async (type: 'company' | 'account' | 'voucher', id: string, name: string) => {
    const firstConfirm = window.confirm(`CRITICAL: Purge "${name}" permanently? This cannot be undone.`);
    if (!firstConfirm) return;
    
    const secondConfirm = window.confirm(`FINAL WARNING: Information associated with "${name}" will be erased from existence. Proceed?`);
    if (!secondConfirm) return;

    try {
      let table = '';
      if (type === 'company') table = 'companies';
      else if (type === 'account') table = 'accounts';
      else if (type === 'voucher') table = 'vouchers';

      // For vouchers, transactions will be deleted by Cascade (if set) or we handle it
      if (type === 'voucher') {
        await supabase.from('transactions').delete().eq('voucher_id', id);
      }

      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;

      toast.success('Record Purged', { description: `"${name}" has been permanently erased.` });
      fetchData();
    } catch (error: any) {
      toast.error('Purge Failed', { description: error.message });
    }
  };

  return (
    <div className="space-y-8">
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <Eye className="text-slate-400 dark:text-slate-500" size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Full Record Preview</h3>
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">{previewItem.type} Audit</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar">
                {previewItem.type === 'VOUCHER' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Reference ID</span>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">{previewItem.data.voucher_no}</p>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Temporal Marker</span>
                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">{format(new Date(previewItem.data.date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Ledger Dispersal</span>
                      <div className="space-y-4">
                        {previewItem.data.items?.map((item: any, idx: number) => (
                           <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100/50 dark:border-slate-800/50 last:border-0">
                              <div>
                                 <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 uppercase">{item.account_name || 'Processing Account...'}</p>
                                 <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">{item.narration || 'No annotation'}</p>
                              </div>
                              <div className="text-right">
                                 {item.debit > 0 && <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.debit.toLocaleString()}</p>}
                                 {item.credit > 0 && <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400">{item.credit.toLocaleString()}</p>}
                              </div>
                           </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase leading-relaxed italic border-l border-slate-200 dark:border-slate-700 pl-4 py-1">
                      System Metadata: Deleted on {format(new Date(previewItem.data.deleted_at), 'dd MMM yyyy p')} from entity "{previewItem.data.companies?.name}"
                    </div>
                  </div>
                )}

                {previewItem.type === 'ACCOUNT' && (
                  <div className="space-y-8">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Ledger Identity</span>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{previewItem.data.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                       <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Classification</span>
                          <p className="text-sm font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">{previewItem.data.type}</p>
                       </div>
                       <div className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Exit Balance</span>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-widest">{previewItem.data.current_balance.toLocaleString()}</p>
                       </div>
                    </div>
                  </div>
                )}

                {previewItem.type === 'ENTITY' && (
                  <div className="space-y-8">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Entity Designation</span>
                      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{previewItem.data.name}</p>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 p-8 rounded-3xl space-y-4 border border-slate-100 dark:border-slate-800">
                       <div className="flex justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Operational Status</span>
                          <span className="text-[9px] font-bold text-indigo-500 uppercase">{previewItem.data.financial_status}</span>
                       </div>
                       <div className="flex justify-between">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Currency Base</span>
                          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase">{previewItem.data.currency_symbol}</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-10 border-t border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => {
                    if (previewItem.type === 'VOUCHER') handleRestore('voucher', previewItem.data.id, previewItem.data.voucher_no);
                    else if (previewItem.type === 'ACCOUNT') handleRestore('account', previewItem.data.id, previewItem.data.name);
                    else handleRestore('company', previewItem.data.id, previewItem.data.name);
                    setPreviewItem(null);
                  }}
                  className="flex items-center justify-center gap-3 bg-indigo-500 text-white py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md shadow-indigo-100 dark:shadow-none"
                >
                  <History size={16} /> Restore Record
                </button>
                <button 
                  onClick={() => {
                    if (previewItem.type === 'VOUCHER') handlePurge('voucher', previewItem.data.id, previewItem.data.voucher_no);
                    else if (previewItem.type === 'ACCOUNT') handlePurge('account', previewItem.data.id, previewItem.data.name);
                    else handlePurge('company', previewItem.data.id, previewItem.data.name);
                    setPreviewItem(null);
                  }}
                  className="flex items-center justify-center gap-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                >
                  <Trash2 size={16} /> Purge Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-2xl border border-rose-100 dark:border-rose-500/20">
            <History className="text-rose-600 dark:text-rose-400" size={24} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Digital Purgatory</h2>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Recycle Bin Management</p>
          </div>
        </div>
        <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
          <FilterButton active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} label="All" count={deletedCompanies.length + deletedAccounts.length + deletedVouchers.length} />
          <FilterButton active={activeFilter === 'COMPANIES'} onClick={() => setActiveFilter('COMPANIES')} label="Entities" count={deletedCompanies.length} />
          <FilterButton active={activeFilter === 'ACCOUNTS'} onClick={() => setActiveFilter('ACCOUNTS')} label="Accounts" count={deletedAccounts.length} />
          <FilterButton active={activeFilter === 'VOUCHERS'} onClick={() => setActiveFilter('VOUCHERS')} label="Vouchers" count={deletedVouchers.length} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="py-40 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-r-transparent mb-4"></div>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Synchronizing with Purgatory...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-10 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Item Information</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Origin Entity</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Temporal Exit</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {(activeFilter === 'ALL' || activeFilter === 'COMPANIES') && deletedCompanies.map(c => (
                  <RecycleItem 
                    key={c.id} 
                    item={c} 
                    type="ENTITY" 
                    name={c.name} 
                    origin="Platform" 
                    onRestore={() => handleRestore('company', c.id, c.name)}
                    onPurge={() => handlePurge('company', c.id, c.name)}
                    onPreview={() => setPreviewItem({ type: 'ENTITY', data: c })}
                  />
                ))}
                {(activeFilter === 'ALL' || activeFilter === 'ACCOUNTS') && deletedAccounts.map(a => (
                  <RecycleItem 
                    key={a.id} 
                    item={a} 
                    type="ACCOUNT" 
                    name={a.name} 
                    origin={a.companies?.name || 'Unknown'} 
                    onRestore={() => handleRestore('account', a.id, a.name)}
                    onPurge={() => handlePurge('account', a.id, a.name)}
                    onPreview={() => setPreviewItem({ type: 'ACCOUNT', data: a })}
                  />
                ))}
                {(activeFilter === 'ALL' || activeFilter === 'VOUCHERS') && deletedVouchers.map(v => (
                  <RecycleItem 
                    key={v.id} 
                    item={v} 
                    type="VOUCHER" 
                    name={v.voucher_no} 
                    origin={v.companies?.name || 'Unknown'} 
                    onRestore={() => handleRestore('voucher', v.id, v.voucher_no)}
                    onPurge={() => handlePurge('voucher', v.id, v.voucher_no)}
                    onPreview={() => setPreviewItem({ type: 'VOUCHER', data: v })}
                  />
                ))}
                {deletedCompanies.length === 0 && deletedAccounts.length === 0 && deletedVouchers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-40 text-center">
                      <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-800">
                        <History className="text-slate-200 dark:text-slate-700" size={32} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] italic">Purgatory is currently vacant</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function RecycleItem({ type, name, origin, item, onRestore, onPurge, onPreview }: any) {
  return (
    <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all">
      <td className="px-10 py-5">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
            type === 'ENTITY' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
            type === 'ACCOUNT' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" :
            "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
          )}>
            <History size={18} />
          </div>
          <div>
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{type}</span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">{name}</p>
          </div>
        </div>
      </td>
      <td className="px-10 py-5">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{origin}</span>
      </td>
      <td className="px-10 py-5">
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{item.deleted_at ? format(new Date(item.deleted_at), 'dd MMM yyyy p') : 'N/A'}</span>
      </td>
      <td className="px-10 py-5">
         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
           <button 
             onClick={onPreview}
             className="p-2.5 text-slate-600 bg-slate-50 hover:bg-slate-100 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm"
             title="Preview Item"
           >
             <Eye size={16} />
           </button>
           <button 
             onClick={onRestore}
             className="p-2.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 rounded-xl transition-all shadow-sm"
             title="Restore Item"
           >
             <History size={16} />
           </button>
           <button 
             onClick={onPurge}
             className="p-2.5 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-all shadow-sm"
             title="Purge Permanently"
           >
             <Trash2 size={16} />
           </button>
         </div>
      </td>
    </tr>
  );
}

function FilterButton({ active, onClick, label, count }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
        active 
          ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-100 dark:border-slate-600" 
          : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
      )}
    >
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded text-[8px] font-black",
        active ? "bg-indigo-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
      )}>
        {count}
      </span>
    </button>
  );
}
