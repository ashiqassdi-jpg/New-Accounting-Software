/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, ArrowUpRight, ArrowDownLeft, Eye, FileText, Printer, FileDown, Filter, ChevronDown, Check, X, ArchiveX, BookOpen, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { formatBDT, ACCOUNT_GROUPS, getDisplayBalance, calculateBalance } from '../constants';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import VoucherPrintPreview from '../components/VoucherPrintPreview';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DateRangeFilter } from '../components/DateRangeFilter';
import * as XLSX from 'xlsx';

export default function Ledger() {
  const { profile } = useAuth();
  const { selectedCompany } = useCompany();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<any>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showDeepFilter, setShowDeepFilter] = useState(false);
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredAccounts = React.useMemo(() => {
    const q = accountSearchQuery.toLowerCase();
    return accounts.filter(a => 
      a.name.toLowerCase().includes(q) || 
      a.code.toLowerCase().includes(q)
    );
  }, [accounts, accountSearchQuery]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [accountSearchQuery]);
  const [narrationSearch, setNarrationSearch] = useState('');
  const [confirmedNarrationSearch, setConfirmedNarrationSearch] = useState('');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });
  const [confirmedAmountRange, setConfirmedAmountRange] = useState({ min: '', max: '' });
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [confirmedDateRange, setConfirmedDateRange] = useState({
    from: '',
    to: ''
  });
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      setTimeout(() => searchInputRef.current?.focus(), 10);
      setSelectedIndex(0);
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [isSearchOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current && selectedIndex >= 0) {
      const selectedElement = scrollContainerRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'instant',
          block: 'nearest'
        });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedCompany) {
      supabase.from('accounts')
        .select('*')
        .eq('company_id', selectedCompany.id)
        .order('name')
        .then(({ data }) => setAccounts(data || []));
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions();
    }
  }, [selectedAccountId, confirmedDateRange.from, confirmedDateRange.to, confirmedAmountRange.min, confirmedAmountRange.max, confirmedNarrationSearch]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          voucher:vouchers(*)
        `)
        .eq('account_id', selectedAccountId);
        
      if (confirmedDateRange.from && confirmedDateRange.to) {
        query = query.gte('date', confirmedDateRange.from).lte('date', confirmedDateRange.to);
      }
        
      const { data, error } = await query.order('date', { ascending: true }); // Important for running balance
      
      if (error) throw error;
      
      let filteredData = data || [];
      if (confirmedAmountRange.min) filteredData = filteredData.filter(t => (t.debit || t.credit) >= parseFloat(confirmedAmountRange.min));
      if (confirmedAmountRange.max) filteredData = filteredData.filter(t => (t.debit || t.credit) <= parseFloat(confirmedAmountRange.max));
      if (confirmedNarrationSearch) {
        filteredData = filteredData.filter(t => t.voucher?.narration?.toLowerCase().includes(confirmedNarrationSearch.toLowerCase()));
      }

      // Calculate running balance starting from 0 or opening balance logic
      let runningBalance = 0;
      const transactionsWithBalance = filteredData.map(t => {
        runningBalance += calculateBalance(selectedAccount?.type || 'ASSET', t.debit, t.credit);
        return { ...t, balance: runningBalance };
      });

      // Sort back to descending for display
      setTransactions(transactionsWithBalance.reverse());
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleExportPDF = () => {
    if (!selectedAccount) return;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Ashiq's Creation", 14, 15);
    doc.setFontSize(14);
    doc.text(selectedCompany?.name || '', 14, 25);
    doc.setFontSize(12);
    doc.text(`General Ledger: ${selectedAccount.name} (${selectedAccount.code})`, 14, 35);
    
    const columns = ['Date', 'Ref #', 'Narration', 'Debit', 'Credit'];
    const body = transactions.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.voucher?.voucher_no || '-',
      t.narration ? `${t.narration} - ${t.voucher?.narration}` : (t.voucher?.narration || '-'),
      t.debit > 0 ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(t.debit) : '-',
      t.credit > 0 ? new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2 }).format(t.credit) : '-'
    ]);

    autoTable(doc, {
      head: [columns],
      body: body,
      startY: 45,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 }
    });

    doc.save(`ledger_${selectedAccount.code}_${format(new Date(), 'yyyyMMdd')}.pdf`);
  };

  const handleExportExcel = () => {
    if (!selectedAccount) return;
    const data = transactions.map(t => ({
      Date: format(new Date(t.date), 'dd/MM/yyyy'),
      'Voucher No': t.voucher?.voucher_no,
      Narration: t.narration ? `${t.narration} - ${t.voucher?.narration}` : t.voucher?.narration,
      Debit: t.debit,
      Credit: t.credit
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, `ledger_${selectedAccount.code}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
      {/* Professional Header */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10">
              <BookOpen className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                General Ledger
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-[0.2em] truncate max-w-[200px] sm:max-w-[240px] md:max-w-[300px]" title={`${selectedCompany?.name || 'Academic Institution'} Protocol`}>
                {selectedCompany?.name || 'Academic Institution'} Protocol
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 flex-1 max-w-4xl justify-end">
          {/* Pro Account Searcher */}
          <div className="relative flex-1 max-w-sm" ref={searchRef}>
            <div 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-xs font-semibold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-white hover:border-indigo-500 transition-all shadow-sm"
            >
              <span className={cn("truncate", selectedAccount ? "text-slate-900" : "text-slate-400")}>
                {selectedAccount ? `${selectedAccount.name} (${selectedAccount.code})` : "Select Account Ledger..."}
              </span>
              <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isSearchOpen && "rotate-180")} />
            </div>

            <AnimatePresence>
              {isSearchOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-200 shadow-2xl rounded-2xl z-[100] overflow-hidden"
                >
                  <div className="p-3 border-b border-slate-50 bg-slate-50/30">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        ref={searchInputRef}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-semibold"
                        placeholder="Search Account Ledger..."
                        value={accountSearchQuery}
                        onChange={(e) => setAccountSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSelectedIndex(prev => (prev + 1) % (filteredAccounts.length + 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSelectedIndex(prev => (prev - 1 + filteredAccounts.length + 1) % (filteredAccounts.length + 1));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            if (selectedIndex === 0) {
                              setSelectedAccountId('');
                              setIsSearchOpen(false);
                            } else {
                              const account = filteredAccounts[selectedIndex - 1];
                              if (account) {
                                setSelectedAccountId(account.id);
                                setIsSearchOpen(false);
                                setAccountSearchQuery('');
                              }
                            }
                          } else if (e.key === 'Escape') {
                            setIsSearchOpen(false);
                          } else if (e.key === 'Tab') {
                            if (!e.shiftKey) {
                              const selectedBtn = scrollContainerRef.current?.querySelector('[data-selected="true"]') as HTMLButtonElement;
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
                    ref={scrollContainerRef}
                    className="max-h-[300px] overflow-y-auto custom-scrollbar px-2 py-2 space-y-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Tab') {
                        e.preventDefault();
                        searchInputRef.current?.focus();
                      }
                    }}
                  >
                    {(() => {
                      if (filteredAccounts.length === 0) {
                        return (
                          <div className="py-8 text-center text-[10px] font-semibold text-slate-300 uppercase tracking-widest italic">
                            No matching ledgers
                          </div>
                        );
                      }

                      const groups = ACCOUNT_GROUPS.map(group => ({
                        ...group,
                        accounts: filteredAccounts.filter(a => a.type === group.value)
                      })).filter(g => g.accounts.length > 0);

                      const groupedIds = groups.flatMap(g => g.accounts.map(a => a.id));
                      const others = filteredAccounts.filter(a => !groupedIds.includes(a.id));
                      if (others.length > 0) {
                        groups.push({ value: 'OTHER', label: 'Other Ledgers', color: 'slate', accounts: others } as any);
                      }

                      return (
                        <>
                          <button
                            type="button"
                            data-selected={selectedIndex === 0}
                            onClick={() => {
                              setSelectedAccountId('');
                              setIsSearchOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group mb-3 border border-transparent",
                              selectedIndex === 0 ? "bg-rose-50 border-rose-100 shadow-sm" : "hover:bg-rose-50 hover:border-rose-100"
                            )}
                          >
                            <span className={cn("text-[10px] font-semibold tracking-tight", selectedIndex === 0 ? "text-rose-600" : "text-rose-500")}>No Selection</span>
                          </button>
                          {groups.map(group => (
                            <div key={group.value} className="mb-3 last:mb-0">
                              <div className="px-4 py-1 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.25em] mb-1">{group.label}</div>
                              <div className="grid grid-cols-1 gap-1">
                                {group.accounts.map(a => {
                                  const globalIndex = filteredAccounts.indexOf(a) + 1;
                                  const isSelected = selectedIndex === globalIndex;
                                  return (
                                    <button
                                      key={a.id}
                                      type="button"
                                      data-selected={isSelected}
                                      onClick={() => {
                                        setSelectedAccountId(a.id);
                                        setIsSearchOpen(false);
                                      }}
                                      className={cn(
                                        "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group border border-transparent",
                                        isSelected ? "bg-indigo-600 border-indigo-700 shadow-md" : (selectedAccountId === a.id ? "bg-indigo-50" : "hover:bg-slate-50")
                                      )}
                                    >
                                      <div className="flex flex-col">
                                        <span className={cn(
                                          "text-[11px] font-semibold tracking-tight",
                                          isSelected ? "text-white" : (selectedAccountId === a.id ? "text-indigo-700" : "text-slate-700")
                                        )}>{a.name}</span>
                                        <span className={cn(
                                          "text-[9px] font-mono font-medium transition-colors",
                                          isSelected ? "text-indigo-100" : "text-slate-400 group-hover:text-indigo-400"
                                        )}>{a.code}</span>
                                      </div>
                                      {(isSelected || selectedAccountId === a.id) && <Check size={14} className={isSelected ? "text-white" : "text-indigo-600"} />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => setShowDeepFilter(!showDeepFilter)}
            className={cn(
              "px-6 py-2.5 rounded-xl transition-all shadow-lg text-[10px] font-semibold uppercase tracking-[0.2em] flex items-center gap-2 active:scale-95",
              showDeepFilter 
                ? "bg-indigo-600 text-white" 
                : "bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-900/10"
            )}
          >
            <Filter size={14} />
            Deep Filter
          </button>
        </div>
      </div>

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
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Filter className="text-indigo-600" size={20} />
                      Ledger Analytical Parameters
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Refining financial traceability</p>
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
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Audit Boundary</label>
                    <div className="pt-1">
                      <DateRangeFilter value={dateRange} onChange={setDateRange} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Narration Search</label>
                    <div className="relative group">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                      <input 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold"
                        placeholder="Search narration..."
                        value={narrationSearch}
                        onChange={(e) => setNarrationSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest pl-1">Transaction Value Thresholds (৳)</label>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-semibold text-slate-300 uppercase pl-1">Minimum Amount</label>
                        <input 
                          placeholder="0.00"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-semibold"
                          value={amountRange.min}
                          onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-semibold text-slate-300 uppercase pl-1">Maximum Amount</label>
                        <input 
                          placeholder="∞"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-semibold"
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
                      setDateRange({ from: '', to: '' });
                      setAmountRange({ min: '', max: '' });
                      setNarrationSearch('');
                      // Instantly reset
                      setConfirmedDateRange({ from: '', to: '' });
                      setConfirmedAmountRange({ min: '', max: '' });
                      setConfirmedNarrationSearch('');
                    }}
                    className="flex-1 px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all"
                  >
                    Reset Parameters
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmedDateRange(dateRange);
                      setConfirmedAmountRange(amountRange);
                      setConfirmedNarrationSearch(narrationSearch);
                      setShowDeepFilter(false);
                    }}
                    className="flex-1 px-6 py-4 bg-slate-900 text-white text-xs font-semibold uppercase tracking-[0.2em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-100 active:scale-95"
                  >
                    Execute Analysis
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {selectedAccount ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
          <LedgerStat label="Total Assets / Type" value={selectedAccount.type} isType icon={<ArrowUpRight size={16} />} />
          <LedgerStat label="In-Period Debit" value={transactions.reduce((acc, t) => acc + (t.debit || 0), 0)} icon={<ArrowUpRight size={16} className="text-rose-500" />} />
          <LedgerStat label="In-Period Credit" value={transactions.reduce((acc, t) => acc + (t.credit || 0), 0)} icon={<ArrowDownLeft size={16} className="text-emerald-500" />} />
          <LedgerStat 
            label="Net Variance (Period)" 
            value={calculateBalance(
              selectedAccount?.type || 'ASSET',
              transactions.reduce((acc, t) => acc + (t.debit || 0), 0),
              transactions.reduce((acc, t) => acc + (t.credit || 0), 0)
            )} 
            icon={<Filter size={16} className="text-indigo-500" />}
          />
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center space-y-4 no-print">
          <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mx-auto">
            <Search className="text-slate-300" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Analytical Readiness Pending</h3>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">Select an account ledger to initiate real-time traceability</p>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="bg-white rounded-[2rem] border border-slate-50 shadow-2xl shadow-indigo-100/10 overflow-hidden">
          <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between no-print">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 uppercase text-xs tracking-widest">Transaction Traceability</h3>
                <p className="text-[9px] font-semibold text-slate-400 mt-0.5 tracking-widest">Deep-dive record analysis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
              >
                <Printer size={14} /> Print
              </button>
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
              >
                <FileDown size={14} /> Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
              >
                <FileText size={14} /> PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="px-10 py-5 text-left text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Date</th>
                  <th className="px-10 py-5 text-left text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Ref ID</th>
                  <th className="px-10 py-5 text-left text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Transaction Narrative</th>
                  <th className="px-10 py-5 text-right text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Debit</th>
                  <th className="px-10 py-5 text-right text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Credit</th>
                  <th className="px-10 py-5 text-right text-[10px] font-semibold uppercase tracking-widest pr-12">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-10 py-6 text-[11px] font-semibold text-slate-400 whitespace-nowrap font-mono tabular-nums">
                      {format(new Date(t.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-10 py-6 text-xs font-semibold text-slate-700 font-mono tracking-tighter">
                      {t.voucher?.voucher_no}
                    </td>
                    <td className="px-10 py-6 text-[13px] font-medium text-slate-500 max-w-lg leading-relaxed">
                      {t.narration 
                        ? `${t.narration} - ${t.voucher?.narration}`
                        : t.voucher?.narration}
                    </td>
                    <td className="px-10 py-6 text-xs font-semibold text-rose-600 text-right font-mono tabular-nums">
                      {t.debit > 0 ? formatBDT(t.debit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-10 py-6 text-xs font-semibold text-emerald-600 text-right font-mono tabular-nums">
                      {t.credit > 0 ? formatBDT(t.credit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-10 py-6 text-xs font-semibold text-slate-900 text-right pr-12 font-mono tabular-nums relative">
                      <div className="flex items-center justify-end gap-3 translate-x-4">
                        <span className={cn(t.balance < 0 ? "text-rose-600" : "text-slate-900")}>
                          {formatBDT(t.balance).replace(/[^0-9.,]/g, '')}
                        </span>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          t.balance >= 0 ? "bg-emerald-400" : "bg-rose-400"
                        )} />
                        <button 
                          className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all opacity-0 group-hover:opacity-100 no-print"
                          onClick={() => setViewingVoucher(t.voucher)}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                      <div className="mx-auto w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                        <ArchiveX className="text-slate-200" size={32} />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest italic">
                        No financial events detected for this period
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A4 Print Optimization Styling */}
      <style type="text/css" media="print">
        {`
          @page { size: A4 portrait; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; background: white !important; }
          .no-print { display: none !important; }
          .print-header { display: block !important; }
          table { width: 100% !important; border: 1px solid #000 !important; }
          th { background-color: #000 !important; color: white !important; -webkit-print-color-adjust: exact; }
          td, th { border: 1px solid #eee !important; padding: 10px !important; font-size: 9px !important; }
        `}
      </style>

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

function LedgerStat({ label, value, isType, icon }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group overflow-hidden relative">
      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          {icon} {label}
        </span>
        <span className={cn(
          "text-xl font-bold tracking-tight",
          isType ? "text-indigo-600 uppercase" : "text-slate-900 font-mono"
        )}>
          {isType ? value : formatBDT(value)}
        </span>
      </div>
      <div className="absolute top-0 right-0 p-4 opacity-5 translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform text-slate-900">
        {icon && React.cloneElement(icon, { size: 64 })}
      </div>
    </div>
  );
}
