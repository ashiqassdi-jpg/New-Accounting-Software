/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Receipt, ChevronRight, ArrowRight, Eye, Download, FileText, Printer, Pencil, Trash2, X, ChevronDown, Check 
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
  const [showDeepFilter, setShowDeepFilter] = useState(false);
  const [filterMode, setFilterMode] = useState<'RECENT' | 'ALL'>('RECENT');
  const [filterType, setFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const accountSearchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountSearchRef.current && !accountSearchRef.current.contains(event.target as Node)) {
        setIsAccountSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAccounts = async () => {
    if (!selectedCompany) return;
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .order('name');
    setAccounts(data || []);
  };

  const fetchVouchers = async () => {
    if (!selectedCompany) return;
    setLoading(true);
    
    let query = supabase
      .from('vouchers')
      .select(`
        *,
        items:transactions(*)
      `)
      .eq('company_id', selectedCompany.id);

    if (filterMode === 'RECENT' && !showDeepFilter && !search) {
      query = query.limit(20);
    }
    if (filterType !== 'ALL') {
      query = query.eq('type', filterType);
    }
    if (dateRange.from) query = query.gte('date', dateRange.from);
    if (dateRange.to) query = query.lte('date', dateRange.to);
    if (amountRange.min) query = query.gte('amount', amountRange.min);
    if (amountRange.max) query = query.lte('amount', amountRange.max);

    const { data, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else {
      let filteredData = data || [];
      // Filter by account if selected
      if (filterAccountId) {
        filteredData = filteredData.filter(v => 
          v.items?.some((item: any) => item.account_id === filterAccountId)
        );
      }
      setVouchers(filteredData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, [selectedCompany]);

  useEffect(() => {
    fetchVouchers();
  }, [selectedCompany, filterMode, filterType, dateRange.from, dateRange.to, amountRange.min, amountRange.max, filterAccountId]);

  const filteredVouchers = vouchers.filter(v => 
    v.voucher_no.toLowerCase().includes(search.toLowerCase()) ||
    (v.narration?.toLowerCase() || '').includes(search.toLowerCase())
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
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight leading-none text-center md:text-left">
            Voucher Management
          </h1>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest leading-none text-center md:text-left">
            Vanguard Entries for {selectedCompany?.name || 'Vanguard'}
          </p>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-2 no-print">
          <button 
            onClick={() => setShowDeepFilter(!showDeepFilter)}
            className={cn(
              "px-4 py-2.5 rounded-xl transition-all shadow-sm border flex items-center gap-2",
              showDeepFilter 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
            )}
          >
            <Filter size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">Deep Filter</span>
          </button>
          <div className="w-px h-8 bg-slate-100 mx-1 hidden md:block" />
          <button 
            onClick={() => window.print()}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
            title="Print List"
          >
            <Printer size={16} />
          </button>
          <button 
            onClick={handleExportExcel}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 transition-colors shadow-sm"
            title="Export Excel"
          >
            <Download size={16} />
          </button>
          <button 
            onClick={handleExportPDF}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 transition-colors shadow-sm"
            title="Export PDF"
          >
            <FileText size={16} />
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">{filterMode === 'RECENT' ? 'Recent Transactions' : 'All Transactions'}</h2>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setFilterMode('RECENT')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                        filterMode === 'RECENT' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      RECENT
                    </button>
                    <button 
                      onClick={() => setFilterMode('ALL')}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all",
                        filterMode === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      ALL
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Account Filter (Analytical) */}
                  <div className="relative" ref={accountSearchRef}>
                    <div 
                      onClick={() => setIsAccountSearchOpen(!isAccountSearchOpen)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-500 transition-all shadow-sm group min-w-[240px]",
                        isAccountSearchOpen && "border-indigo-500 ring-4 ring-indigo-500/5"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-lg flex items-center justify-center transition-colors",
                        filterAccountId ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-100"
                      )}>
                        <Search size={10} />
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest truncate",
                        filterAccountId ? "text-slate-900" : "text-slate-300"
                      )}>
                        {filterAccountId 
                          ? accounts.find(a => a.id === filterAccountId)?.name 
                          : "Audit Lead"}
                      </span>
                      <ChevronDown size={14} className={cn("ml-auto text-slate-300 transition-transform duration-300", isAccountSearchOpen && "rotate-180 text-indigo-500")} />
                    </div>

                    <AnimatePresence>
                      {isAccountSearchOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.98 }}
                          className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl z-[100] no-print overflow-hidden w-[350px]"
                        >
                          <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                            <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input 
                                autoFocus
                                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-black uppercase placeholder:text-slate-300"
                                placeholder="Scan ledger index..."
                                value={accountSearchQuery}
                                onChange={(e) => setAccountSearchQuery(e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                            <button
                              onClick={() => {
                                setFilterAccountId(null);
                                setIsAccountSearchOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all font-black text-[10px] uppercase tracking-widest",
                                !filterAccountId ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-400"
                              )}
                            >
                              Reset Analytical Focus
                            </button>
                            <div className="h-px bg-slate-50 my-1" />
                            {accounts.filter(a => a.name.toLowerCase().includes(accountSearchQuery.toLowerCase()) || a.code.includes(accountSearchQuery)).map(a => (
                              <button
                                key={a.id}
                                onClick={() => {
                                  setFilterAccountId(a.id);
                                  setIsAccountSearchOpen(false);
                                  setAccountSearchQuery('');
                                }}
                                className={cn(
                                  "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group",
                                  filterAccountId === a.id ? "bg-indigo-50" : "hover:bg-slate-50"
                                )}
                              >
                                <div className="flex flex-col">
                                  <span className={cn("text-[10px] font-black uppercase tracking-tight", filterAccountId === a.id ? "text-indigo-800" : "text-slate-700")}>{a.name}</span>
                                  <span className={cn("text-[8px] font-mono font-black tracking-[0.2em] mt-0.5 text-slate-400")}>{a.code}</span>
                                </div>
                                {filterAccountId === a.id && (
                                  <div className="bg-indigo-600 p-1 rounded-lg text-white">
                                    <Check size={10} />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Search */}
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-black uppercase text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Transaction Scan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Deep Filter Modal (Integrated) */}
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
                      <div className="p-10 space-y-8">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                              <Filter className="text-indigo-600" size={20} />
                              Deep Search Protocols
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refining transactional architecture</p>
                          </div>
                          <button 
                            onClick={() => setShowDeepFilter(false)}
                            className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Voucher Category</label>
                            <div className="relative group">
                              <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="appearance-none w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all cursor-pointer tracking-widest"
                              >
                                <option value="ALL">ALL TYPES</option>
                                {VOUCHER_TYPES.map(t => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Date Boundary</label>
                            <div className="flex items-center bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 gap-2">
                              <input 
                                type="date"
                                value={dateRange.from}
                                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                                className="bg-transparent text-[10px] font-black text-slate-600 outline-none p-1.5"
                              />
                              <ArrowRight size={12} className="text-slate-300" />
                              <input 
                                type="date"
                                value={dateRange.to}
                                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                                className="bg-transparent text-[10px] font-black text-slate-600 outline-none p-1.5"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Value Thresholds (৳)</label>
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black text-slate-300 uppercase pl-1">Minimum</label>
                                <input 
                                  placeholder="0.00"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-bold"
                                  value={amountRange.min}
                                  onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                                />
                              </div>
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-black text-slate-300 uppercase pl-1">Maximum</label>
                                <input 
                                  placeholder="∞"
                                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-bold"
                                  value={amountRange.max}
                                  onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50 flex gap-4">
                          <button 
                            onClick={() => {
                              setFilterType('ALL');
                              setDateRange({ from: '', to: '' });
                              setAmountRange({ min: '', max: '' });
                              setSearch('');
                            }}
                            className="flex-1 px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all"
                          >
                            Reset Logic
                          </button>
                          <button 
                            onClick={() => setShowDeepFilter(false)}
                            className="flex-1 px-6 py-4 bg-slate-900 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100 active:scale-95"
                          >
                            Execute Scan
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

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
