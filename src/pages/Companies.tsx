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

export default function Companies() {
  const { companies, refreshCompanies } = useCompany();
  const { user } = useAuth();
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

    const companyData = {
      name,
      address,
      tax_id: taxId,
      bin,
      created_by: user.id,
    };

    let error;
    if (editingCompany) {
      const { error: updateError } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', editingCompany.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('companies')
        .insert([companyData]);
      error = insertError;
    }

    if (error) {
      alert(error.message);
    } else {
      setIsModalOpen(false);
      refreshCompanies();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            Companies
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your multiple business entities
          </p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={20} />
          <span>Add Company</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map((company) => (
          <motion.div 
            key={company.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-indigo-50 p-3 rounded-xl">
                <Building2 className="text-indigo-600" size={24} />
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => openModal(company)}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="font-bold text-lg text-gray-900 truncate">
              {company.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px] mt-1">
              {company.address || 'No address specified'}
            </p>
            
            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tax ID</span>
                <span className="text-sm font-medium text-gray-700">{company.tax_id || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">BIN</span>
                <span className="text-sm font-medium text-gray-700">{company.bin || 'N/A'}</span>
              </div>
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
