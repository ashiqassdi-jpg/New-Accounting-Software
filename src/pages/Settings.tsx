/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Briefcase, 
  ShieldAlert, 
  Trash2, 
  Save,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Settings() {
  const { profile, refreshProfile, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Profile state
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [designation, setDesignation] = useState(profile?.designation || '');
  const [joiningDate, setJoiningDate] = useState(profile?.joining_date || '');

  // Reset state
  const [confirmReset, setConfirmReset] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);

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

    if (error) {
      alert(error.message);
    } else {
      setSuccess(true);
      refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    }
    setLoading(false);
  };

  const handleWipeData = async () => {
    if (confirmReset !== 'WIPE ALL DATA') return;
    setLoading(true);

    try {
      // In a real app, you'd use a RPC or specialized service role to wipe across all companies
      // For this demo, we'll wipe companies (CASCADE will handle vouchers, accounts, etc if configured)
      const { error } = await supabase.from('companies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (error) throw error;
      alert('All system data has been wiped successfully.');
      window.location.reload();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-12 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
          Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your personal information and system preferences
        </p>
      </div>

      {/* Profile Section */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <User className="text-indigo-600" size={20} />
          </div>
          <h2 className="font-bold text-gray-800">My Profile</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+880 1XXX XXXXXX"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Chief Accountant"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Joining Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Role Security</label>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input 
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm cursor-not-allowed text-slate-400 font-bold"
                  value={profile?.role || ''}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
              <textarea 
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none h-24"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Residential address"
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50"
            >
              {success ? <CheckCircle2 size={18} /> : <Save size={18} />}
              {loading ? 'Saving...' : success ? 'Profile Updated' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Danger Zone */}
      {isSuperAdmin && (
        <section className="bg-white rounded-[2rem] border border-rose-100 overflow-hidden shadow-2xl shadow-rose-100/20">
          <div className="px-10 py-8 border-b border-rose-50 flex items-center gap-3 bg-rose-50/30">
            <div className="bg-rose-100 p-2 rounded-xl">
              <ShieldAlert className="text-rose-600" size={20} />
            </div>
            <h2 className="font-bold text-rose-900">Permanent System Reset</h2>
          </div>

          <div className="p-10 space-y-8">
            <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100/50">
              <p className="text-sm text-rose-700 leading-relaxed">
                This action is <strong>irreversible</strong>. It will permanently delete all companies, accounts, ledgers, vouchers, and transaction records from the system.
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-rose-400 uppercase tracking-widest block pl-1">
                Type <span className="text-rose-600 underline">WIPE ALL DATA</span> to confirm
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  className="flex-1 bg-white border border-rose-200 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono text-sm tracking-widest placeholder:tracking-normal"
                  value={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.value)}
                  placeholder="Verification text"
                />
                <button 
                  onClick={handleWipeData}
                  disabled={confirmReset !== 'WIPE ALL DATA' || loading}
                  className="flex items-center justify-center gap-2 bg-rose-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-rose-700 transition-all shadow-xl shadow-rose-100 active:scale-95 disabled:opacity-30 disabled:active:scale-100"
                >
                  <Trash2 size={20} />
                  Critical Reset
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
