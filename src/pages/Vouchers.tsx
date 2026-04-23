/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Receipt, ChevronRight, ArrowRight, Eye, Download, FileText, Printer, Pencil, Trash2 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { Voucher, VoucherType } from '../types';
import { formatBDT, VOUCHER_TYPES } from '../constants';
import VoucherForm from '../components/VoucherForm';
import VoucherPrintPreview from '../components/VoucherPrintPreview';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Vouchers() {
  const { user, profile, canEdit, canDelete, canAdd } = useAuth();
  const { selectedCompany } = useCompany();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormType, setActiveFormType] = useState<VoucherType | null>(null);
  const [search, setSearch] = useState('');
  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  const fetchVouchers = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else {
      setVouchers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVouchers();
  }, [selectedCompany]);

  const filteredVouchers = vouchers.filter(v => 
    v.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
    v.narration.toLowerCase().includes(search.toLowerCase())
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Ashiq's Creation", 14, 15);
    doc.setFontSize(14);
    doc.text(selectedCompany?.name || '', 14, 25);
    doc.setFontSize(12);
    doc.text('Voucher Register', 14, 35);
    
    const columns = ['Type', 'Date', 'Voucher #', 'Narration', 'Amount'];
    const body = filteredVouchers.map(v => [
      v.type,
      format(new Date(v.date), 'dd/MM/yyyy'),
      v.voucher_no,
      v.narration,
      new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(v.amount)
    ]);

    autoTable(doc, {
      head: [columns],
      body: body,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 }
    });

    doc.save(`vouchers_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleExportExcel = () => {
    const data = filteredVouchers.map(v => ({
      Type: v.type,
      Date: format(new Date(v.date), 'dd/MM/yyyy'),
      'Voucher No': v.voucher_no,
      Narration: v.narration,
      Amount: v.amount
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vouchers");
    XLSX.writeFile(wb, `vouchers.xlsx`);
  };

  const handleDeleteVoucher = async (id: string, voucherNo: string) => {
    if (!canDelete) {
      toast.error('Permission Denied', { description: 'You do not have permission to delete vouchers.' });
      return;
    }
    
    if (!id) {
      toast.error('Error', { description: 'Invalid voucher ID provided.' });
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to permanently delete voucher ${voucherNo}? All associated ledger entries will be removed.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      // We rely on ON DELETE CASCADE in the database to remove transactions
      // This is safer and ensures single transaction atomicity
      const { error: voucherError } = await supabase
        .from('vouchers')
        .delete()
        .eq('id', id);

      if (voucherError) {
        throw voucherError;
      }
      
      toast.success('Voucher Deleted', { description: `Voucher ${voucherNo} has been removed successfully.` });
      await fetchVouchers();
    } catch (err: any) {
      console.error('Operation failed:', err);
      toast.error('Deletion Failed', { 
        description: err.message || 'Failed to delete voucher. Please check your connection or permissions.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Voucher Management
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Record entries for {selectedCompany?.name || 'Selected Entity'}
          </p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button 
            onClick={() => window.print()}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
            title="Print List"
          >
            <Printer size={20} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors shadow-sm"
            title="Export Excel"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={handleExportPDF}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-colors shadow-sm"
            title="Export PDF"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {(activeFormType || editingVoucher) ? (
          <VoucherForm 
            initialType={activeFormType || editingVoucher?.type}
            editingVoucher={editingVoucher}
            onSuccess={() => {
              setActiveFormType(null);
              setEditingVoucher(null);
              fetchVouchers();
            }}
            onCancel={() => {
              setActiveFormType(null);
              setEditingVoucher(null);
            }}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-12"
          >
            {/* Quick Actions Grid */}
            {canAdd && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {VOUCHER_TYPES.map((vt) => (
                  <button
                    key={vt.value}
                    onClick={() => setActiveFormType(vt.value as VoucherType)}
                    className="flex flex-col items-center justify-center p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 hover:-translate-y-1 transition-all group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                      vt.value === 'PAYMENT' && "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
                      vt.value === 'RECEIPT' && "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                      vt.value === 'JOURNAL' && "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                      vt.value === 'CONTRA' && "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
                      vt.value === 'SALES' && "bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white",
                      vt.value === 'PURCHASE' && "bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white",
                    )}>
                      <Receipt size={24} />
                    </div>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">{vt.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Recent Transactions</h2>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    placeholder="Filter by description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-10">Type</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                        <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right pr-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredVouchers.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5 pl-10">
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider",
                              v.type === 'PAYMENT' && "bg-rose-50 text-rose-600",
                              v.type === 'RECEIPT' && "bg-emerald-50 text-emerald-600",
                              v.type === 'JOURNAL' && "bg-amber-50 text-amber-600",
                              v.type === 'CONTRA' && "bg-indigo-50 text-indigo-600",
                              v.type === 'SALES' && "bg-sky-50 text-sky-600",
                              v.type === 'PURCHASE' && "bg-slate-100 text-slate-600",
                            )}>
                              {v.type}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-sm font-bold text-slate-400">
                            {format(new Date(v.date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900">{v.voucher_no}</span>
                              <span className="text-xs text-slate-400 font-medium truncate max-w-xs">{v.narration}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm font-mono font-black text-slate-900 text-right">
                            {formatBDT(v.amount)}
                          </td>
                          <td className="px-8 py-5 text-right pr-10">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30"
                                onClick={() => setViewingVoucher(v)}
                                title="Print View"
                                disabled={loading}
                              >
                                <Eye size={16} />
                              </button>
                              
                              {canEdit && (
                                <button 
                                  className="p-2 text-slate-300 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-30"
                                  onClick={() => setEditingVoucher(v)}
                                  title="Edit Voucher"
                                  disabled={loading}
                                >
                                  <Pencil size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button 
                                  className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30"
                                  onClick={() => handleDeleteVoucher(v.id, v.voucher_no)}
                                  title="Delete Voucher"
                                  disabled={loading}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredVouchers.length === 0 && !loading && (
                  <div className="py-20 text-center">
                    <Receipt className="mx-auto text-gray-300 h-10 w-10 mb-4" />
                    <p className="text-slate-400 text-sm font-medium">No transactions found match your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {viewingVoucher && (
          <VoucherPrintPreview 
            voucher={viewingVoucher}
            company={selectedCompany}
            profile={profile}
            onClose={() => setViewingVoucher(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
