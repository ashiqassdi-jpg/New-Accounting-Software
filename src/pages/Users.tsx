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
          <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            User Access
          </h1>
          <p className="text-gray-500 mt-1">
            Manage user roles and system permissions
          </p>
        </div>
        <button 
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <UserPlus size={20} />
          <span>Invite User</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            placeholder="Search users by name or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProfiles.map((p) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {p.name.charAt(0)}
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider",
                p.role === 'SUPER_ADMIN' ? "bg-purple-50 text-purple-600" :
                p.role === 'ADMIN' ? "bg-indigo-50 text-indigo-600" :
                "bg-emerald-50 text-emerald-600"
              )}>
                {p.role.replace('_', ' ')}
              </span>
            </div>

            <h3 className="font-bold text-gray-900">{p.name}</h3>
            <p className="text-sm text-gray-500">{p.designation || 'Staff Member'}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Mail size={14} />
                <span className="truncate">User ID: {p.id.substring(0, 8)}...</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield size={14} />
                <span>Level {p.role === 'SUPER_ADMIN' ? '3' : p.role === 'ADMIN' ? '2' : '1'} Access</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Modify Role</label>
            </div>
            <select 
              className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
              value={p.role}
              onChange={(e) => updateRole(p.id, e.target.value as UserRole)}
            >
              <option value="MODERATOR">Moderator (View/Enter)</option>
              <option value="ADMIN">Admin (Manage Transactions)</option>
              <option value="SUPER_ADMIN">Super Admin (Full Access)</option>
            </select>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
