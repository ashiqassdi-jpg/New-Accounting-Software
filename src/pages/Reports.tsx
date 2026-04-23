/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  FileDown
} from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatBDT, ACCOUNT_GROUPS, VOUCHER_TYPES, PAYMENT_CHANNELS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import VoucherForm from '../components/VoucherForm';
import VoucherPrintPreview from '../components/VoucherPrintPreview';
import { Voucher, VoucherType } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportTab = 'TRIAL_BALANCE' | 'DAYBOOK' | 'LEDGER_REPORT';

export default function Reports() {
  const { selectedCompany } = useCompany();
  const { profile, canEdit, canDelete } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('DAYBOOK');
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
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
      <AnimatePresence mode="wait">
        {editingVoucher ? (
          <VoucherForm 
            editingVoucher={editingVoucher}
            onSuccess={() => {
              setEditingVoucher(null);
            }}
            onCancel={() => setEditingVoucher(null)}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight leading-none">
                  Financial Reports
                </h1>
                <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest leading-none">
                  Governance & Audit Protocols
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="inline-flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm no-print">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-400 border border-slate-100">
                    <Calendar size={12} />
                    <span className="text-[9px] font-black uppercase tracking-wider">Audit Range</span>
                  </div>
                  <div className="flex items-center gap-1.5 pr-1">
                    <input 
                      type="date" 
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="text-[11px] font-bold text-slate-700 outline-none border-none bg-transparent w-24"
                    />
                    <span className="text-slate-300 text-[10px]">/</span>
                    <input 
                      type="date" 
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="text-[11px] font-bold text-slate-700 outline-none border-none bg-transparent w-24"
                    />
                  </div>
                  <button 
                    onClick={() => setConfirmedDateRange(dateRange)}
                    className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-md shadow-slate-100"
                  >
                    Load
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={cn(
                    "px-4 py-2.5 rounded-xl transition-all shadow-sm border flex items-center gap-2",
                    showAdvancedFilters 
                      ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                      : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Filter size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Deep Filter</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Modal (Enhanced) */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAdvancedFilters(false)}
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
                            Analytical Parameters
                          </h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Refining financial visibility</p>
                        </div>
                        <button 
                          onClick={() => setShowAdvancedFilters(false)}
                          className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all shadow-sm"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Voucher Identification</label>
                          <div className="relative">
                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input 
                              placeholder="Search Narrative or #..."
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold"
                              value={filters.searchQuery}
                              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Value Thresholds (৳)</label>
                          <div className="flex gap-2">
                            <input 
                              placeholder="Min"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                              value={filters.minAmount}
                              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                            />
                            <input 
                              placeholder="Max"
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-mono font-bold"
                              value={filters.maxAmount}
                              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Document Category</label>
                          <div className="flex flex-wrap gap-2">
                            {VOUCHER_TYPES.map(v => (
                              <button 
                                key={v.value}
                                onClick={() => setFilters(prev => ({ ...prev, voucherType: prev.voucherType === v.value ? '' : v.value }))}
                                className={cn(
                                  "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                                  filters.voucherType === v.value 
                                    ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200 scale-105" 
                                    : "bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100"
                                )}
                              >
                                {v.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 flex gap-4">
                        <button 
                          onClick={resetFilters}
                          className="px-8 py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                          Reset
                        </button>
                        <button 
                          onClick={() => setShowAdvancedFilters(false)}
                          className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
                        >
                          Execute Analysis
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

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

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
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
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
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
  }, [companyId, dateRange]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    // Fetch accounts and their transaction sums within the range
    let accQuery = supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId);
    
    if (filters.accountType) {
      accQuery = accQuery.eq('type', filters.accountType);
    }

    const { data: accounts, error: accError } = await accQuery;

    if (accError) {
      console.error(accError);
      setLoading(false);
      return;
    }

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .lte('date', dateRange.to);

    if (transError) {
      console.error(transError);
      setLoading(false);
      return;
    }

    const trialBalance = accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.account_id === acc.id);
      const totalDebit = accTransactions.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
      const totalCredit = accTransactions.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
      
      let netDebit = 0;
      let netCredit = 0;

      const balance = (totalDebit - totalCredit);
      if (balance > 0) netDebit = balance;
      else if (balance < 0) netCredit = Math.abs(balance);

      return {
        ...acc,
        debit: netDebit,
        credit: netCredit
      };
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

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Calculating Ledger Equilibrium...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest whitespace-nowrap">Trial Balance</h3>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input 
              type="text"
              placeholder="Search account name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-[11px] font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onExportExcel(filteredData.map(acc => ({ Code: acc.code, Account: acc.name, Debit: acc.debit, Credit: acc.credit })))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all hover:bg-slate-100"
            title="Export to Excel"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => onExportPDF(filteredData.map(acc => [acc.code, acc.name, acc.debit, acc.credit]))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all hover:bg-slate-100"
            title="Export to PDF"
          >
            <FileText size={20} />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Code</th>
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Name</th>
              <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit (৳)</th>
              <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.map(acc => (
              <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4 text-sm font-mono text-slate-400">{acc.code}</td>
                <td className="px-8 py-4 text-sm font-semibold text-slate-700">{acc.name}</td>
                <td className="px-8 py-4 text-sm font-mono text-slate-900 text-right">
                  {acc.debit > 0 ? formatBDT(acc.debit) : '-'}
                </td>
                <td className="px-8 py-4 text-sm font-mono text-slate-900 text-right">
                  {acc.credit > 0 ? formatBDT(acc.credit) : '-'}
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={4} className="py-20 text-center text-slate-300 font-medium italic">No ledger activity found for this period.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50/80 border-t-2 border-slate-100">
            <tr>
              <td colSpan={2} className="px-8 py-6 text-sm font-bold text-slate-900 text-right uppercase tracking-widest">Total</td>
              <td className="px-8 py-6 text-sm font-mono font-black text-indigo-600 text-right">{formatBDT(totalDebit)}</td>
              <td className="px-8 py-6 text-sm font-mono font-black text-indigo-600 text-right">{formatBDT(totalCredit)}</td>
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
    let query = supabase
      .from('vouchers')
      .select(`
        *,
        transactions (
          *,
          account:accounts(*)
        )
      `)
      .eq('company_id', companyId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to);
    
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

  if (loading) return <div className="p-20 text-center text-slate-400 font-black animate-pulse uppercase tracking-[0.2em] text-[10px]">Synchronizing Audit Trail...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between no-print">
        <div>
          <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Daybook Register</h3>
          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Chronological sequence of all financial events</p>
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
              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Voucher / Ref</th>
              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Main Ledger</th>
              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/5">Category</th>
              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest border-r border-white/5 text-right">Debit / Credit</th>
              <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest pr-10 text-right">Actions</th>
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
                        <p className="text-xs font-black text-slate-900 font-mono tracking-tighter">{v.voucher_no}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(v.date), 'dd MMM yyyy')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6" onClick={() => setExpandedVoucherId(expandedVoucherId === v.id ? null : v.id)}>
                    <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{getOppositeAccount(v)}</p>
                    <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px] mt-1">{v.narration}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
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
                    <p className="text-sm font-black text-slate-900 font-mono tabular-nums">{formatBDT(v.amount).replace(/[^0-9.,]/g, '')}</p>
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
                <AnimatePresence>
                  {expandedVoucherId === v.id && (
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-50/50"
                    >
                      <td colSpan={5} className="p-0">
                        <div className="px-20 py-8 border-y border-slate-100 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Technical Ledger Distribution</h4>
                            <div className="flex gap-4 text-[9px] font-bold text-slate-400">
                              <span>Ref: {v.voucher_no}</span>
                              <span>Method: {v.payment_channel || 'N/A'}</span>
                            </div>
                          </div>
                          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-slate-100/50">
                                  <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest">Account Name</th>
                                  <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Debit</th>
                                  <th className="px-6 py-3 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Credit</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {v.transactions.map((t: any, tIdx: number) => (
                                  <tr key={tIdx}>
                                    <td className="px-6 py-3 text-[11px] font-bold text-slate-600 uppercase italic pl-10 border-l-4 border-indigo-500/20">{t.account?.name}</td>
                                    <td className="px-6 py-3 text-[11px] font-mono font-black text-right text-rose-500">
                                      {t.debit > 0 ? formatBDT(t.debit).replace(/[^0-9.,]/g, '') : '-'}
                                    </td>
                                    <td className="px-6 py-3 text-[11px] font-mono font-black text-right text-emerald-500">
                                      {t.credit > 0 ? formatBDT(t.credit).replace(/[^0-9.,]/g, '') : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-32 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                    <Receipt className="text-slate-200" size={32} />
                  </div>
                  <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">Temporal vacuum: No financial events discovered</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

function BalanceRow({ label, value, bold }: any) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", bold ? "font-bold" : "text-slate-500 font-medium")}>{label}</span>
      <span className={cn("text-base font-mono", bold ? "font-black" : "text-slate-700 font-bold")}>{formatBDT(value)}</span>
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
    
    // 1. Fetch Opening Balance (Sum of all transactions before dateRange.from)
    const { data: prevTransactions } = await supabase
      .from('transactions')
      .select('debit, credit')
      .eq('account_id', selectedAccountId)
      .lt('date', dateRange.from);
    
    const opening = (prevTransactions || []).reduce((sum, t) => sum + (t.debit - t.credit), 0);
    setOpeningBalance(opening);

    // 2. Fetch current period transactions
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

  // Calculate Running Balance
  let currentBalance = openingBalance;
  const ledgerRows = transactions.map(t => {
    currentBalance += (t.debit - t.credit);
    return {
      ...t,
      runningBalance: currentBalance
    };
  });

  const filteredRows = ledgerRows.filter(r => 
    r.voucher?.narration?.toLowerCase().includes(search.toLowerCase()) ||
    r.voucher?.voucher_no?.toLowerCase().includes(search.toLowerCase())
  );

  const totalDebit = filteredRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = filteredRows.reduce((sum, r) => sum + r.credit, 0);
  const closingBalance = openingBalance + totalDebit - totalCredit;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 space-y-6">
        <div className="flex flex-col md:flex-row gap-6 md:items-end justify-between">
          <div className="max-w-xs w-full space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Select Ledger Account</label>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold text-slate-700"
            >
              <option value="">Choose an account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
            </select>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
              placeholder="Filter by narration or voucher #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 no-print">
            <button 
              onClick={() => onExportExcel(filteredRows.map(r => ({ Date: r.date, Narration: r.voucher?.narration, Type: r.voucher?.type, Debit: r.debit, Credit: r.credit, Balance: r.runningBalance })))}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all border border-indigo-100"
            >
              <Download size={16} /> Export Excel
            </button>
            <button 
              onClick={() => {
                const docData = filteredRows.map(r => [format(new Date(r.date), 'dd/MM/yyyy'), r.voucher?.narration, r.voucher?.type, r.debit, r.credit, r.runningBalance]);
                onExportPDF(docData)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-100 transition-all border border-rose-100"
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>
      </div>

      {selectedAccountId ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Narration</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest pr-12">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="bg-slate-50/20 italic font-bold">
                <td colSpan={5} className="px-8 py-4 text-[10px] uppercase tracking-widest text-slate-400">Opening Balance forward</td>
                <td className="px-8 py-4 text-sm font-mono text-slate-900 text-right pr-12">{formatBDT(openingBalance)}</td>
              </tr>
              {filteredRows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 text-sm font-bold text-slate-400">{format(new Date(r.date), 'dd/MM/yyyy')}</td>
                  <td className="px-8 py-4 text-sm font-medium text-slate-500 whitespace-pre-wrap max-w-md">{r.voucher?.narration}</td>
                  <td className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.voucher?.type}</td>
                  <td className="px-8 py-4 text-sm font-mono font-black text-rose-600 text-right">{r.debit > 0 ? formatBDT(r.debit) : '-'}</td>
                  <td className="px-8 py-4 text-sm font-mono font-black text-emerald-600 text-right">{r.credit > 0 ? formatBDT(r.credit) : '-'}</td>
                  <td className="px-8 py-4 text-sm font-mono font-black text-indigo-600 text-right pr-12">
                    <div className="flex items-center justify-end gap-3 text-right">
                      {formatBDT(r.runningBalance)}
                      <button 
                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                        onClick={() => setViewingVoucher(r.voucher)}
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-300 font-medium italic">No transactions found for the selected criteria.</td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50/80 border-t-2 border-slate-100 font-black">
              <tr>
                <td colSpan={3} className="px-8 py-6 text-[10px] text-slate-900 text-right uppercase tracking-widest">Total For Period</td>
                <td className="px-8 py-6 text-sm font-mono text-rose-600 text-right">{formatBDT(totalDebit)}</td>
                <td className="px-8 py-6 text-sm font-mono text-emerald-600 text-right">{formatBDT(totalCredit)}</td>
                <td className="px-8 py-6 text-sm font-mono text-indigo-600 text-right pr-12">Closing: {formatBDT(closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="p-20 text-center space-y-4">
          <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-300">
            <Search size={32} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Select a ledger from the list to review detailed transaction statements.</p>
        </div>
      )}
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
