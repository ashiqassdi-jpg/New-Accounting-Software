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
  X
} from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { formatBDT, ACCOUNT_GROUPS, VOUCHER_TYPES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';

import { useAuth } from '../hooks/useAuth';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import VoucherPrintPreview from '../components/VoucherPrintPreview';

type ReportTab = 'TRIAL_BALANCE' | 'DAYBOOK' | 'LEDGER_REPORT';

export default function Reports() {
  const { selectedCompany } = useCompany();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportTab>('DAYBOOK');

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
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [confirmedDateRange, setConfirmedDateRange] = useState(dateRange);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    accountType: '',
    accountId: '',
    voucherType: ''
  });

  const resetFilters = () => {
    setFilters({
      accountType: '',
      accountId: '',
      voucherType: ''
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 font-sans tracking-tight leading-none">
            Reports
          </h1>
          <p className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-widest leading-none">
            Compliance & Financial Insights
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-400">
              <Calendar size={12} />
              <span className="text-[9px] font-black uppercase tracking-wider">Range</span>
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
              className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-100"
            >
              Sync
            </button>
          </div>
          
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "px-3 py-2 rounded-xl transition-all shadow-sm border flex items-center gap-2",
              showAdvancedFilters 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
            )}
            title="Advanced Filters"
          >
            <Filter size={16} />
            <span className="text-[11px] font-bold uppercase tracking-widest hidden sm:inline">Filters</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm no-print"
            title="Print Report"
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      <AnimatePresence>
        {(filters.accountType || filters.voucherType) && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-wrap gap-2 px-1 no-print"
          >
            {filters.accountType && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                Account: {ACCOUNT_GROUPS.find(g => g.value === filters.accountType)?.label}
                <button onClick={() => setFilters(prev => ({ ...prev, accountType: '' }))} className="hover:text-indigo-800">
                  <X size={12} />
                </button>
              </div>
            )}
            {filters.voucherType && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                Voucher: {VOUCHER_TYPES.find(v => v.value === filters.voucherType)?.label}
                <button onClick={() => setFilters(prev => ({ ...prev, voucherType: '' }))} className="hover:text-rose-800">
                  <X size={12} />
                </button>
              </div>
            )}
            <button 
              onClick={resetFilters}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline underline-offset-4 px-2"
            >
              Reset All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Advanced Filters Modal */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdvancedFilters(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] no-print"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[15%] md:left-1/2 md:-translate-x-1/2 md:max-w-lg bg-white rounded-[2.5rem] shadow-2xl z-[101] border border-slate-100 no-print overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Advanced Filtering</h2>
                    <p className="text-sm text-slate-500 font-medium">Refine your report parameters</p>
                  </div>
                  <button 
                    onClick={() => setShowAdvancedFilters(false)}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-2xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block pl-1">Primary Ledger Group</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setFilters(prev => ({ ...prev, accountType: '' }))}
                        className={cn(
                          "px-4 py-3 rounded-2xl text-xs font-bold transition-all border",
                          filters.accountType === '' 
                            ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-200" 
                            : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                        )}
                      >
                        All Types
                      </button>
                      {ACCOUNT_GROUPS.map(g => (
                        <button 
                          key={g.value}
                          onClick={() => setFilters(prev => ({ ...prev, accountType: g.value }))}
                          className={cn(
                            "px-4 py-3 rounded-2xl text-xs font-bold transition-all border",
                            filters.accountType === g.value 
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                              : "bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100"
                          )}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block pl-1">Voucher Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {VOUCHER_TYPES.map(v => (
                        <button 
                          key={v.value}
                          onClick={() => setFilters(prev => ({ ...prev, voucherType: prev.voucherType === v.value ? '' : v.value }))}
                          className={cn(
                            "px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border",
                            filters.voucherType === v.value 
                              ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100" 
                              : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100"
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={resetFilters}
                    className="flex-1 py-4 text-xs font-bold text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                  >
                    Reset Filters
                  </button>
                  <button 
                    onClick={() => setShowAdvancedFilters(false)}
                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                  >
                    Show Results
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
              onExportPDF={(data: any) => handleExportPDF(data, 'Daybook', ['Voucher #', 'Ledger', 'Type', 'Method', 'Description', 'Amount'], 'daybook')}
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

function Daybook({ companyId, dateRange, filters, onExportPDF, onExportExcel }: any) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    if (companyId) {
      fetchDaybook();
      supabase.from('accounts').select('id, name').eq('company_id', companyId).then(({ data }) => setAccounts(data || []));
    }
  }, [companyId, dateRange, filters.voucherType, selectedAccountId]);

  const fetchDaybook = async () => {
    setLoading(true);
    let query = supabase
      .from('vouchers')
      .select(`
        *,
        transactions (
          *,
          account:accounts(name)
        )
      `)
      .eq('company_id', companyId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to);
    
    if (filters.voucherType) {
      query = query.eq('type', filters.voucherType);
    }

    const { data, error } = await query.order('date', { ascending: true }).order('voucher_no', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      let filtered = data || [];
      if (selectedAccountId) {
        filtered = filtered.filter(v => v.transactions.some((t: any) => t.account_id === selectedAccountId));
      }
      setVouchers(filtered);
    }
    setLoading(false);
  };

  const daybookData = vouchers.flatMap(v => 
    v.transactions.map((t: any) => ({
      voucher_no: v.voucher_no,
      ledger_name: t.account?.name,
      type: v.type,
      payment_method: v.payment_channel,
      description: v.narration,
      amount: t.debit > 0 ? t.debit : (t.credit * -1)
    }))
  );

  const totalAmount = vouchers.reduce((sum, v) => 
    sum + v.transactions.reduce((vSum: number, t: any) => vSum + (Number(t.debit) || 0), 0)
  , 0);

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Scanning the Daybook...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-4 flex-1">
          <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest whitespace-nowrap">Daybook</h3>
          <div className="max-w-xs w-full">
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-[11px] font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
            >
              <option value="">Filter by Specific Account...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onExportExcel(daybookData)}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"
            title="Export to Excel"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={() => onExportPDF(daybookData.map(d => [d.voucher_no, d.ledger_name, d.type, d.payment_method, d.description, d.amount]))}
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
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
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voucher No</th>
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ledger Name</th>
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
              <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
              <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {vouchers.map(v => v.transactions.map((t: any, idx: number) => (
              <tr key={`${v.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                <td className="px-8 py-4 text-sm font-mono font-bold text-slate-900">{v.voucher_no}</td>
                <td className="px-8 py-4 text-sm font-semibold text-slate-700">{t.account?.name}</td>
                <td className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.type}</td>
                <td className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.payment_channel}</td>
                <td className="px-8 py-4 text-sm font-medium text-slate-500">{v.narration}</td>
                <td className={cn(
                  "px-8 py-4 text-sm font-mono font-black text-right",
                  t.debit > 0 ? "text-rose-600" : "text-emerald-600"
                )}>
                  {formatBDT(t.debit > 0 ? t.debit : t.credit)}
                </td>
              </tr>
            )))}
            {vouchers.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center text-slate-300 font-medium italic">No transactions recorded matching the criteria.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50/80 border-t-2 border-slate-100 font-black">
            <tr>
              <td colSpan={5} className="px-8 py-6 text-sm text-slate-900 text-right uppercase tracking-widest">Total Transaction Value</td>
              <td className="px-8 py-6 text-sm font-mono text-indigo-600 text-right">{formatBDT(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
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
