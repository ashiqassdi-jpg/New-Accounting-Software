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
import { DateRangeFilter } from '../components/DateRangeFilter';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Vouchers() {
  const { user, profile, canEdit, canDelete, canAdd } = useAuth();
  const { selectedCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFormType, setActiveFormType] = useState<VoucherType | null>(null);

  const [viewingVoucher, setViewingVoucher] = useState<Voucher | null>(null);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true' && !activeFormType && !editingVoucher) {
      setActiveFormType('PAYMENT');
      // Clean up the URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('new');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, activeFormType, editingVoucher, setSearchParams]);

  const [search, setSearch] = useState('');
  const [showDeepFilter, setShowDeepFilter] = useState(false);
  const [filterMode, setFilterMode] = useState<'RECENT' | 'ALL'>('RECENT');
  const [filterType, setFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [confirmedDateRange, setConfirmedDateRange] = useState({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [confirmedAmountRange, setConfirmedAmountRange] = useState({ min: '', max: '' });
  const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
  const [confirmedFilterAccountId, setConfirmedFilterAccountId] = useState<string | null>(null);
  const [confirmedFilterType, setConfirmedFilterType] = useState<VoucherType | 'ALL'>('ALL');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isAccountSearchOpen, setIsAccountSearchOpen] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredAccountsForSearch = React.useMemo(() => {
    const q = accountSearchQuery.toLowerCase();
    return accounts.filter(a => 
      a.name.toLowerCase().includes(q) || 
      (a.code || '').toLowerCase().includes(q)
    );
  }, [accounts, accountSearchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [accountSearchQuery]);
  const accountSearchRef = React.useRef<HTMLDivElement>(null);
  const accountSearchInputRef = React.useRef<HTMLInputElement>(null);
  const accountScrollContainerRef = React.useRef<HTMLDivElement>(null);
  const accountTriggerRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isAccountSearchOpen) {
      accountTriggerRef.current = document.activeElement as HTMLElement;
      setTimeout(() => accountSearchInputRef.current?.focus(), 10);
      setSelectedIndex(0);
    } else if (accountTriggerRef.current) {
      accountTriggerRef.current.focus();
      accountTriggerRef.current = null;
    }
  }, [isAccountSearchOpen]);

  useEffect(() => {
    if (accountScrollContainerRef.current && selectedIndex >= 0) {
      const selectedElement = accountScrollContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'instant',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

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
    if (confirmedFilterType !== 'ALL') {
      query = query.eq('type', confirmedFilterType);
    }
    if (confirmedDateRange.from) query = query.gte('date', confirmedDateRange.from);
    if (confirmedDateRange.to) query = query.lte('date', confirmedDateRange.to);
    if (confirmedAmountRange.min) query = query.gte('amount', confirmedAmountRange.min);
    if (confirmedAmountRange.max) query = query.lte('amount', confirmedAmountRange.max);

    const [{ data, error }, { data: profilesData }] = await Promise.all([
      query
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name, email')
    ]);

    if (error) {
      console.error('Error fetching vouchers:', error);
    } else {
      let filteredData = data || [];
      // Filter by account if selected
      if (confirmedFilterAccountId) {
        filteredData = filteredData.filter(v => 
          v.items?.some((item: any) => item.account_id === confirmedFilterAccountId)
        );
      }
      
      // Attach creator and editor information
      if (profilesData) {
        const profileMap = new Map(profilesData.map(p => [p.id, p]));
        filteredData = filteredData.map(v => ({
          ...v,
          creator: v.created_by ? profileMap.get(v.created_by) : undefined,
          editor: v.updated_by ? profileMap.get(v.updated_by) : undefined
        }));
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
  }, [selectedCompany, filterMode, confirmedFilterType, confirmedDateRange.from, confirmedDateRange.to, confirmedAmountRange.min, confirmedAmountRange.max, confirmedFilterAccountId]);

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
          <h1 className="text-xl font-semibold text-slate-900 font-sans tracking-tight leading-none text-center md:text-left">
            Voucher Management
          </h1>
          <p className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase tracking-widest leading-none text-center md:text-left truncate max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl" title={`Vanguard Entries for ${selectedCompany?.name || 'Vanguard'}`}>
            Vanguard Entries for {selectedCompany?.name || 'Vanguard'}
          </p>
        </div>

        <div className="flex items-center justify-center md:justify-end gap-2 no-print">
          <button 
            onClick={() => setShowDeepFilter(!showDeepFilter)}
            className={cn(
              "px-3 py-2.5 rounded-lg transition-all shadow-sm border flex items-center gap-2",
              showDeepFilter 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <Filter size={16} />
            <span className="text-sm font-medium">Deep Filter</span>
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
        <div className="space-y-12">
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
                  <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">{vt.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-[0.2em]">{filterMode === 'RECENT' ? 'Recent Transactions' : 'All Transactions'}</h2>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl">
                    <button 
                      onClick={() => setFilterMode('RECENT')}
                      className={cn(
                        "px-2.5 py-1 text-[9px] font-semibold rounded-lg transition-all",
                        filterMode === 'RECENT' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      RECENT
                    </button>
                    <button 
                      onClick={() => setFilterMode('ALL')}
                      className={cn(
                        "px-2.5 py-1 text-[9px] font-semibold rounded-lg transition-all",
                        filterMode === 'ALL' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                      )}
                    >
                      ALL
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap md:flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {/* Simplified Search */}
                    <div className="relative w-40 shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                      <input 
                        className="w-full bg-white border border-slate-100 rounded-xl pl-9 pr-3 py-1.5 text-[9px] font-medium text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                        placeholder="Scan..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                  <DateRangeFilter 
                    value={dateRange}
                    onChange={setDateRange}
                    compact
                  />

                  <button 
                    onClick={() => {
                      setConfirmedDateRange(dateRange);
                      fetchVouchers();
                    }}
                    className="px-3 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-semibold uppercase tracking-wider hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-1.5 shrink-0"
                  >
                    <Search size={12} />
                    Search
                  </button>

                  <button 
                    onClick={() => setShowDeepFilter(!showDeepFilter)}
                    className={cn(
                      "px-3 py-2 rounded-lg transition-all shadow-sm border flex items-center gap-1.5 shrink-0",
                      showDeepFilter 
                        ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                        : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <Filter size={16} />
                    <span className="text-sm font-medium">Deep Filter</span>
                  </button>
                </div>
              </div>

            {/* Deep Filter Modal (Integrated) */}
            {showDeepFilter && (
              <>
                <div
                  onClick={() => setShowDeepFilter(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] no-print"
                />
                <div
                  className="fixed inset-x-4 top-[10%] md:left-1/2 md:-translate-x-1/2 md:max-w-2xl bg-white rounded-2xl shadow-xl z-[101] border border-slate-200 no-print overflow-hidden"
                >
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                          <Filter className="text-indigo-600" size={18} />
                          Deep Search Protocols
                        </h2>
                      </div>
                      <button 
                        onClick={() => setShowDeepFilter(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Analytical Account Lead</label>
                        <div className="relative" ref={accountSearchRef}>
                          <div 
                            onClick={() => setIsAccountSearchOpen(!isAccountSearchOpen)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm cursor-pointer hover:border-slate-400 transition-colors group",
                              isAccountSearchOpen && "border-indigo-500 ring-2 ring-indigo-500/20"
                            )}
                          >
                            <Search size={16} className={cn(
                              "transition-colors",
                              filterAccountId ? "text-indigo-600" : "text-slate-400"
                            )} />
                            <span className={cn(
                              "text-sm truncate flex-1",
                              filterAccountId ? "text-slate-900 font-medium" : "text-slate-500"
                            )}>
                              {filterAccountId 
                                ? accounts.find(a => a.id === filterAccountId)?.name 
                                : "Select Ledger Account..."}
                            </span>
                            <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200", isAccountSearchOpen && "rotate-180")} />
                          </div>

                          {isAccountSearchOpen && (
                            <div 
                              className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg z-[150] overflow-hidden"
                            >
                              <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input 
                                    ref={accountSearchInputRef}
                                    className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                    placeholder="Search accounts..."
                                    value={accountSearchQuery}
                                    onChange={(e) => {
                                      setAccountSearchQuery(e.target.value);
                                      setSelectedIndex(0);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => (prev + 1) % (filteredAccountsForSearch.length + 1));
                                      } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setSelectedIndex(prev => (prev - 1 + filteredAccountsForSearch.length + 1) % (filteredAccountsForSearch.length + 1));
                                      } else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (selectedIndex === 0) {
                                          setFilterAccountId(null);
                                          setIsAccountSearchOpen(false);
                                        } else {
                                          const account = filteredAccountsForSearch[selectedIndex - 1];
                                          if (account) {
                                            setFilterAccountId(account.id);
                                            setIsAccountSearchOpen(false);
                                            setAccountSearchQuery('');
                                          }
                                        }
                                      } else if (e.key === 'Escape') {
                                        setIsAccountSearchOpen(false);
                                      } else if (e.key === 'Tab') {
                                        if (!e.shiftKey) {
                                          const selectedBtn = accountScrollContainerRef.current?.querySelector('[data-selected="true"]') as HTMLButtonElement;
                                          if (selectedBtn) {
                                            e.preventDefault();
                                            selectedBtn.focus();
                                          }
                                        }
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                               <div 
                                ref={accountScrollContainerRef} 
                                className="max-h-[240px] overflow-y-auto p-1 space-y-0.5"
                                onKeyDown={(e) => {
                                  if (e.key === 'Tab') {
                                    e.preventDefault();
                                    accountSearchInputRef.current?.focus();
                                  }
                                }}
                              >
                                <button
                                  data-selected={selectedIndex === 0}
                                  onClick={() => {
                                    setFilterAccountId(null);
                                    setIsAccountSearchOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                                    !filterAccountId ? "bg-indigo-50 text-indigo-700 font-medium" : "hover:bg-slate-50 text-slate-600"
                                  )}
                                >
                                  Reset Account Selection
                                </button>
                                {filteredAccountsForSearch.map((a, idx) => {
                                  const isSelected = selectedIndex === idx + 1;
                                  return (
                                    <button
                                      key={a.id}
                                      data-selected={isSelected}
                                      onClick={() => {
                                        setFilterAccountId(a.id);
                                        setIsAccountSearchOpen(false);
                                        setAccountSearchQuery('');
                                      }}
                                      className={cn(
                                        "w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-all",
                                        isSelected 
                                          ? "bg-indigo-600 text-white shadow-md scale-[1.02] ring-2 ring-indigo-300 ring-offset-1" 
                                          : (filterAccountId === a.id ? "bg-indigo-50 border border-indigo-100" : "hover:bg-slate-50 border border-transparent")
                                      )}
                                    >
                                      <div className="flex flex-col truncate pr-2">
                                        <span className={cn("text-sm truncate", isSelected ? "text-white font-medium" : (filterAccountId === a.id ? "text-indigo-900 font-medium" : "text-slate-700"))}>{a.name}</span>
                                      </div>
                                      <span className={cn("text-xs font-mono shrink-0", isSelected ? "text-indigo-100" : (filterAccountId === a.id ? "text-indigo-500" : "text-slate-400"))}>{a.code}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Voucher Category</label>
                        <div className="relative group">
                          <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value as any)}
                            className="appearance-none w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm cursor-pointer"
                          >
                            <option value="ALL">All Types</option>
                            {VOUCHER_TYPES.map(t => (
                               <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Date Boundary</label>
                        <div className="pt-1">
                          <DateRangeFilter value={dateRange} onChange={setDateRange} />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Value Thresholds (৳)</label>
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-1.5">
                            <label className="block text-xs text-slate-500">Minimum</label>
                            <input 
                              type="number"
                              placeholder="0.00"
                              className="w-full bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                              value={amountRange.min}
                              onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="block text-xs text-slate-500">Maximum</label>
                            <input 
                              type="number"
                              placeholder="∞"
                              className="w-full bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                              value={amountRange.max}
                              onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex gap-3 justify-end items-center">
                      <button 
                        onClick={() => {
                          setFilterType('ALL');
                          setDateRange({ from: '', to: '' });
                          setAmountRange({ min: '', max: '' });
                          setFilterAccountId(null);
                          setSearch('');
                          // To instantly reset UI to all data:
                          setConfirmedFilterType('ALL');
                          setConfirmedDateRange({ from: '', to: '' });
                          setConfirmedAmountRange({ min: '', max: '' });
                          setConfirmedFilterAccountId(null);
                        }}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Reset Logic
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmedDateRange(dateRange);
                          setConfirmedFilterType(filterType);
                          setConfirmedAmountRange(amountRange);
                          setConfirmedFilterAccountId(filterAccountId);
                          setShowDeepFilter(false);
                        }}
                        className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                      >
                        Execute Scan
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* List */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest pl-10">Type</th>
                      <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-5 text-[10px] font-medium text-slate-400 uppercase tracking-widest text-right pr-10">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredVouchers.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 pl-10">
                          <span className={cn(
                            "text-[10px] font-medium px-2.5 py-1 rounded-md uppercase tracking-wider",
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
                        <td className="px-8 py-5 text-sm font-medium text-slate-400">
                          {format(new Date(v.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-900">{v.voucher_no}</span>
                            <span className="text-xs text-slate-400 font-medium truncate max-w-xs">{v.narration}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-mono font-semibold text-slate-900 text-right">
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
        </div>
      )}
      {viewingVoucher && (
        <VoucherPrintPreview 
          voucher={viewingVoucher}
          company={selectedCompany}
          profile={profile}
          onClose={() => setViewingVoucher(null)}
        />
      )}
    </div>
  );
}
