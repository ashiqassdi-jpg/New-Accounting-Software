/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Calendar,
  Download,
  Filter,
  Search,
  ChevronRight,
  Printer,
  Eye,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  Receipt,
  ArrowRight,
  ChevronUp,
  FileDown,
  Plus,
  Check,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatBDT, ACCOUNT_GROUPS, VOUCHER_TYPES, PAYMENT_CHANNELS } from '../constants';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import VoucherForm from '../components/VoucherForm';
import VoucherPrintPreview from '../components/VoucherPrintPreview';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { Voucher, VoucherType, Account } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportTab = 'TRIAL_BALANCE' | 'DAYBOOK' | 'LEDGER_REPORT';

export default function Reports() {
  const { selectedCompany } = useCompany();
  const { profile, canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('DAYBOOK');
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAccountSearch, setShowAccountSearch] = useState(false);
  const filterSearchRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });

  useEffect(() => {
    if (selectedCompany) {
      supabase.from('accounts').select('*').eq('company_id', selectedCompany.id).order('name').then(({ data }) => setAccounts(data || []));
    }
  }, [selectedCompany]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterSearchRef.current && !filterSearchRef.current.contains(event.target as Node)) {
        setShowAccountSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [confirmedDateRange, setConfirmedDateRange] = useState(dateRange);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    accountType: '',
    accountId: '',
    voucherType: '',
    searchQuery: '',
    minAmount: '',
    maxAmount: ''
  });

  const resetFilters = () => {
    setFilters({
      accountType: '',
      accountId: '',
      voucherType: '',
      searchQuery: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  const handleExportPDF = (data: any[], title: string, columns: string[], filename: string) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Ashiq's Creation", 14, 15);
    doc.setFontSize(14);
    doc.text(selectedCompany?.name || '', 14, 25);
    doc.setFontSize(12);
    doc.text(title, 14, 35);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.from} to ${dateRange.to}`, 14, 42);
    
    // Format numbers for PDF export
    const formattedData = data.map(row => 
      row.map((cell: any) => {
        if (typeof cell === 'number') {
          return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cell);
        }
        return cell;
      })
    );
    
    autoTable(doc, {
      head: [columns],
      body: formattedData,
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 }
    });
    
    doc.save(`${filename}.pdf`);
  };

  const handleExportExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      {editingVoucher ? (
        <VoucherForm 
          editingVoucher={editingVoucher}
          onSuccess={() => {
            setEditingVoucher(null);
          }}
          onCancel={() => setEditingVoucher(null)}
        />
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 font-sans tracking-tight leading-none">
                Financial Reports
              </h1>
              <p className="text-[11px] text-slate-400 mt-1.5 font-medium uppercase tracking-widest leading-none">
                Governance & Audit Protocols
              </p>
            </div>

              <div className="flex flex-wrap items-center gap-2">
                <DateRangeFilter value={dateRange} onChange={setDateRange} compact />

                <button 
                  onClick={() => {
                    setConfirmedDateRange(dateRange);
                  }}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 h-[38px] shrink-0"
                >
                  <Search size={14} />
                  Search
                </button>
                
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all shadow-sm border flex items-center gap-1.5 h-[38px] shrink-0",
                    showAdvancedFilters 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                      : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <Filter size={16} />
                  <span className="text-sm font-medium">Deep Filter</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Modal (Enhanced) */}
            <div>
              {showAdvancedFilters && (
                <>
                  <div
                    onClick={() => setShowAdvancedFilters(false)}
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
                            Analytical Parameters
                          </h2>
                        </div>
                        <button 
                          onClick={() => setShowAdvancedFilters(false)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Date Boundary</label>
                          <div className="pt-1">
                            <DateRangeFilter value={dateRange} onChange={setDateRange} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Voucher Identification</label>
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              placeholder="Search Narrative or #..."
                              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-colors placeholder:text-slate-400"
                              value={filters.searchQuery}
                              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="block text-sm font-medium text-slate-700">Value Thresholds (৳)</label>
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-1.5">
                              <label className="block text-xs text-slate-500">Min Amount</label>
                              <input 
                                type="number"
                                placeholder="Min"
                                className="w-full bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                value={filters.minAmount}
                                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                              />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <label className="block text-xs text-slate-500">Max Amount</label>
                              <input 
                                type="number"
                                placeholder="Max"
                                className="w-full bg-white border border-slate-300 shadow-sm rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                                value={filters.maxAmount}
                                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Primary Ledger Context</label>
                          <div className="relative" ref={filterSearchRef}>
                            <div 
                              onClick={() => setShowAccountSearch(!showAccountSearch)}
                              className={cn(
                                "flex items-center justify-between w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm shadow-sm cursor-pointer hover:border-slate-400 transition-colors group",
                                showAccountSearch && "border-indigo-500 ring-2 ring-indigo-500/20"
                              )}
                            >
                              <div className="flex flex-col truncate pr-2 w-full">
                                <span className={cn("truncate", filters.accountId ? "text-slate-900 font-medium" : "text-slate-500")}>
                                  {filters.accountId 
                                    ? accounts.find(a => a.id === filters.accountId)?.name 
                                    : "Filter by specific ledger account..."}
                                </span>
                              </div>
                              <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-200 shrink-0", showAccountSearch && "rotate-180")} />
                            </div>

                            <div>
                              {showAccountSearch && (
                                <div 
                                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 shadow-lg rounded-lg z-[150] overflow-hidden"
                                >
                                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                                    <div className="relative">
                                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input 
                                        autoFocus
                                        className="w-full bg-white border border-slate-300 rounded-md pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                                        placeholder="Search ledger name or code..."
                                        value={filters.searchQuery}
                                        onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                                      />
                                    </div>
                                  </div>
                                  <div className="max-h-[240px] overflow-y-auto p-1 space-y-0.5">
                                    <button
                                      onClick={() => {
                                        setFilters(prev => ({ ...prev, accountId: '' }));
                                        setShowAccountSearch(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm rounded-md transition-colors bg-indigo-50 text-indigo-700 font-medium mb-1"
                                    >
                                      Clear Selection
                                    </button>
                                    
                                    {(() => {
                                      const filtered = accounts.filter(a => 
                                        a.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) || 
                                        a.code.includes(filters.searchQuery)
                                      );
                                      
                                      const groups = ACCOUNT_GROUPS.map(group => ({
                                        ...group,
                                        accounts: filtered.filter(a => a.type === group.value)
                                      })).filter(g => g.accounts.length > 0);

                                      const groupedIds = groups.flatMap(g => g.accounts.map(a => a.id));
                                      const others = filtered.filter(a => !groupedIds.includes(a.id));
                                      if (others.length > 0) {
                                        groups.push({ value: 'OTHER', label: 'Other Ledgers', color: 'slate', accounts: others } as any);
                                      }

                                      return groups.map(group => (
                                        <div key={group.value} className="mb-2 last:mb-0">
                                          <div className="px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-50 rounded-md mb-1">{group.label}</div>
                                          <div className="grid grid-cols-1 gap-0.5">
                                            {group.accounts.map(a => (
                                              <button
                                                key={a.id}
                                                type="button"
                                                onClick={() => {
                                                  setFilters(prev => ({ ...prev, accountId: a.id }));
                                                  setShowAccountSearch(false);
                                                }}
                                                className={cn(
                                                  "w-full text-left px-3 py-1.5 rounded-md flex items-center justify-between transition-colors",
                                                  filters.accountId === a.id ? "bg-indigo-50" : "hover:bg-slate-50 text-slate-700"
                                                )}
                                              >
                                                <div className="flex flex-col truncate pr-2">
                                                  <span className={cn("text-sm truncate", filters.accountId === a.id ? "text-indigo-900 font-medium" : "text-slate-700")}>{a.name}</span>
                                                </div>
                                                <span className={cn("text-xs font-mono shrink-0", filters.accountId === a.id ? "text-indigo-500" : "text-slate-400")}>{a.code}</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <label className="block text-sm font-medium text-slate-700">Document Category</label>
                          <div className="flex flex-wrap gap-2">
                            {VOUCHER_TYPES.map(v => (
                              <button 
                                key={v.value}
                                onClick={() => setFilters(prev => ({ ...prev, voucherType: prev.voucherType === v.value ? '' : v.value }))}
                                className={cn(
                                  "px-4 py-2 rounded-lg text-xs font-medium transition-colors border",
                                  filters.voucherType === v.value 
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                )}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-slate-100 flex gap-3 justify-end items-center">
                        <button 
                          onClick={resetFilters}
                          className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => {
                            setConfirmedDateRange(dateRange);
                            setShowAdvancedFilters(false);
                          }}
                          className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm focus:ring-2 focus:ring-indigo-500/50 outline-none"
                        >
                          Execute Analysis
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-100 no-print">
              <TabButton 
                active={activeTab === 'DAYBOOK'} 
                onClick={() => setActiveTab('DAYBOOK')}
                label="Daybook"
              />
              <TabButton 
                active={activeTab === 'LEDGER_REPORT'} 
                onClick={() => setActiveTab('LEDGER_REPORT')}
                label="Ledger Statement"
              />
              <TabButton 
                active={activeTab === 'TRIAL_BALANCE'} 
                onClick={() => setActiveTab('TRIAL_BALANCE')}
                label="Trial Balance"
              />
            </div>

            <div className="mt-8">
              {activeTab === 'DAYBOOK' && (
                  <Daybook 
                    companyId={selectedCompany?.id} 
                    dateRange={confirmedDateRange} 
                    filters={filters}
                    onEdit={setEditingVoucher}
                    onExportPDF={(data: any) => handleExportPDF(data, 'Daybook', ['Date', 'Voucher #', 'Main Account', 'Type', 'Description', 'Amount'], 'daybook')}
                    onExportExcel={(data: any) => handleExportExcel(data, 'daybook')}
                  />
                )}
                {activeTab === 'LEDGER_REPORT' && (
                  <LedgerReport 
                    companyId={selectedCompany?.id} 
                    dateRange={confirmedDateRange} 
                    filters={filters}
                    onExportPDF={(data: any) => handleExportPDF(data, 'Ledger Statement', ['Date', 'Narration', 'Type', 'Debit', 'Credit', 'Balance'], 'ledger_statement')}
                    onExportExcel={(data: any) => handleExportExcel(data, 'ledger_statement')}
                  />
                )}
                {activeTab === 'TRIAL_BALANCE' && (
                  <TrialBalance 
                    companyId={selectedCompany?.id} 
                    dateRange={confirmedDateRange} 
                    filters={filters}
                    onExportPDF={(data: any) => handleExportPDF(data, 'Trial Balance', ['Code', 'Account', 'Debit', 'Credit'], 'trial_balance')}
                    onExportExcel={(data: any) => handleExportExcel(data, 'trial_balance')}
                  />
                )}
            </div>
          </div>
        )}
      </div>
    );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all",
        active 
          ? "bg-white text-indigo-600 shadow-sm border border-indigo-100/50" 
          : "text-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  );
}

// Sub-components for Reports
function TrialBalance({ companyId, dateRange, filters, onExportPDF, onExportExcel }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (companyId) fetchTrialBalance();
  }, [companyId, dateRange, filters.accountType]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    let accQuery = supabase.from('accounts').select('*').eq('company_id', companyId);
    if (filters.accountType) accQuery = accQuery.eq('type', filters.accountType);

    const { data: accounts, error: accError } = await accQuery;
    if (accError) { setLoading(false); return; }

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .lte('date', dateRange.to);

    if (transError) { setLoading(false); return; }

    const trialBalance = accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.account_id === acc.id);
      const totalDebit = accTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
      const totalCredit = accTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
      
      let netDebit = 0;
      let netCredit = 0;
      const balance = (totalDebit - totalCredit);
      if (balance > 0) netDebit = balance;
      else if (balance < 0) netCredit = Math.abs(balance);

      return { ...acc, debit: netDebit, credit: netCredit };
    }).filter(acc => acc.debit !== 0 || acc.credit !== 0);

    setData(trialBalance);
    setLoading(false);
  };

  const filteredData = data.filter(acc => 
    acc.name.toLowerCase().includes(search.toLowerCase()) ||
    acc.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebit = filteredData.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredit = filteredData.reduce((sum, acc) => sum + acc.credit, 0);

  if (loading) return <div className="p-20 text-center text-slate-400 font-semibold animate-pulse uppercase tracking-widest text-[10px]">Calculating Ledger Equilibrium...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-10 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-6 flex-1">
          <div>
            <h3 className="font-semibold text-slate-900 uppercase text-xs tracking-widest">Trial Balance</h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">Audit verification of ledger balances</p>
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input 
              placeholder="Search Ledger or Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-xl pl-11 pr-4 py-2.5 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-mono"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onExportExcel(filteredData.map(acc => ({ Code: acc.code, Account: acc.name, Debit: acc.debit, Credit: acc.credit })))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-slate-100"
          >
            <FileDown size={20} />
          </button>
          <button 
            onClick={() => onExportPDF(filteredData.map(acc => [acc.code, acc.name, acc.debit, acc.credit]))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Code</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5 whitespace-nowrap">Account Ledger</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5 text-right whitespace-nowrap">Debit (৳)</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest text-right whitespace-nowrap">Credit (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50 transition-all group">
                <td className="px-10 py-5 text-xs font-mono font-semibold text-slate-400">{acc.code}</td>
                <td className="px-10 py-5 text-[11px] font-semibold text-slate-700 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                   {acc.name}
                </td>
                <td className="px-10 py-5 text-sm font-mono font-semibold text-slate-900 text-right tabular-nums">
                  {acc.debit > 0 ? formatBDT(acc.debit).replace(/[^0-9.,]/g, '') : '-'}
                </td>
                <td className="px-10 py-5 text-sm font-mono font-semibold text-slate-900 text-right tabular-nums">
                  {acc.credit > 0 ? formatBDT(acc.credit).replace(/[^0-9.,]/g, '') : '-'}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-32 text-center text-slate-300 font-semibold uppercase tracking-widest text-[11px] italic">No ledger activity found for this period</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50/80 border-t-2 border-slate-100 font-semibold backdrop-blur-sm sticky bottom-0">
            <tr>
              <td colSpan={2} className="px-10 py-6 text-[10px] text-slate-900 text-right uppercase tracking-[0.3em] font-semibold">Consolidated Total</td>
              <td className="px-10 py-6 text-sm font-mono font-semibold text-indigo-600 text-right tabular-nums">{formatBDT(totalDebit).replace(/[^0-9.,]/g, '')}</td>
              <td className="px-10 py-6 text-sm font-mono font-semibold text-indigo-600 text-right tabular-nums">{formatBDT(totalCredit).replace(/[^0-9.,]/g, '')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function Daybook({ companyId, dateRange, filters, onEdit, onExportPDF, onExportExcel }: any) {
  const { profile, canEdit, canDelete } = useAuth();
  const { selectedCompany } = useCompany();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVoucherId, setExpandedVoucherId] = useState<string | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<any>(null);

  useEffect(() => {
    if (companyId) {
      fetchDaybook();
    }
  }, [companyId, dateRange, filters]);

  const fetchDaybook = async () => {
    setLoading(true);
    
    // Default to last entry date if no date filter is applied
    let query = supabase
      .from('vouchers')
      .select(`
        *,
        transactions (
          *,
          account:accounts(*)
        )
      `)
      .eq('company_id', companyId);

    let effectiveDateRange = { ...dateRange };
    
    if (!effectiveDateRange.from || !effectiveDateRange.to) {
        const { data: lastVoucher } = await supabase
            .from('vouchers')
            .select('date')
            .eq('company_id', companyId)
            .order('date', { ascending: false })
            .limit(1)
            .single();
            
        if (lastVoucher) {
            effectiveDateRange = { from: lastVoucher.date, to: lastVoucher.date };
        }
    }

    if (effectiveDateRange.from) query = query.gte('date', effectiveDateRange.from);
    if (effectiveDateRange.to) query = query.lte('date', effectiveDateRange.to);
    
    if (filters.voucherType) {
      query = query.eq('type', filters.voucherType);
    }

    if (filters.searchQuery) {
      query = query.or(`voucher_no.ilike.%${filters.searchQuery}%,narration.ilike.%${filters.searchQuery}%`);
    }

    if (filters.minAmount) {
      query = query.gte('amount', filters.minAmount);
    }
    if (filters.maxAmount) {
      query = query.lte('amount', filters.maxAmount);
    }

    const { data, error } = await query.order('date', { ascending: false }).order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setVouchers(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, voucherNo: string) => {
    if (!canDelete) {
      toast.error('Permission Denied', { description: 'Contact admin for deletion rights.' });
      return;
    }
    const confirmed = window.confirm(`Confirm destructive deletion of Voucher ${voucherNo}?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('vouchers').delete().eq('id', id);
      if (error) throw error;
      toast.success('Voucher Liquidated', { description: `${voucherNo} has been removed from records.` });
      fetchDaybook();
    } catch (err: any) {
      toast.error('Deletion Failed', { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const getOppositeAccount = (v: any) => {
    // If it's a payment, we want the debit accounts (not the cash/bank)
    // If it's a receipt, we want the credit accounts
    const isPayment = v.type === 'PAYMENT';
    const isReceipt = v.type === 'RECEIPT';
    
    const candidates = v.transactions.filter((t: any) => {
      // Logic: Only show accounts that are NOT in the standard payment channel groups if possible
      // or find the one that balance the voucher type.
      if (isPayment) return t.debit > 0;
      if (isReceipt) return t.credit > 0;
      return true; // For others, show anything
    });

    if (candidates.length === 0) return 'Multiple Ledgers';
    if (candidates.length === 1) return candidates[0].account?.name;
    return `${candidates[0].account?.name} & ${candidates.length - 1} more`;
  };

  const exportData = vouchers.map(v => ({
    Date: format(new Date(v.date), 'dd-MM-yyyy'),
    'Voucher No': v.voucher_no,
    'Main Account': getOppositeAccount(v),
    Type: v.type,
    Narration: v.narration,
    Amount: v.amount
  }));

  if (loading) return <div className="p-20 text-center text-slate-400 font-semibold animate-pulse uppercase tracking-[0.2em] text-[10px]">Synchronizing Audit Trail...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between no-print">
        <div>
          <h3 className="font-semibold text-slate-900 uppercase text-xs tracking-widest">Daybook Register</h3>
          <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-widest">Chronological sequence of all financial events</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onExportExcel(exportData)}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 rounded-xl transition-all border border-slate-100"
          >
            <FileDown size={20} />
          </button>
          <button 
            onClick={() => onExportPDF(exportData.map(d => Object.values(d)))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-900 text-white">
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Voucher / Ref</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Main Ledger</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5">Category</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest border-r border-white/5 text-right">Debit / Credit</th>
              <th className="px-10 py-5 text-[10px] font-semibold uppercase tracking-widest pr-10 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vouchers.map((v) => (
              <React.Fragment key={v.id}>
                <tr className={cn(
                  "hover:bg-slate-50/80 transition-all cursor-pointer group",
                  expandedVoucherId === v.id && "bg-slate-50"
                )}>
                  <td className="px-10 py-6" onClick={() => setExpandedVoucherId(expandedVoucherId === v.id ? null : v.id)}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-1 h-8 rounded-full",
                        v.type === 'PAYMENT' && "bg-rose-500",
                        v.type === 'RECEIPT' && "bg-emerald-500",
                        v.type === 'CONTRA' && "bg-indigo-500",
                        v.type === 'JOURNAL' && "bg-amber-500",
                      )} />
                      <div>
                        <p className="text-xs font-semibold text-slate-900 font-mono tracking-tighter">{v.voucher_no}</p>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{format(new Date(v.date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6" onClick={() => setExpandedVoucherId(expandedVoucherId === v.id ? null : v.id)}>
                    <p className="text-[11px] font-semibold text-slate-700 uppercase tracking-tight">{getOppositeAccount(v)}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[200px] mt-1">{v.narration}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-semibold uppercase tracking-widest",
                      v.type === 'PAYMENT' && "bg-rose-50 text-rose-600 border border-rose-100",
                      v.type === 'RECEIPT' && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                      v.type === 'CONTRA' && "bg-indigo-50 text-indigo-600 border border-indigo-100",
                      v.type === 'JOURNAL' && "bg-amber-50 text-amber-600 border border-amber-100",
                      v.type === 'SALES' && "bg-sky-50 text-sky-600 border border-sky-100",
                      v.type === 'PURCHASE' && "bg-slate-100 text-slate-600 border border-slate-200",
                    )}>
                      {v.type}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <p className="text-sm font-semibold text-slate-900 font-mono tabular-nums">{formatBDT(v.amount).replace(/[^0-9.,]/g, '')}</p>
                  </td>
                  <td className="px-10 py-6 text-right pr-10">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setViewingVoucher(v)}
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                        title="Print View"
                      >
                        <Printer size={16} />
                      </button>
                      <button 
                         onClick={() => setExpandedVoucherId(expandedVoucherId === v.id ? null : v.id)}
                         className="p-2 text-slate-300 hover:text-slate-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                         title="Detailed Audit"
                      >
                        <Eye size={16} />
                      </button>
                      {canEdit && (
                        <button 
                          onClick={() => onEdit(v)}
                          className="p-2 text-slate-300 hover:text-amber-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                          title="Modify Record"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(v.id, v.voucher_no)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                          title="Expunge Entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedVoucherId === v.id && (
                  <tr className="bg-slate-50/50">
                    <td colSpan={5} className="p-0">
                        <div className="px-20 py-8 border-y border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Technical Ledger Distribution</h4>
                            <div className="flex gap-4 text-[9px] font-medium text-slate-400">
                              <span>Ref: {v.voucher_no}</span>
                              <span>Method: {v.payment_channel || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-100/50">
                                  <th className="px-6 py-3 text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Account Name</th>
                                  <th className="px-6 py-3 text-[9px] font-semibold text-slate-500 uppercase tracking-widest text-right">Debit</th>
                                  <th className="px-6 py-3 text-[9px] font-semibold text-slate-500 uppercase tracking-widest text-right">Credit</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {v.transactions.map((t: any, tIdx: number) => (
                                  <tr key={tIdx}>
                                    <td className="px-6 py-3 text-[11px] font-medium text-slate-600 uppercase italic pl-10 border-l-4 border-indigo-500/20">{t.account?.name}</td>
                                    <td className="px-6 py-3 text-[11px] font-mono font-semibold text-right text-rose-500">
                                      {t.debit > 0 ? formatBDT(t.debit).replace(/[^0-9.,]/g, '') : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-mono font-semibold text-right text-emerald-500">
                                      {t.credit > 0 ? formatBDT(t.credit).replace(/[^0-9.,]/g, '') : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
              </React.Fragment>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-32 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Receipt className="text-slate-200" size={32} />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest italic">Temporal vacuum: No financial events discovered</p>
                </td>
              </tr>
            )}
          </tbody>
          {vouchers.length > 0 && (
            <tfoot className="bg-slate-50/80 border-t-4 border-slate-100 font-semibold backdrop-blur-sm sticky bottom-0">
              <tr>
                <td colSpan={2} className="px-10 py-6 text-[10px] text-slate-900 text-right uppercase tracking-[0.3em] font-semibold">
                  Total Entries: {vouchers.length}
                </td>
                <td className="px-10 py-6 text-[10px] text-slate-900 text-right uppercase tracking-[0.3em] font-semibold">
                  Consolidated Volume
                </td>
                <td className="px-10 py-6 text-sm font-mono font-semibold text-indigo-600 text-right tabular-nums">
                  {formatBDT(vouchers.reduce((sum, v) => sum + (Number(v.amount) || 0), 0)).replace(/[^0-9.,]/g, '')}
                </td>
                <td className="px-10 py-6"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

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

function BalanceRow({ label, value, bold }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", bold ? "font-semibold" : "text-slate-500 font-medium")}>{label}</span>
      <span className={cn("text-base font-mono", bold ? "font-semibold" : "text-slate-700 font-semibold")}>{formatBDT(value)}</span>
    </div>
  );
}

function LedgerReport({ companyId, dateRange, filters, onExportPDF, onExportExcel }: any) {
  const { profile } = useAuth();
  const { selectedCompany } = useCompany();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [viewingVoucher, setViewingVoucher] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [activeAccountSearch, setActiveAccountSearch] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setActiveAccountSearch(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (companyId) {
      supabase.from('accounts').select('*').eq('company_id', companyId).order('name').then(({ data }) => setAccounts(data || []));
    }
  }, [companyId]);

  useEffect(() => {
    if (selectedAccountId) {
      fetchLedger();
    } else {
      setTransactions([]);
      setOpeningBalance(0);
    }
  }, [selectedAccountId, dateRange, filters.voucherType]);

  const fetchLedger = async () => {
    setLoading(true);
    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('debit, credit')
      .eq('account_id', selectedAccountId)
      .lt('date', dateRange.from);
    
    const opening = (prevTransactions || []).reduce((sum, t) => sum + (t.debit - t.credit), 0);
    setOpeningBalance(opening);

    let query = supabase
      .from('transactions')
      .select(`
        *,
        voucher:vouchers(*)
      `)
      .eq('account_id', selectedAccountId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to);
    
    const { data, error } = await query
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) console.error(error);
    
    let filteredData = data || [];
    if (filters.voucherType) {
      filteredData = filteredData.filter(t => t.voucher?.type === filters.voucherType);
    }

    setTransactions(filteredData);
    setLoading(false);
  };

  let currentBalance = openingBalance;
  const ledgerRows = transactions.map(t => {
    currentBalance += (t.debit - t.credit);
    return { ...t, runningBalance: currentBalance };
  });

  const filteredRows = ledgerRows.filter(r => 
    r.voucher?.narration?.toLowerCase().includes(search.toLowerCase()) ||
    r.voucher?.voucher_no?.toLowerCase().includes(search.toLowerCase())
  );

  // Reverse for display: Most recent at the top
  const displayRows = [...filteredRows].reverse();

  const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-10 border-b border-slate-50 space-y-10 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-end">
          <div className="lg:col-span-2 space-y-3 relative" ref={searchContainerRef}>
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">Target Analytical Ledger</label>
            <div 
              className={cn(
                "w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm transition-all font-semibold flex items-center justify-between cursor-pointer group shadow-sm",
                activeAccountSearch ? "border-indigo-500 ring-4 ring-indigo-500/5" : "hover:border-slate-300"
              )}
              onClick={() => setActiveAccountSearch(!activeAccountSearch)}
            >
              <div className="flex items-center gap-4 overflow-hidden">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                  selectedAccountId ? "bg-indigo-600 text-white" : "bg-slate-50 text-slate-400"
                )}>
                  <BookOpen size={18} />
                </div>
                <div className="flex flex-col">
                  <span className={cn(selectedAccountId ? "text-slate-900 text-lg tracking-tight" : "text-slate-300 uppercase tracking-[0.2em]")}>
                    {selectedAccountId 
                      ? accounts.find(a => a.id === selectedAccountId)?.name 
                      : "Awaiting selection..."}
                  </span>
                  {selectedAccountId && (
                    <span className="text-[10px] font-mono text-slate-400 mt-0.5 font-medium uppercase tracking-widest">
                      Ledger ID: {accounts.find(a => a.id === selectedAccountId)?.code}
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown size={20} className={cn("transition-transform duration-300", activeAccountSearch ? "rotate-180 text-indigo-500" : "text-slate-300")} />
            </div>

            <div>
              {activeAccountSearch && (
                <div className="absolute left-0 right-0 top-full mt-3 bg-white border border-slate-100 shadow-2xl rounded-[2.5rem] z-[100] no-print overflow-hidden min-w-[400px]">
                  <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                    <div className="relative">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        autoFocus
                        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-4 text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold uppercase placeholder:text-slate-300"
                        placeholder="Search by name or reference ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3 space-y-1">
                    {(() => {
                      const filtered = accounts.filter(a => 
                        a.name.toLowerCase().includes(search.toLowerCase()) || 
                        a.code.includes(search)
                      );

                      const groups = ACCOUNT_GROUPS.map(group => ({
                        ...group,
                        accounts: filtered.filter(a => a.type === group.value)
                      })).filter(g => g.accounts.length > 0);

                      const groupedIds = groups.flatMap(g => g.accounts.map(a => a.id));
                      const others = filtered.filter(a => !groupedIds.includes(a.id));
                      if (others.length > 0) {
                        groups.push({ value: 'OTHER', label: 'Other Ledgers', color: 'slate', accounts: others } as any);
                      }

                      return (
                        <>
                          <div className="mb-4">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAccountId('');
                                setActiveAccountSearch(false);
                                setSearch('');
                              }}
                              className="w-full text-left px-5 py-4 rounded-2xl group flex items-center justify-between transition-all hover:bg-rose-50 border border-transparent hover:border-rose-100"
                            >
                              <span className="text-xs font-semibold text-rose-500 uppercase tracking-tight">No Selection</span>
                            </button>
                          </div>
                          {groups.map(group => (
                            <div key={group.value} className="mb-4 last:mb-0">
                              <div className="px-5 py-2 text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] mb-1">{group.label}</div>
                              <div className="grid grid-cols-1 gap-1">
                                {group.accounts.map(a => (
                                  <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAccountId(a.id);
                                      setActiveAccountSearch(false);
                                      setSearch('');
                                    }}
                                    className={cn(
                                      "w-full text-left px-5 py-4 rounded-2xl group flex items-center justify-between transition-all",
                                      selectedAccountId === a.id ? "bg-indigo-50" : "hover:bg-slate-50"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span className={cn("text-xs font-semibold uppercase tracking-tight", selectedAccountId === a.id ? "text-indigo-800" : "text-slate-700")}>{a.name}</span>
                                      <span className={cn("text-[9px] font-mono font-semibold tracking-[0.2em] mt-0.5", selectedAccountId === a.id ? "text-indigo-400" : "text-slate-400")}>{a.code}</span>
                                    </div>
                                    {selectedAccountId === a.id && (
                                      <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                                        <CheckCircle2 size={14} />
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block pl-1">In-Period Search</label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                placeholder="Audit description / narrative..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-14 pr-6 py-4 text-xs outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-semibold placeholder:text-slate-300 h-[62px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-3 justify-end h-[62px]">
            <button 
              onClick={() => onExportExcel(filteredRows.map(r => ({ Date: r.date, Narration: r.voucher?.narration, Type: r.voucher?.type, Debit: r.debit, Credit: r.credit, Balance: r.runningBalance })))}
              className="px-6 bg-white text-slate-400 hover:text-emerald-600 rounded-2xl transition-all border border-slate-200 shadow-sm flex items-center gap-2"
              title="Export to Excel"
            >
              <FileDown size={20} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Excel</span>
            </button>
            <button 
              onClick={() => {
                const docData = filteredRows.map(r => [format(new Date(r.date), 'dd/MM/yyyy'), r.voucher?.narration, r.voucher?.type, r.debit, r.credit, r.runningBalance]);
                onExportPDF(docData)
              }}
              className="px-6 bg-slate-900 text-white rounded-2xl transition-all shadow-xl shadow-slate-100 flex items-center gap-2 hover:bg-indigo-600"
              title="Generate PDF Report"
            >
              <FileText size={20} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {selectedAccountId ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest border-r border-white/5">Date</th>
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest border-r border-white/5">Particulars</th>
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest border-r border-white/5">Vch Type</th>
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest border-r border-white/5 text-right">Debit</th>
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest border-r border-white/5 text-right">Credit</th>
                <th className="px-10 py-5 text-[10px] font-medium uppercase tracking-widest text-right pr-10">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/50 border-b-2 border-slate-100">
                <td colSpan={5} className="px-10 py-5 text-[10px] uppercase tracking-[0.2em] font-semibold text-slate-400 italic">Historical Opening Balance Forward</td>
                <td className="px-10 py-5 text-sm font-mono font-semibold text-slate-900 text-right pr-10 tabular-nums">{formatBDT(openingBalance).replace(/[^0-9.,]/g, '')}</td>
              </tr>
              {displayRows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-all group">
                  <td className="px-10 py-5 text-xs font-semibold text-slate-400 whitespace-nowrap">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                  <td className="px-10 py-5">
                    <p className="text-[11px] font-medium text-slate-600 whitespace-pre-wrap max-w-sm italic leading-relaxed">{r.voucher?.narration}</p>
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mt-1">Ref: {r.voucher?.voucher_no}</p>
                  </td>
                  <td className="px-10 py-5">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">{r.voucher?.type}</span>
                  </td>
                  <td className="px-10 py-5 text-sm font-mono font-semibold text-rose-500 text-right tabular-nums">{r.debit > 0 ? formatBDT(r.debit).replace(/[^0-9.,]/g, '') : '-'}</td>
                  <td className="px-10 py-5 text-sm font-mono font-semibold text-emerald-500 text-right tabular-nums">{r.credit > 0 ? formatBDT(r.credit).replace(/[^0-9.,]/g, '') : '-'}</td>
                  <td className="px-10 py-5 text-right pr-10">
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-sm font-mono font-semibold text-indigo-600 tabular-nums">{formatBDT(r.runningBalance).replace(/[^0-9.,]/g, '')}</span>
                      <button 
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 group-hover:opacity-100 opacity-0"
                        onClick={() => setViewingVoucher(r.voucher)}
                        title="Audit Voucher"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-40 text-center">
                     <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Receipt className="text-slate-200" size={32} />
                      </div>
                      <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest italic">No transactional footprints discovered</p>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t-4 border-slate-100 font-semibold backdrop-blur-sm sticky bottom-0">
              <tr>
                <td colSpan={3} className="px-10 py-8 text-[10px] text-slate-900 text-right uppercase tracking-[0.3em] font-semibold">Analytical Totals</td>
                <td className="px-10 py-8 text-sm font-mono text-rose-600 text-right tabular-nums">{formatBDT(totalDebit).replace(/[^0-9.,]/g, '')}</td>
                <td className="px-10 py-8 text-sm font-mono text-emerald-600 text-right tabular-nums">{formatBDT(totalCredit).replace(/[^0-9.,]/g, '')}</td>
                <td className="px-10 py-8 text-sm font-mono text-indigo-700 text-right pr-10 tabular-nums">CLOSING: {formatBDT(closingBalance).replace(/[^0-9.,]/g, '')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-32 text-center space-y-4">
          <div className="inline-flex p-6 bg-slate-50 rounded-3xl text-slate-200 border border-slate-100 shadow-inner">
            <Search size={40} />
          </div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-[0.2em]">Awaiting Ledger Protocol Initialization</p>
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
