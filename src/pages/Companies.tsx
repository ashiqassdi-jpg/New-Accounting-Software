/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, Building2, AlertCircle } from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Company } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function Companies() {
  const { companies, refreshCompanies, setSelectedCompany, selectedCompany } = useCompany();
  const { user, canManageCompanies, isSuperAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [bin, setBin] = useState('');

  const openModal = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
      setName(company.name);
      setAddress(company.address || '');
      setTaxId(company.tax_id || '');
      setBin(company.bin || '');
    } else {
      setEditingCompany(null);
      setName('');
      setAddress('');
      setTaxId('');
      setBin('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const companyData = {
        name,
        address,
        tax_id: taxId,
        bin,
        created_by: user.id,
      };

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(companyData)
          .eq('id', editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([companyData]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      await refreshCompanies();
    } catch (error: any) {
      alert(error.message || 'Error occurred while saving company.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setLoading(true);
    
    try {
      // Check for financial data first
      const { count, error: countError } = await supabase
        .from('vouchers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', id);

      if (countError) throw countError;

      if (count && count > 0) {
        toast.error('Security Breach Prevented', { 
          description: `Company "${name}" contains ${count} active vouchers. To delete this entity, you must first wipe its financial history via "Settings > Maintenance".` 
        });
        return;
      }

      if (!confirm(`Are you sure you want to delete "${name}"? This entity appears to be empty of financial records and will be permanently removed.`)) return;
      
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Entity Decommissioned', { description: `"${name}" has been successfully removed from your portfolio.` });
      refreshCompanies();
    } catch (err: any) {
      toast.error('Deletion Failed', { description: err.message || 'Error occurred during deletion.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Business Portfolio
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Manage multiple organizational entities from a single cockpit
          </p>
        </div>
        {canManageCompanies && (
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus size={20} />
            <span>Incorporate New</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {companies.map((company) => (
          <motion.div 
            key={company.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 no-print">
              {canManageCompanies && (
                <>
                  <button 
                    onClick={() => openModal(company)}
                    className="p-2 text-slate-400 hover:text-indigo-600 bg-white shadow-sm border border-slate-100 rounded-lg transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(company.id, company.name)}
                    className="p-2 text-slate-400 hover:text-rose-600 bg-white shadow-sm border border-slate-100 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                selectedCompany?.id === company.id ? "bg-indigo-600 text-white" : "bg-slate-50 text-indigo-600 group-hover:bg-indigo-50"
              )}>
                <Building2 size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-sm uppercase tracking-tight">
                  {company.name}
                </h3>
                {selectedCompany?.id === company.id && (
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em]">Live Session</span>
                )}
              </div>
            </div>
            
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight line-clamp-2 min-h-[32px] mb-6">
              {company.address || 'Address Profile Pending'}
            </p>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
              <div>
                <span className="text-[8px] font-black text-slate-300 uppercase block tracking-[0.2em] mb-1">TIN/TAX</span>
                <span className="text-[10px] font-mono font-black text-slate-600">{company.tax_id || '---'}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-slate-300 uppercase block tracking-[0.2em] mb-1">BIN</span>
                <span className="text-[10px] font-mono font-black text-slate-600">{company.bin || '---'}</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                disabled={selectedCompany?.id === company.id}
                onClick={() => setSelectedCompany(company)}
                className={cn(
                  "w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  selectedCompany?.id === company.id
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default"
                    : "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-100 active:scale-95"
                )}
              >
                {selectedCompany?.id === company.id ? 'Currently Active' : 'Initialize Entity'}
              </button>
            </div>
          </motion.div>
        ))}

        {companies.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
            <Building2 className="mx-auto text-gray-300 h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No companies found</h3>
            <p className="text-gray-500">Get started by creating your first business entity.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingCompany ? 'Edit Company' : 'New Company'}
                </h2>
                <div className="text-gray-400 cursor-pointer" onClick={() => setIsModalOpen(false)}>
                  <Plus className="rotate-45" size={24} />
                </div>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Company Name</label>
                  <input 
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Address</label>
                  <textarea 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Physical address of the company"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tax ID / TIN</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">BIN</label>
                    <input 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      value={bin}
                      onChange={(e) => setBin(e.target.value)}
                      placeholder="Business Identification Number"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={loading}
                    type="submit"
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Company'}
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
