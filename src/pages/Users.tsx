/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Shield, UserPlus, Search, UserCheck, ShieldAlert, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function UserManagement() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('name');
    setProfiles(data || []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name');
    setCompanies(data || []);
  };

  useEffect(() => {
    fetchProfiles();
    fetchCompanies();
  }, []);

  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        role: editingUser.role,
        companies: editingUser.companies,
        can_add: editingUser.can_add,
        can_edit: editingUser.can_edit,
        can_delete: editingUser.can_delete,
        name: editingUser.name,
        phone: editingUser.phone,
        address: editingUser.address
      })
      .eq('id', editingUser.id);

    if (error) {
      alert(error.message);
    } else {
      setEditingUser(null);
      fetchProfiles();
    }
  };

  const toggleCompany = (companyId: string) => {
    if (!editingUser) return;
    const current = editingUser.companies || [];
    const updated = current.includes(companyId)
      ? current.filter(id => id !== companyId)
      : [...current, companyId];
    setEditingUser({ ...editingUser, companies: updated });
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
              <button 
                onClick={() => setEditingUser(p)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100"
              >
                <Shield size={14} /> Manage Access
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Permissions Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden my-8"
            >
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg">
                    {editingUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{editingUser.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Policy Assignment cockpit</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdatePermissions} className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* User Details */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Personal Info</label>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Display Name</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                          value={editingUser.phone || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Address</label>
                        <textarea 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium h-20 resize-none"
                          value={editingUser.address || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1 pt-4">Base Access Role</label>
                    <div className="grid grid-cols-1 gap-3">
                      {(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditingUser({ ...editingUser, role: r })}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                            editingUser.role === r 
                              ? "border-indigo-600 bg-indigo-50/30" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div>
                            <p className={cn("text-sm font-bold", editingUser.role === r ? "text-indigo-600" : "text-slate-700")}>
                              {r.replace('_', ' ')}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {r === 'SUPER_ADMIN' ? 'Full System Architect' : r === 'ADMIN' ? 'Business Administrator' : 'Standard Operations'}
                            </p>
                          </div>
                          {editingUser.role === r && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permissions Toggles */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Action Constraints</label>
                    <div className="bg-slate-50/50 p-6 rounded-3xl space-y-6 border border-slate-100">
                      <PermissionToggle 
                        label="Can Add Records" 
                        description="Ability to create new vouchers and ledgers"
                        active={editingUser.can_add !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_add: !editingUser.can_add })}
                      />
                      <PermissionToggle 
                        label="Can Edit Records" 
                        description="Ability to modify historical transactions"
                        active={editingUser.can_edit !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_edit: !editingUser.can_edit })}
                      />
                      <PermissionToggle 
                        label="Can Delete Records" 
                        description="Critical: Permanent removal of data"
                        active={editingUser.can_delete !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_delete: !editingUser.can_delete })}
                        danger
                      />
                    </div>
                  </div>
                </div>

                {/* Company Access */}
                <div className="space-y-4 pt-6 mt-6 border-t border-slate-50">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Organizational Purview</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCompany(c.id)}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-xs font-bold transition-all text-center",
                          editingUser.companies?.includes(c.id)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-10 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-8 py-4 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel Changes
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-12 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                  >
                    Apply New Policy
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

function PermissionToggle({ label, description, active, onClick, danger }: any) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className={cn("text-[11px] font-black uppercase tracking-tight", danger && active ? "text-rose-600" : "text-slate-900")}>{label}</p>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{description}</p>
      </div>
      <button 
        type="button"
        onClick={onClick}
        className={cn(
          "w-12 h-6 rounded-full transition-all relative",
          active ? (danger ? "bg-rose-500" : "bg-emerald-500") : "bg-slate-200"
        )}
      >
        <div className={cn(
          "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
          active ? "left-7" : "left-1"
        )} />
      </button>
    </div>
  );
}
