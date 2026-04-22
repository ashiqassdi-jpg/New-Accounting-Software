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
  Printer
} from 'lucide-react';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { formatBDT, ACCOUNT_GROUPS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';

type ReportTab = 'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'LEDGER_REPORT';

export default function Reports() {
  const { selectedCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<ReportTab>('TRIAL_BALANCE');
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Financial Reports
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Standard Compliance Reporting</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 pl-3">
              <Calendar size={16} className="text-slate-400" />
            </div>
            <div className="flex items-center gap-2 pr-4">
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent"
              />
              <span className="text-slate-300">→</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="text-xs font-bold text-slate-700 outline-none border-none bg-transparent"
              />
            </div>
          </div>
          
          <button className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-100">
        <TabButton 
          active={activeTab === 'TRIAL_BALANCE'} 
          onClick={() => setActiveTab('TRIAL_BALANCE')}
          label="Trial Balance"
        />
        <TabButton 
          active={activeTab === 'BALANCE_SHEET'} 
          onClick={() => setActiveTab('BALANCE_SHEET')}
          label="Balance Sheet"
        />
        <TabButton 
          active={activeTab === 'LEDGER_REPORT'} 
          onClick={() => setActiveTab('LEDGER_REPORT')}
          label="Ledger Report"
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
          {activeTab === 'TRIAL_BALANCE' && <TrialBalance companyId={selectedCompany?.id} dateRange={dateRange} />}
          {activeTab === 'BALANCE_SHEET' && <BalanceSheet companyId={selectedCompany?.id} dateRange={dateRange} />}
          {activeTab === 'LEDGER_REPORT' && <LedgerReport companyId={selectedCompany?.id} dateRange={dateRange} />}
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
function TrialBalance({ companyId, dateRange }: any) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) fetchTrialBalance();
  }, [companyId, dateRange]);

  const fetchTrialBalance = async () => {
    setLoading(true);
    // Fetch accounts and their transaction sums within the range
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId);

    if (accError) {
      console.error(accError);
      setLoading(false);
      return;
    }

    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .gte('date', dateRange.from)
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
      
      // Calculate net balance including opening balance
      // Logic depends on account type. Assets/Expenses are DR+, Liabilities/Equity/Income are CR+.
      let netDebit = 0;
      let netCredit = 0;

      const balance = acc.opening_balance + (totalDebit - totalCredit);
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

  const totalDebit = data.reduce((sum, acc) => sum + acc.debit, 0);
  const totalCredit = data.reduce((sum, acc) => sum + acc.credit, 0);

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Calculating Ledger Equilibrium...</div>;

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Trial Balance Summary</h3>
        <Download size={18} className="text-slate-300" />
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
            {data.map(acc => (
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
            {data.length === 0 && (
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

function BalanceSheet({ companyId, dateRange }: any) {
  const [data, setData] = useState({ assets: [], liabilities: [], equity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) fetchBalanceSheet();
  }, [companyId, dateRange]);

  const fetchBalanceSheet = async () => {
    setLoading(true);
    const { data: accounts } = await supabase
      .from('accounts')
      .select('*')
      .eq('company_id', companyId);

    if (accounts) {
      const assets = accounts.filter(a => a.type === 'ASSET');
      const liabilities = accounts.filter(a => a.type === 'LIABILITY');
      const equity = accounts.filter(a => a.type === 'EQUITY');
      
      setData({ assets, liabilities, equity });
    }
    setLoading(false);
  };

  const totalAssets = data.assets.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);
  const totalLiabilities = data.liabilities.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);
  const totalEquity = data.equity.reduce((sum: number, a: any) => sum + (a.current_balance || 0), 0);

  if (loading) return <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Compiling Balance Sheet...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-10">
        <h3 className="font-bold text-emerald-600 uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          Assets
        </h3>
        <div className="space-y-4">
          {data.assets.filter((a: any) => a.current_balance !== 0).map((a: any) => (
            <BalanceRow key={a.id} label={a.name} value={a.current_balance} />
          ))}
          <div className="pt-6 border-t border-slate-50 mt-10">
            <BalanceRow label="Total Assets" value={totalAssets} bold />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-10">
          <h3 className="font-bold text-indigo-600 uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            Liabilities
          </h3>
          <div className="space-y-4">
            {data.liabilities.filter((a: any) => a.current_balance !== 0).map((a: any) => (
              <BalanceRow key={a.id} label={a.name} value={Math.abs(a.current_balance)} />
            ))}
            <div className="pt-6 border-t border-slate-50 mt-4">
              <BalanceRow label="Total Liabilities" value={Math.abs(totalLiabilities)} bold />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden p-10">
          <h3 className="font-bold text-amber-600 uppercase text-xs tracking-widest mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Equity
          </h3>
          <div className="space-y-4">
            {data.equity.filter((a: any) => a.current_balance !== 0).map((a: any) => (
              <BalanceRow key={a.id} label={a.name} value={Math.abs(a.current_balance)} />
            ))}
            <div className="pt-6 border-t border-slate-50 mt-4">
              <BalanceRow label="Total Equity" value={Math.abs(totalEquity)} bold />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-[2rem] p-10 shadow-xl shadow-slate-200">
           <BalanceRow label="Total Liabilities & Equity" value={Math.abs(totalLiabilities) + Math.abs(totalEquity)} bold />
        </div>
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

function LedgerReport({ companyId, dateRange }: any) {
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    }
  }, [selectedAccountId, dateRange]);

  const fetchLedger = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        voucher:vouchers(*)
      `)
      .eq('account_id', selectedAccountId)
      .gte('date', dateRange.from)
      .lte('date', dateRange.to)
      .order('date', { ascending: true });
    
    setTransactions(data || []);
    setLoading(false);
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 md:items-end justify-between">
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
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {selectedAccountId ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Voucher #</th>
                <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit</th>
                <th className="px-8 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="bg-slate-50/20 italic">
                <td colSpan={3} className="px-8 py-4 text-sm font-bold text-slate-500">Opening Balance forward</td>
                <td colSpan={2} className="px-8 py-4 text-sm font-mono font-bold text-slate-900 text-right">{formatBDT(selectedAccount?.opening_balance || 0)}</td>
              </tr>
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 text-sm font-bold text-slate-400">{format(new Date(t.date), 'dd/MM/yyyy')}</td>
                  <td className="px-8 py-4 text-sm font-mono font-bold text-slate-900">{t.voucher?.voucher_no}</td>
                  <td className="px-8 py-4 text-sm font-medium text-slate-500">{t.voucher?.narration}</td>
                  <td className="px-8 py-4 text-sm font-mono font-black text-rose-600 text-right">{t.debit > 0 ? formatBDT(t.debit) : '-'}</td>
                  <td className="px-8 py-4 text-sm font-mono font-black text-emerald-600 text-right">{t.credit > 0 ? formatBDT(t.credit) : '-'}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-300 font-medium italic">No transactions found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-20 text-center space-y-4">
          <div className="inline-flex p-4 bg-slate-50 rounded-full text-slate-300">
            <Search size={32} />
          </div>
          <p className="text-slate-400 text-sm font-medium">Select a ledger from the cockpit above to analyze historical flows.</p>
        </div>
      )}
    </div>
  );
}
