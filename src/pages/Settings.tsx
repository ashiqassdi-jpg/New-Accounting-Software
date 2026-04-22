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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Settings() {
  const { profile, refreshProfile, isSuperAdmin } = useAuth();
  const { selectedCompany, refreshCompanies } = useCompany();
  
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
          joining_date: joiningDate
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setSuccess('profile');
      await refreshProfile();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.message);
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
      
      setSuccess('company');
      await refreshCompanies();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWipeCompanyData = async () => {
    if (!selectedCompany || confirmCompanyReset !== selectedCompany.name) return;
    setLoading(true);

    try {
      // 1. Delete all vouchers (this will cascade delete all transactions)
      const { error: vError } = await supabase
        .from('vouchers')
        .delete()
        .eq('company_id', selectedCompany.id);

      if (vError) throw vError;
      
      // 2. We need to reset the current_balance of all accounts back to their opening_balance
      // Since the JS SDK doesn't support col = other_col in bulk updates easily, we do a join-style update or a loop
      // For accounting, the accounts list is usually finite (<200), so a loop is safe.
      const { data: accounts, error: aError } = await supabase
        .from('accounts')
        .select('id, opening_balance')
        .eq('company_id', selectedCompany.id);
      
      if (aError) throw aError;

      if (accounts && accounts.length > 0) {
        const resetPromises = accounts.map(acc => 
          supabase
            .from('accounts')
            .update({ current_balance: acc.opening_balance })
            .eq('id', acc.id)
        );
        await Promise.all(resetPromises);
      }

      alert(`Financial data for ${selectedCompany.name} has been successfully purged. Ledgers have been reset to opening values.`);
      setConfirmCompanyReset('');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Error occurred during data purge.');
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalWipe = async () => {
    if (confirmGlobalReset !== 'WIPE ENTIRE SYSTEM') return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything except maybe a system record
      
      if (error) throw error;
      alert('The entire platform has been factory reset.');
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-12 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Control Center
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            System configuration and administrative parameters
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-10">
          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 bg-slate-50/50 flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-xl">
                <User className="text-indigo-600" size={18} />
              </div>
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-widest">Personal Profile</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Designation</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Residential Address</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium resize-none h-24"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {success === 'profile' ? <CheckCircle2 size={18} /> : <Save size={18} />}
                {success === 'profile' ? 'Profile Updated' : 'Update Profile'}
              </button>
            </form>
          </section>
        </div>

        {/* Main Settings Area */}
        <div className="lg:col-span-2 space-y-10">
          {/* Active Company Settings */}
          {selectedCompany && (
            <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50 p-3 rounded-2xl">
                    <Building2 className="text-emerald-600" size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-xl tracking-tight">{selectedCompany.name}</h2>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Operational Parameters</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleUpdateCompany} className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={12} /> Fiscal Year Start
                    </label>
                    <input 
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      value={fiscalYear}
                      onChange={(e) => setFiscalYear(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Coins size={12} /> Base Currency Symbol
                    </label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm">
                      <History className="text-slate-400" size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Status</p>
                      <p className="text-sm font-bold text-slate-700">{status}</p>
                    </div>
                  </div>
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active (Open for Entry)</option>
                    <option value="CLOSED">Closed (View Only)</option>
                    <option value="AUDITED">Audited (Immutable)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 ml-auto"
                >
                  <Save size={18} />
                  {success === 'company' ? 'Preference Saved' : 'Apply Settings'}
                </button>
              </form>
            </section>
          )}

          {/* Company Maintenance */}
          {isSuperAdmin && selectedCompany && (
            <section className="bg-white rounded-[2rem] border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b border-amber-50 bg-amber-50/20 flex items-center gap-4">
                <div className="bg-amber-100 p-2.5 rounded-xl">
                  <Trash2 className="text-amber-600" size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-amber-900">Company Maintenance</h2>
                  <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">Specific data erasure (Super Admin Only)</p>
                </div>
              </div>

              <div className="p-10 space-y-6">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  If you need to restart the financial tracking for <strong>{selectedCompany.name}</strong>, you can use the erase tool. This will remove all vouchers and transactions but keep your Chart of Accounts and Company profiles intact.
                </p>
                
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Confirm entity name to wipe</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold placeholder:font-normal outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
                      placeholder={`Type "${selectedCompany.name}"`}
                      value={confirmCompanyReset}
                      onChange={(e) => setConfirmCompanyReset(e.target.value)}
                    />
                  </div>
                  <button 
                    disabled={confirmCompanyReset !== selectedCompany.name || loading}
                    onClick={handleWipeCompanyData}
                    className="md:mt-5 bg-amber-50 text-amber-600 px-8 py-4 rounded-2xl font-bold hover:bg-amber-600 hover:text-white transition-all disabled:opacity-30 self-end"
                  >
                    Erase Financials
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Global Wipe */}
          {isSuperAdmin && (
            <section className="bg-white rounded-[2rem] border border-rose-100 shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b border-rose-50 bg-rose-50/30 flex items-center gap-4">
                <div className="bg-rose-100 p-2.5 rounded-xl">
                  <ShieldAlert className="text-rose-600" size={20} />
                </div>
                <h2 className="font-bold text-rose-900">Master Factory Reset</h2>
              </div>

              <div className="p-10 space-y-8">
                <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50">
                  <p className="text-sm text-rose-700 leading-relaxed font-semibold flex items-center gap-3">
                    <AlertCircle size={18} /> CRITICAL: This will destroy ALL organization data platform-wide.
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <input 
                    className="flex-1 bg-white border border-rose-200 rounded-2xl px-6 py-4 text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500"
                    placeholder="WIPE ENTIRE SYSTEM"
                    value={confirmGlobalReset}
                    onChange={(e) => setConfirmGlobalReset(e.target.value.toUpperCase())}
                  />
                  <button 
                    disabled={confirmGlobalReset !== 'WIPE ENTIRE SYSTEM' || loading}
                    onClick={handleGlobalWipe}
                    className="bg-rose-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 disabled:opacity-30"
                  >
                    Wipe Platform
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
