/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Calendar, ArrowUpRight, ArrowDownLeft, Eye, FileText, Printer, FileDown, Filter, ChevronDown, Check, X, ArchiveX, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { formatBDT } from '../constants';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import VoucherPrintPreview from '../components/VoucherPrintPreview';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  const searchRef = useRef<HTMLDivElement>(null);

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
  }, [selectedAccountId]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          voucher:vouchers(*)
        `)
        .eq('account_id', selectedAccountId)
        .gte('date', dateRange.from)
        .lte('date', dateRange.to)
        .order('date', { ascending: true }); // Important for running balance
      
      if (error) throw error;
      
      // Calculate running balance starting from 0 or opening balance logic
      let runningBalance = 0;
      const transactionsWithBalance = (data || []).map(t => {
        runningBalance += (t.debit - t.credit);
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

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.code.includes(searchQuery)
  );

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
      t.voucher?.narration || '-',
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
      Narration: t.voucher?.narration,
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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                General Ledger
              </h1>
              <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">
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
              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between hover:bg-white hover:border-indigo-500 transition-all shadow-sm"
            >
              <span className={selectedAccount ? "text-slate-900" : "text-slate-400"}>
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
                  <div className="p-3 border-b border-slate-50 bg-slate-50/50">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        autoFocus
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                        placeholder="Search Account Ledger..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar px-2 py-2">
                    {filteredAccounts.length > 0 ? (
                      filteredAccounts.map(a => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            setSelectedAccountId(a.id);
                            setIsSearchOpen(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all group",
                            selectedAccountId === a.id ? "bg-indigo-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex flex-col">
                            <span className={cn("text-[11px] font-black uppercase tracking-tight", selectedAccountId === a.id ? "text-indigo-700" : "text-slate-700")}>{a.name}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-400">{a.code}</span>
                          </div>
                          {selectedAccountId === a.id && <Check size={14} className="text-indigo-600" />}
                        </button>
                      ))
                    ) : (
                      <div className="py-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No matching ledgers</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-slate-50/50 border border-slate-100 rounded-2xl p-2 shadow-sm">
            <div className="flex items-center px-3 gap-2 border-r border-slate-200">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date"
                className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase"
                value={dateRange.from}
                onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
              />
            </div>
            <div className="flex items-center px-3 gap-2 border-r border-slate-200">
              <span className="text-[10px] font-black text-slate-300 uppercase">to</span>
              <input 
                type="date"
                className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase"
                value={dateRange.to}
                onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
              />
            </div>
            <button 
              onClick={fetchTransactions}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {selectedAccount ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
          <LedgerStat label="Total Assets / Type" value={selectedAccount.type} isType icon={<ArrowUpRight size={16} />} />
          <LedgerStat label="In-Period Debit" value={transactions.reduce((acc, t) => acc + (t.debit || 0), 0)} icon={<ArrowUpRight size={16} className="text-rose-500" />} />
          <LedgerStat label="In-Period Credit" value={transactions.reduce((acc, t) => acc + (t.credit || 0), 0)} icon={<ArrowDownLeft size={16} className="text-emerald-500" />} />
          <LedgerStat 
            label="Net Variance (Period)" 
            value={transactions.reduce((acc, t) => acc + (t.debit - t.credit), 0)} 
            icon={<Filter size={16} className="text-indigo-500" />}
          />
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center space-y-4 no-print">
          <div className="w-20 h-20 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center mx-auto">
            <Search className="text-slate-300" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Analytical Readiness Pending</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Select an account ledger to initiate real-time traceability</p>
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
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Transaction Traceability</h3>
                <p className="text-[9px] font-black text-slate-400 mt-0.5 tracking-widest">Deep-dive record analysis</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100"
              >
                <Printer size={14} /> Print
              </button>
              <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
              >
                <FileDown size={14} /> Excel
              </button>
              <button 
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg"
              >
                <FileText size={14} /> PDF Report
              </button>
            </div>
          </div>

          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest border-r border-white/5">Date</th>
                  <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest border-r border-white/5">Ref ID</th>
                  <th className="px-10 py-5 text-left text-[10px] font-black uppercase tracking-widest border-r border-white/5">Transaction Narrative</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest border-r border-white/5">Debit</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest border-r border-white/5">Credit</th>
                  <th className="px-10 py-5 text-right text-[10px] font-black uppercase tracking-widest pr-12">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {transactions.map((t, idx) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-10 py-6 text-[11px] font-black text-slate-400 whitespace-nowrap font-mono tabular-nums">
                      {format(new Date(t.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-slate-700 font-mono tracking-tighter">
                      {t.voucher?.voucher_no}
                    </td>
                    <td className="px-10 py-6 text-[13px] font-bold text-slate-500 max-w-lg leading-relaxed">
                      {t.voucher?.narration}
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-rose-600 text-right font-mono tabular-nums">
                      {t.debit > 0 ? formatBDT(t.debit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-emerald-600 text-right font-mono tabular-nums">
                      {t.credit > 0 ? formatBDT(t.credit).replace(/[^0-9.,]/g, '') : '-'}
                    </td>
                    <td className="px-10 py-6 text-xs font-black text-slate-900 text-right pr-12 font-mono tabular-nums relative">
                      <div className="flex items-center justify-end gap-3 translate-x-4">
                        {formatBDT(t.balance).replace(/[^0-9.,]/g, '')}
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
                      <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">
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
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          {icon} {label}
        </span>
        <span className={cn(
          "text-2xl font-black tracking-tight",
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
