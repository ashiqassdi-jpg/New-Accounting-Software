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
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';

export default function Settings() {
  const { profile, refreshProfile, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Profile state
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [designation, setDesignation] = useState(profile?.designation || '');

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
        designation
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
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Chief Accountant"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role</label>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm cursor-not-allowed text-gray-500"
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
        <section className="bg-rose-50 rounded-2xl border border-rose-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-rose-100 flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-lg">
              <ShieldAlert className="text-rose-600" size={20} />
            </div>
            <h2 className="font-bold text-rose-900">Danger Zone</h2>
          </div>

          <div className="p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-900">Permanent System Reset</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Wipe all companies, vouchers, and transaction records. This action is irreversible.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest">
                Type 'WIPE ALL DATA' to confirm
              </p>
              <div className="flex flex-col md:flex-row gap-3">
                <input 
                  className="flex-1 bg-white border border-rose-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  value={confirmReset}
                  onChange={(e) => setConfirmReset(e.target.value)}
                  placeholder="Verification text"
                />
                <button 
                  onClick={handleWipeData}
                  disabled={confirmReset !== 'WIPE ALL DATA' || loading}
                  className="flex items-center justify-center gap-2 bg-rose-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-rose-700 transition-all disabled:opacity-30 disabled:hover:bg-rose-600"
                >
                  <Trash2 size={18} />
                  Wipe System Data
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
