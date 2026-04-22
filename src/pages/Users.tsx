/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Shield, UserPlus, Search, UserCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function UserManagement() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const updateRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      alert(error.message);
    } else {
      fetchProfiles();
    }
  };

  const filteredProfiles = profiles.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.designation?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Security & Teams
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Granular control over organizational access
          </p>
        </div>
        <button 
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <UserPlus size={20} />
          <span>Invite Professional</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
            placeholder="Filter access pool by name or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProfiles.map((p) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
          >
            <div className="flex items-start justify-between mb-8">
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                {p.name.charAt(0)}
              </div>
              <span className={cn(
                "text-[10px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-widest flex items-center gap-1.5",
                p.role === 'SUPER_ADMIN' ? "bg-rose-50 text-rose-600" :
                p.role === 'ADMIN' ? "bg-indigo-50 text-indigo-600" :
                "bg-emerald-50 text-emerald-600"
              )}>
                <Shield size={12} />
                {p.role.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{p.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{p.designation || 'Specialist'}</p>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-widest">Access Level</span>
                <span className="text-xs font-bold text-slate-600">{p.role === 'SUPER_ADMIN' ? 'Tier 1' : p.role === 'ADMIN' ? 'Tier 2' : 'Tier 3'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-widest">Network ID</span>
                <span className="text-xs font-mono text-slate-400">#{p.id.substring(0, 4)}</span>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Configuration</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
                value={p.role}
                onChange={(e) => updateRole(p.id, e.target.value as UserRole)}
              >
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Administrator</option>
                <option value="SUPER_ADMIN">System Architect</option>
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
