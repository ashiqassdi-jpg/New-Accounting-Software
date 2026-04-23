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
  Shield
} from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'COMPANY' | 'USERS'>('PROFILE');
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
          <h1 className="text-3xl font-black text-slate-900 font-sans tracking-tight uppercase">
            System Infrastructure
          </h1>
          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">
            Policy configuration & core administrative parameters
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner w-fit no-print">
        <button 
          onClick={() => setActiveTab('PROFILE')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
            activeTab === 'PROFILE' ? "bg-white text-slate-900 shadow-md border border-slate-100" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Identity
        </button>
        <button 
          onClick={() => setActiveTab('COMPANY')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
            activeTab === 'COMPANY' ? "bg-white text-slate-900 shadow-md border border-slate-100" : "text-slate-400 hover:text-slate-600"
          )}
        >
          Entity Config
        </button>
        {isSuperAdmin && (
          <button 
            onClick={() => setActiveTab('USERS')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest",
              activeTab === 'USERS' ? "bg-white text-slate-900 shadow-md border border-slate-100" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Access Control
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
              <section className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <User className="text-indigo-600" size={20} />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest">Authentication Profile</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Personal Identity Verification</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Full Legal Name</label>
                      <input 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-slate-700 underline-offset-4 decoration-indigo-500/30"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Contact Protocol</label>
                      <input 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-slate-700"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Organizational Title</label>
                      <input 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-slate-700 italic"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Commission Entry</label>
                      <input 
                        type="date"
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-slate-700"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Domicile Address</label>
                      <textarea 
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black text-slate-700 resize-none h-24"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Verified headquarters or residence..."
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-fit flex items-center justify-center gap-3 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100 active:scale-95 disabled:opacity-50"
                  >
                    {success === 'profile' ? <CheckCircle2 size={16} /> : <Save size={16} />}
                    {success === 'profile' ? 'Profile Synchronized' : 'Sync Identity Data'}
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
                <section className="lg:col-span-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                  <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                        <Building2 className="text-emerald-600" size={24} />
                      </div>
                      <div>
                        <h2 className="font-black text-slate-900 text-sm uppercase tracking-tight">{selectedCompany.name}</h2>
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-0.5">Entity Meta-Configuration</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-50">
                    <form onSubmit={handleUpdateCompany} className="bg-white p-10 space-y-10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <Calendar size={12} /> Fiscal Baseline
                          </label>
                          <input 
                            type="date"
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            value={fiscalYear}
                            onChange={(e) => setFiscalYear(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                            <Coins size={12} /> Unit ISO Symbol
                          </label>
                          <input 
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3.5 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Operational State</label>
                          <select 
                            className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            <option value="ACTIVE">System Active</option>
                            <option value="CLOSED">Period Terminated</option>
                            <option value="AUDITED">Verification Locked</option>
                          </select>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transform active:scale-[0.98] transition-all hover:bg-slate-900 shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
                      >
                        <Save size={16} /> Apply Entity Changes
                      </button>
                    </form>

                    <div className="bg-white p-10 flex flex-col gap-8 justify-center">
                      <div className="space-y-8">
                        {canManageCompanies && (
                          <div className="bg-amber-50/30 p-8 rounded-[2rem] border border-amber-100">
                             <div className="flex items-center gap-3 mb-6">
                                <Trash2 size={16} className="text-amber-600" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-900">Selective Purge</h3>
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold uppercase mb-4 tracking-tight leading-relaxed">Reset all financial footprint for <strong>{selectedCompany.name}</strong>. All vouchers and ledgers will be erased.</p>
                             <div className="space-y-3">
                                <input 
                                  className="w-full bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:border-amber-500 placeholder:text-amber-200"
                                  placeholder={`Type "${selectedCompany.name}"`}
                                  value={confirmCompanyReset}
                                  onChange={(e) => setConfirmCompanyReset(e.target.value)}
                                />
                                <button 
                                  disabled={confirmCompanyReset !== selectedCompany.name || loading}
                                  onClick={handleWipeCompanyData}
                                  className="w-full bg-amber-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-700 disabled:opacity-20 transition-all shadow-lg shadow-amber-100"
                                >
                                  Execute Purge Protocol
                                </button>
                             </div>
                          </div>
                        )}

                        {canWipeData && (
                          <div className="bg-rose-50/30 p-8 rounded-[2rem] border border-rose-100">
                             <div className="flex items-center gap-3 mb-6">
                                <ShieldAlert size={16} className="text-rose-600" />
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-900">Platform Reset</h3>
                             </div>
                             <div className="space-y-3">
                                <input 
                                  className="w-full bg-white border border-rose-200 rounded-xl px-4 py-2.5 text-[11px] font-mono font-black outline-none focus:border-rose-500 uppercase placeholder:text-rose-200"
                                  placeholder="WIPE ENTIRE SYSTEM"
                                  value={confirmGlobalReset}
                                  onChange={(e) => setConfirmGlobalReset(e.target.value.toUpperCase())}
                                />
                                <button 
                                  disabled={confirmGlobalReset !== 'WIPE ENTIRE SYSTEM' || loading}
                                  onClick={handleGlobalWipe}
                                  className="w-full bg-rose-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-900 disabled:opacity-20 transition-all shadow-lg shadow-rose-100"
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
              <div className="py-40 flex flex-col items-center justify-center space-y-6">
                <div className="p-8 bg-slate-50 rounded-full text-slate-200">
                   <Building2 size={64} />
                </div>
                <p className="font-black uppercase tracking-[0.3em] text-xs text-slate-300">Entity Buffer Empty</p>
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
      </AnimatePresence>
    </div>
  );
}
