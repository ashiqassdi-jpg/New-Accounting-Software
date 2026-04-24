/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Mail, Shield, UserPlus, Search, UserCheck, ShieldAlert, X, ChevronDown, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function UserManagement() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showDeepFilter, setShowDeepFilter] = useState(false);
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterDesignation, setFilterDesignation] = useState<string>('');
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'MODERATOR' as UserRole,
    designation: '',
    companies: [] as string[]
  });
  const [isInviting, setIsInviting] = useState(false);

  const { isSuperAdmin } = useAuth();

  const fetchProfiles = async () => {
    if (!isSuperAdmin) return;
    
    setLoading(true);
    // Explicitly fetching all profiles. If you see only your own, 
    // please ensure Supabase RLS policies for 'profiles' table allow 
    // SUPER_ADMINs or all users to SELECT records.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching global profiles:', error);
    } else {
      setProfiles(data || []);
    }
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

    // Hardcode Super Admin protection: cannot change their own role or revoke their core permissions
    if (editingUser.email === 'ashiq.assdi@gmail.com') {
      toast.error('Protective Lock', { description: "System Architecture roles for the Master User are immutable and protected by root security protocols." });
      setEditingUser(null);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        role: editingUser.role,
        companies: editingUser.companies,
        can_add: editingUser.can_add,
        can_edit: editingUser.can_edit,
        can_delete: editingUser.can_delete,
        can_manage_companies: editingUser.can_manage_companies,
        can_wipe_data: editingUser.can_wipe_data,
        name: editingUser.name,
        phone: editingUser.phone,
        address: editingUser.address,
        designation: editingUser.designation
      })
      .eq('id', editingUser.id);

    if (error) {
      toast.error('Sync Error', { description: error.message });
    } else {
      toast.success('Permissions Harmonized', { description: `Access rights for ${editingUser.name} have been updated.` });
      setEditingUser(null);
      fetchProfiles();
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      // In a real environment with Admin SDK, we would create the user in Auth first.
      // For this demo/preview, we create a profile record. 
      // If the FK to auth.users is enforced, this will fail if the user doesn't exist.
      // We'll use a temporary UUID for now to allow the Super Admin to 'add' them to the list.
      const tempId = crypto.randomUUID();
      
      const { error } = await supabase
        .from('profiles')
        .insert([{
          id: tempId,
          email: inviteData.email,
          name: inviteData.name,
          role: inviteData.role,
          designation: inviteData.designation,
          companies: inviteData.companies,
          can_add: true,
          can_edit: inviteData.role !== 'MODERATOR',
          can_delete: inviteData.role === 'SUPER_ADMIN',
          joining_date: new Date().toISOString().split('T')[0]
        }]);

      if (error) {
        if (error.code === '23503') {
          // Foreign key violation means the user doesn't exist in auth.users
          toast.info('Onboarding Protocol', { description: "To add a professional, they must first have an account. Please ask them to Sign Up first, then you can manage their permissions here." });
        } else {
          throw error;
        }
      } else {
        toast.success('Professional Added', { description: `${inviteData.name} has been added to the system.` });
        setIsInviteModalOpen(false);
        setInviteData({
          email: '',
          name: '',
          role: 'MODERATOR',
          designation: '',
          companies: []
        });
        fetchProfiles();
      }
    } catch (err: any) {
      toast.error('Invite Rejected', { description: err.message || "Failed to invite professional" });
    } finally {
      setIsInviting(false);
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

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.designation?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === 'ALL' ? true : p.role === filterRole;
    const matchesDesignation = !filterDesignation || p.designation?.toLowerCase().includes(filterDesignation.toLowerCase());
    return matchesSearch && matchesRole && matchesDesignation;
  });

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
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <UserPlus size={20} />
          <span>Invite Professional</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm font-medium"
            placeholder="Filter access pool by name or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowDeepFilter(!showDeepFilter)}
          className={cn(
            "px-6 py-3.5 rounded-2xl transition-all shadow-sm border flex items-center gap-2 h-[54px]",
            showDeepFilter 
              ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
              : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
          )}
        >
          <Filter size={20} />
          <span className="text-sm font-bold uppercase tracking-widest">Deep Filter</span>
        </button>
      </div>

      {/* Deep Filter Modal (User Access Context) */}
      <AnimatePresence>
        {showDeepFilter && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeepFilter(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] no-print"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[10%] md:left-1/2 md:-translate-x-1/2 md:max-w-xl bg-white rounded-[2.5rem] shadow-2xl z-[101] border border-slate-200 no-print overflow-hidden"
            >
              <div className="p-10 space-y-8 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Filter className="text-indigo-600" size={20} />
                      Access Pool Diagnostics
                    </h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refining organizational security</p>
                  </div>
                  <button 
                    onClick={() => setShowDeepFilter(false)}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Security Role</label>
                    <div className="relative group">
                      <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="appearance-none w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all cursor-pointer tracking-widest"
                      >
                        <option value="ALL">ALL ROLES</option>
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="PROFESSIONAL">PROFESSIONAL</option>
                        <option value="MODERATOR">MODERATOR</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Designation Match</label>
                    <div className="relative group">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold"
                        placeholder="Search specific title..."
                        value={filterDesignation}
                        onChange={(e) => setFilterDesignation(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex gap-4">
                  <button 
                    onClick={() => {
                      setFilterRole('ALL');
                      setFilterDesignation('');
                      setSearch('');
                    }}
                    className="flex-1 px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Reset Query
                  </button>
                  <button 
                    onClick={() => setShowDeepFilter(false)}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100 active:scale-95"
                  >
                    Execute Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProfiles.map((p) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            whileHover={{ y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 font-black text-lg transition-all duration-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6">
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-sm uppercase tracking-tight">{p.name}</h3>
                <span className={cn(
                  "text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest",
                  p.role === 'SUPER_ADMIN' ? "bg-rose-50 text-rose-600" :
                  p.role === 'ADMIN' ? "bg-indigo-50 text-indigo-600" :
                  "bg-emerald-50 text-emerald-600"
                )}>
                  {p.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 group-hover:border-indigo-100 transition-all">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mb-1">Designation</p>
                <p className="text-[11px] text-slate-700 font-black italic">{p.designation || 'Specialist'}</p>
                {p.email && <p className="text-[9px] text-indigo-400 font-mono mt-2 truncate font-black">{p.email}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="pl-1">
                  <span className="text-[8px] font-black text-slate-300 uppercase block tracking-widest">Tier</span>
                  <span className="text-[11px] font-black text-slate-600">{p.role === 'SUPER_ADMIN' ? 'Root' : p.role === 'ADMIN' ? 'Manager' : 'User'}</span>
                </div>
                <div className="pl-1 text-right">
                  <span className="text-[8px] font-black text-slate-300 uppercase block tracking-widest">ID Hash</span>
                  <span className="text-[11px] font-mono font-black text-slate-400">#{p.id.substring(0, 4)}</span>
                </div>
              </div>

              <button 
                onClick={() => setEditingUser(p)}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100 active:scale-95"
              >
                <Shield size={14} /> Update Access Pool
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-indigo-600">
                <div className="flex items-center gap-4 text-white">
                  <UserPlus size={24} />
                  <div>
                    <h2 className="text-xl font-bold">Invite Professional</h2>
                    <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Add a new elite member</p>
                  </div>
                </div>
                <button onClick={() => setIsInviteModalOpen(false)} className="text-indigo-100 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleInvite} className="p-10 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Professional Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                        placeholder="professional@company.com"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input 
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. John Doe"
                      value={inviteData.name}
                      onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Designation</label>
                    <input 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                      placeholder="e.g. Audit Manager"
                      value={inviteData.designation}
                      onChange={(e) => setInviteData({ ...inviteData, designation: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assigned Role</label>
                    <div className="relative group">
                      <select 
                        className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 cursor-pointer uppercase tracking-tight"
                        value={inviteData.role}
                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as UserRole })}
                      >
                        <option value="MODERATOR">Moderator</option>
                        <option value="ADMIN">Administrator</option>
                        <option value="SUPER_ADMIN">System Architect</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-indigo-500 transition-colors">
                        <ChevronDown size={14} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="flex-1 px-8 py-4 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isInviting}
                    className="flex-1 px-12 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95 disabled:opacity-50"
                  >
                    {isInviting ? 'Sending...' : 'Invite Now'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[1.5rem] shadow-2xl overflow-hidden my-4"
            >
              <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                    {editingUser.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{editingUser.name}</h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Policy Assignment</p>
                  </div>
                </div>
                <button onClick={() => setEditingUser(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdatePermissions} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* User Details */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Core Identity</label>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Display Name</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone</label>
                        <input 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                          value={editingUser.phone || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                        />
                      </div>
                    </div>

                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pt-2">System Role</label>
                    <div className="grid grid-cols-1 gap-2">
                      {(['MODERATOR', 'ADMIN', 'SUPER_ADMIN'] as UserRole[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setEditingUser({ ...editingUser, role: r })}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                            editingUser.role === r 
                              ? "border-indigo-600 bg-indigo-50/30" 
                              : "border-slate-100 hover:border-slate-200"
                          )}
                        >
                          <div>
                            <p className={cn("text-xs font-bold", editingUser.role === r ? "text-indigo-600" : "text-slate-700")}>
                              {r.replace('_', ' ')}
                            </p>
                          </div>
                          {editingUser.role === r && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Permissions Toggles */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Action Constraints</label>
                    <div className="bg-slate-50/50 p-4 rounded-2xl space-y-4 border border-slate-100">
                      <PermissionToggle 
                        label="Add Records" 
                        description="Voucher entry creation"
                        active={editingUser.can_add !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_add: !editingUser.can_add })}
                      />
                      <PermissionToggle 
                        label="Edit Records" 
                        description="Modify existing data"
                        active={editingUser.can_edit !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_edit: !editingUser.can_edit })}
                      />
                      <PermissionToggle 
                        label="Delete" 
                        description="Data removal"
                        active={editingUser.can_delete !== false}
                        onClick={() => setEditingUser({ ...editingUser, can_delete: !editingUser.can_delete })}
                        danger
                      />
                      <PermissionToggle 
                        label="Company" 
                        description="Manage entities"
                        active={editingUser.can_manage_companies === true}
                        onClick={() => setEditingUser({ ...editingUser, can_manage_companies: !editingUser.can_manage_companies })}
                      />
                      <PermissionToggle 
                        label="Wipe" 
                        description="Reset system"
                        active={editingUser.can_wipe_data === true}
                        onClick={() => setEditingUser({ ...editingUser, can_wipe_data: !editingUser.can_wipe_data })}
                        danger
                      />
                    </div>
                  </div>
                </div>

                {/* Company Access */}
                <div className="space-y-3 pt-4 border-t border-slate-50">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Network Purview</label>
                  <div className="flex flex-wrap gap-2">
                    {companies.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCompany(c.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all",
                          editingUser.companies?.includes(c.id)
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                        )}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="flex-1 px-6 py-3 text-[10px] font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-3 bg-indigo-600 text-white text-[10px] font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                  >
                    Apply Policy
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
