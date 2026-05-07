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
import { ExportService } from '../services/ExportService';
import { DateRangeFilter } from '../components/DateRangeFilter';

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
        .order('code')
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
    
    const columns = ['Date', 'Reference Number', 'Narration', 'Debit', 'Credit', 'Balance'];
    const body = transactions.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.voucher?.voucher_no || '-',
      t.narration ? `${t.narration} - ${t.voucher?.narration}` : (t.voucher?.narration || '-'),
      t.debit > 0 ? t.debit : '-',
      t.credit > 0 ? t.credit : '-',
      t.balance
    ]);

    ExportService.exportToPDF({
        title: `General Ledger: ${selectedAccount.name}`,
        companyName: selectedCompany?.name || "As-Sunnah Skill Development Institute",
        companyAddress: selectedCompany?.address || 'BLOCK-D, ROAD: SHADHINATA SHARANI, SATARKUL, NORTH BADDA, DHAKA',
        dateRange: confirmedDateRange,
        columns,
        data: body,
        filename: `ledger_${selectedAccount.code}`,
        numericColumns: [3, 4, 5]
    });
  };

  const handleExportExcel = () => {
    if (!selectedAccount) return;
    const body = transactions.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.voucher?.voucher_no || '-',
      t.narration ? `${t.narration} - ${t.voucher?.narration}` : (t.voucher?.narration || '-'),
      t.debit || 0,
      t.credit || 0,
      t.balance || 0
    ]);
    
    ExportService.exportToExcel({
        title: `General Ledger: ${selectedAccount.name}`,
        companyName: selectedCompany?.name || "As-Sunnah Skill Development Institute",
        companyAddress: selectedCompany?.address || 'BLOCK-D, ROAD: SHADHINATA SHARANI, SATARKUL, NORTH BADDA, DHAKA',
        dateRange: confirmedDateRange,
        columns: ['Date', 'Reference Number', 'Narration', 'Debit', 'Credit', 'Balance'],
        data: body,
        filename: `ledger_${selectedAccount.code}`,
        numericColumns: [3, 4, 5]
    });
  };

  return (
    <div className="space-y-4 pb-10 max-w-[1600px] mx-auto">
      {/* Integrated Professional Header */}
      {selectedAccount && (
        <div className="bg-white text-slate-900 py-4 px-8 text-center space-y-0.5 border-b border-slate-50 mb-4">
          <div className="space-y-0">
            <h1 className="text-2xl font-normal text-slate-900 tracking-tight leading-tight uppercase">
              {selectedCompany?.name || "As-Sunnah Skill Development Institute"}
            </h1>
            <p className="text-[9px] font-normal text-slate-400 uppercase tracking-[0.2em] max-w-2xl mx-auto">
              {selectedCompany?.address || 'BLOCK-D, ROAD: SHADHINATA SHARANI, SATARKUL, NORTH BADDA, DHAKA'}
            </p>
          </div>
          
          <div className="pt-1 flex flex-col items-center">
            <div className="w-full max-w-xs border-t border-slate-900" />
            <h2 className="py-0.5 text-base font-normal text-slate-900 uppercase tracking-[0.4em]">
              General Ledger
            </h2>
            <div className="w-full max-w-xs border-t border-slate-900" />
            
            <div className="mt-1 space-y-1 font-normal uppercase tracking-widest text-slate-900">
              <div className="px-4 py-1 bg-slate-900 text-white rounded text-[10px] inline-block font-normal">
                {selectedAccount?.name} ({selectedAccount?.code})
              </div>
              <p className="text-[10px] text-slate-500 font-normal">
                Range: {confirmedDateRange.from || 'Opening'} — {confirmedDateRange.to || 'Present'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-lg shadow-slate-900/10">
              <BookOpen className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none uppercase">
                General Ledger
              </h1>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest truncate max-w-[200px]">
                {selectedCompany?.name || 'Protocol'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 flex-1 max-w-2xl justify-end">
          {/* Pro Account Searcher */}
          <div className="relative flex-1 max-w-sm" ref={searchRef}>
            <div 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between hover:border-indigo-500 transition-all shadow-sm"
            >
              <span className={cn("truncate", selectedAccount ? "text-slate-900" : "text-slate-400")}>
                {selectedAccount ? `${selectedAccount.name}` : "Select Account..."}
              </span>
              <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isSearchOpen && "rotate-180")} />
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
              "px-5 py-2.5 rounded-xl transition-all shadow-md text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95",
              showDeepFilter 
                ? "bg-indigo-600 text-white" 
                : "bg-slate-900 text-white hover:bg-indigo-600 shadow-slate-900/10"
            )}
          >
            <Filter size={16} />
            Analyze
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
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] no-print"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="fixed inset-x-4 top-[15%] md:left-1/2 md:-translate-x-1/2 md:max-w-lg bg-white rounded-3xl shadow-2xl z-[101] border border-slate-200 no-print overflow-hidden"
            >
              <div className="p-6 space-y-6 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
                      <Filter className="text-indigo-600" size={16} />
                      Ledger Filter
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Parameters refinement</p>
                  </div>
                  <button 
                    onClick={() => setShowDeepFilter(false)}
                    className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Audit Boundary</label>
                    <div className="bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                      <DateRangeFilter value={dateRange} onChange={setDateRange} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Narration Key</label>
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-900"
                          placeholder="Text search..."
                          value={narrationSearch}
                          onChange={(e) => setNarrationSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Value Bounds (৳)</label>
                      <div className="flex gap-2">
                        <input 
                          placeholder="Min"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-bold"
                          value={amountRange.min}
                          onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        />
                        <input 
                          placeholder="Max"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono font-bold"
                          value={amountRange.max}
                          onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex gap-3">
                  <button 
                    onClick={() => {
                      setDateRange({ from: '', to: '' });
                      setAmountRange({ min: '', max: '' });
                      setNarrationSearch('');
                      setConfirmedDateRange({ from: '', to: '' });
                      setConfirmedAmountRange({ min: '', max: '' });
                      setConfirmedNarrationSearch('');
                    }}
                    className="flex-1 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => {
                      setConfirmedDateRange(dateRange);
                      setConfirmedAmountRange(amountRange);
                      setConfirmedNarrationSearch(narrationSearch);
                      setShowDeepFilter(false);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-md active:scale-95"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {selectedAccount ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
          <LedgerStat label="Type" value={selectedAccount.type} isType icon={<ArchiveX size={14} />} />
          <LedgerStat label="Total Debit" value={transactions.reduce((acc, t) => acc + (t.debit || 0), 0)} icon={<ArrowUpRight size={14} className="text-rose-500" />} />
          <LedgerStat label="Total Credit" value={transactions.reduce((acc, t) => acc + (t.credit || 0), 0)} icon={<ArrowDownLeft size={14} className="text-emerald-500" />} />
          <LedgerStat 
            label="Current Balance" 
            value={transactions.length > 0 ? transactions[0].balance : calculateBalance(selectedAccount.type, 0, 0)} 
            icon={<BookOpen size={14} className="text-indigo-500" />}
          />
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center space-y-3 no-print">
          <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center mx-auto">
            <Search className="text-slate-200" size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight uppercase">Analytical State Idle</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select an account to initiate record analysis</p>
          </div>
        </div>
      )}

      {selectedAccount && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between no-print">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 uppercase text-[10px] tracking-widest">Transaction Traceability</h3>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-widest">Deep-dive financial records</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200"
              >
                <Printer size={13} /> Print
              </button>
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-200"
              >
                <FileDown size={13} /> Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
              >
                <FileText size={13} /> PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest">Date</th>
                  <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest">Ref ID</th>
                  <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest">Narrative</th>
                  <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest w-32">Debit</th>
                  <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest w-32">Credit</th>
                  <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest w-40 pr-10">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/20 transition-colors group">
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-400 whitespace-nowrap font-mono">
                      {format(new Date(t.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-700 font-mono tracking-tighter">
                      {t.voucher?.voucher_no}
                    </td>
                    <td className="px-6 py-3 text-[12px] font-bold text-slate-500 max-w-sm leading-snug">
                      {t.narration || t.voucher?.narration}
                    </td>
                    <td className="px-6 py-3 text-[11px] font-bold text-rose-600 text-right font-mono tabular-nums">
                      {t.debit > 0 ? formatBDT(t.debit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-6 py-3 text-[11px] font-bold text-emerald-600 text-right font-mono tabular-nums">
                      {t.credit > 0 ? formatBDT(t.credit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-6 py-3 text-[11px] font-bold text-slate-900 text-right pr-10 font-mono tabular-nums relative">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn(t.balance < 0 ? "text-rose-600" : "text-slate-900")}>
                          {formatBDT(t.balance).replace(/[^0-9.,]/g, '')}
                        </span>
                        <button 
                          className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 no-print"
                          onClick={() => setViewingVoucher(t.voucher)}
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-[10px] italic">
                      No records found
                    </td>
                  </tr>
                )}
              </tbody>
              {transactions.length > 0 && (
                <tfoot className="bg-slate-50/50 border-t-2 border-slate-100 font-bold">
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-[9px] text-slate-900 text-right uppercase tracking-widest">
                      Ledger Totals
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-rose-600 text-right tabular-nums">
                      {formatBDT(transactions.reduce((acc, t) => acc + (t.debit || 0), 0)).replace(/[^0-9.,]/g, '')}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-mono text-emerald-600 text-right tabular-nums">
                      {formatBDT(transactions.reduce((acc, t) => acc + (t.credit || 0), 0)).replace(/[^0-9.,]/g, '')}
                    </td>
                    <td className={cn(
                      "px-6 py-4 text-[11px] font-mono text-right tabular-nums pr-10",
                      transactions[0].balance < 0 ? "text-rose-600" : "text-indigo-700"
                    )}>
                      {formatBDT(transactions[0].balance).replace(/[^0-9.,]/g, '')}
                    </td>
                  </tr>
                </tfoot>
              )}
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
    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="flex flex-col gap-0.5 relative z-10">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 leading-none mb-1">
          {icon} {label}
        </span>
        <span className={cn(
          "text-base font-black tracking-tight",
          isType ? "text-indigo-600 uppercase" : "text-slate-900 font-mono"
        )}>
          {isType ? value : formatBDT(value)}
        </span>
      </div>
      <div className="absolute top-0 right-0 p-3 opacity-[0.03] translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform text-slate-900">
        {icon && React.cloneElement(icon, { size: 48 })}
      </div>
    </div>
  );
}
