/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  BarChart3, 
  PieChart as PieChartIcon,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Coins,
  Printer,
  X,
  FileText,
  BookOpen,
  ArrowRight,
  ClipboardList,
  Scale
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar,
  Legend
} from 'recharts';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { motion } from 'motion/react';
import { StatCard } from '../components/dashboard/StatCard';
import { ChartBox } from '../components/dashboard/ChartBox';
import { formatBDT, getDisplayBalance } from '../constants';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#94a3b8', '#fbbf24', '#f43f5e', '#8b5cf6'];

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [confirmedDateRange, setConfirmedDateRange] = useState(dateRange);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalLiabilities: 0,
    cashBalance: 0,
    bankBalance: 0,
    bkashBalance: 0,
    nagadBalance: 0
  });

  const [loading, setLoading] = useState(true);

  const [chartData, setChartData] = useState<any[]>([]);

  const [expenseDistribution, setExpenseDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      fetchStats();
      fetchChartData();
      fetchExpenseDistribution();
    }
  }, [selectedCompany, confirmedDateRange]);

  const fetchExpenseDistribution = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('debit, credit, accounts!inner(name, type)')
        .eq('company_id', selectedCompany!.id)
        .eq('accounts.type', 'EXPENSE');

      if (confirmedDateRange.from) query = query.gte('date', confirmedDateRange.from);
      if (confirmedDateRange.to) query = query.lte('date', confirmedDateRange.to);

      const { data: transactions } = await query;

      if (!transactions) return;

      const grouped: { [key: string]: number } = {};
      transactions.forEach((t: any) => {
        const name = t.accounts.name;
        grouped[name] = (grouped[name] || 0) + (Number(t.debit) || 0) - (Number(t.credit) || 0);
      });

      const formatted = Object.keys(grouped).map(name => ({
        name,
        value: Math.max(0, grouped[name])
      })).filter(e => e.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);

      setExpenseDistribution(formatted.length > 0 ? formatted : [
        { name: 'N/A', value: 0 }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChartData = async () => {
    try {
      let query = supabase
        .from('transactions')
        .select('date, debit, credit, accounts!inner(type)')
        .eq('company_id', selectedCompany!.id);

      if (confirmedDateRange.from) query = query.gte('date', confirmedDateRange.from);
      if (confirmedDateRange.to) query = query.lte('date', confirmedDateRange.to);

      const { data: transactions } = await query;

      if (!transactions) return;

      const monthlyData: { [key: string]: { liabilities: number; equity: number } } = {};
      
      transactions.forEach((t: any) => {
        const month = format(new Date(t.date), 'MMM');
        if (!monthlyData[month]) monthlyData[month] = { liabilities: 0, equity: 0 };
        
        if (t.accounts.type === 'LIABILITY') {
          monthlyData[month].liabilities += (Number(t.credit) || 0) - (Number(t.debit) || 0);
        } else if (t.accounts.type === 'EQUITY') {
          monthlyData[month].equity += (Number(t.credit) || 0) - (Number(t.debit) || 0);
        }
      });

      const formatted = Object.keys(monthlyData).map(month => ({
        name: month,
        liabilities: monthlyData[month].liabilities,
        equity: monthlyData[month].equity
      }));

      setChartData(formatted.length > 0 ? formatted.sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.name) - months.indexOf(b.name);
      }) : [
        { name: 'N/A', liabilities: 0, equity: 0 }
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', selectedCompany!.id);

      if (!accounts) return;

      // 1. Fetch transactions WITHIN range for P&L items
      let transQuery = supabase
        .from('transactions')
        .select('account_id, debit, credit, accounts!inner(type)')
        .eq('company_id', selectedCompany!.id);

      if (confirmedDateRange.from) transQuery = transQuery.gte('date', confirmedDateRange.from);
      if (confirmedDateRange.to) transQuery = transQuery.lte('date', confirmedDateRange.to);

      const { data: transactions } = await transQuery;

      // 2. Fetch cumulative transactions UP TO end date for Balance Sheet items
      let balanceQuery = supabase
        .from('transactions')
        .select('account_id, debit, credit')
        .eq('company_id', selectedCompany!.id);
      
      if (confirmedDateRange.to) balanceQuery = balanceQuery.lte('date', confirmedDateRange.to);
      const { data: balanceTransactions } = await balanceQuery;

      // Helper to get cumulative balance from transactions
      const calculateBalance = (accountId: string, type: string) => {
        const accTrans = balanceTransactions?.filter(t => t.account_id === accountId) || [];
        const totalDebit = accTrans.reduce((sum, t) => sum + (Number(t.debit) || 0), 0);
        const totalCredit = accTrans.reduce((sum, t) => sum + (Number(t.credit) || 0), 0);
        
        let balance = 0;
        if (['ASSET', 'EXPENSE'].includes(type)) {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }
        return balance;
      };

      const getAccountBalance = (name: string) => {
        const acc = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
        return acc ? calculateBalance(acc.id, acc.type) : 0;
      };

      // Aggregating revenue and expenses from transactions in date range
      const totalRevenue = transactions
        ?.filter(t => (t as any).accounts.type === 'INCOME')
        .reduce((sum, t) => sum + (Number(t.credit) || 0) - (Number(t.debit) || 0), 0) || 0;

      const totalExpenses = transactions
        ?.filter(t => (t as any).accounts.type === 'EXPENSE')
        .reduce((sum, t) => sum + (Number(t.debit) || 0) - (Number(t.credit) || 0), 0) || 0;

      setStats({
        totalRevenue: Math.max(0, totalRevenue),
        totalExpenses: Math.max(0, totalExpenses),
        totalLiabilities: accounts
          .filter(a => a.type === 'LIABILITY')
          .reduce((sum, a) => sum + calculateBalance(a.id, a.type), 0),
        cashBalance: getAccountBalance('Cash'),
        bankBalance: getAccountBalance('Bank'),
        bkashBalance: getAccountBalance('bKash'),
        nagadBalance: getAccountBalance('Nagad')
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 font-sans tracking-tight leading-none">
            Dashboard
          </h1>
          <p className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase tracking-widest truncate max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl" title={selectedCompany?.name || 'Vanguard Entity'}>
            {selectedCompany?.name || 'Vanguard Entity'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm no-print">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg text-slate-400">
              <Calendar size={12} />
              <span className="text-[9px] font-semibold uppercase tracking-wider">Period</span>
            </div>
            <div className="flex items-center gap-1.5 pr-1">
              <DateRangeFilter value={dateRange} onChange={setDateRange} compact />
            </div>
            <button 
              onClick={() => setConfirmedDateRange(dateRange)}
              className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-100"
            >
              Sync
            </button>
          </div>

          <button 
            onClick={() => window.print()}
            className="p-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm no-print"
            title="Print Dashboard"
          >
            <Printer size={20} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={stats.totalRevenue} 
          icon={TrendingUp} 
          color="emerald" 
        />
        <StatCard 
          title="Total Expenses" 
          value={stats.totalExpenses} 
          icon={TrendingDown} 
          color="rose" 
        />
        <StatCard 
          title="Total Liabilities" 
          value={stats.totalLiabilities} 
          icon={Wallet} 
          color="amber" 
        />
        <StatCard 
          title="Cash Balance" 
          value={stats.cashBalance} 
          icon={Banknote} 
          color="slate" 
        />
        <StatCard 
          title="Bank Balance" 
          value={stats.bankBalance} 
          icon={CreditCard} 
          color="indigo" 
        />
        <StatCard 
          title="bKash Balance" 
          value={stats.bkashBalance} 
          icon={Smartphone} 
          color="amber" 
        />
        <StatCard 
          title="Nagad Balance" 
          value={stats.nagadBalance} 
          icon={Coins} 
          color="rose" 
        />
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartBox title="Liabilities vs Equity" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorLiab" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `৳${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                formatter={(val: number) => formatBDT(val)}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }} />
              <Area type="monotone" dataKey="liabilities" name="Liabilities" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorLiab)" />
              <Area type="monotone" dataKey="equity" name="Equity" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorEq)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Operating Expenses" icon={PieChartIcon}>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full flex justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expenseDistribution}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                    cx="50%"
                    cy="50%"
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} radius={4} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => formatBDT(val)}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="shrink-0 space-y-3 px-6 border-l border-slate-50 md:min-w-[200px]">
              {expenseDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartBox>
      </div>

      {/* Reports Intelligence Hub */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2">
              <ClipboardList size={14} className="text-indigo-500" />
              Financial Intelligence Hub
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-1">Direct access to regulatory & analytical reporting</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportShortcut 
            title="Daybook Register" 
            desc="Chronological audit trail of all events"
            icon={BookOpen}
            to="/reports?tab=DAYBOOK"
            color="indigo"
          />
          <ReportShortcut 
            title="Ledger Statement" 
            desc="Deep dive into specific account activity"
            icon={FileText}
            to="/reports?tab=LEDGER_REPORT"
            color="emerald"
          />
          <ReportShortcut 
            title="Trial Balance" 
            desc="Verification of ledger equilibrium"
            icon={Scale}
            to="/reports?tab=TRIAL_BALANCE"
            color="amber"
          />
          <ReportShortcut 
            title="P&L Statement" 
            desc="Performance analysis & profitability"
            icon={BarChart3}
            to="/reports?tab=PROFIT_LOSS"
            color="rose"
          />
          <ReportShortcut 
            title="Balance Sheet" 
            desc="Snapshot of financial position"
            icon={TrendingUp}
            to="/reports?tab=BALANCE_SHEET"
            color="slate"
          />
          <ReportShortcut 
            title="Chart of Accounts" 
            desc="Management of fiscal infrastructure"
            icon={PieChartIcon}
            to="/coa"
            color="indigo"
          />
        </div>
      </div>
    </div>
  );
}

function ReportShortcut({ title, desc, icon: Icon, to, color }: any) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100/50 hover:bg-indigo-100/50",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100/50 hover:bg-emerald-100/50",
    amber: "bg-amber-50 text-amber-600 border-amber-100/50 hover:bg-amber-100/50",
    rose: "bg-rose-50 text-rose-600 border-rose-100/50 hover:bg-rose-100/50",
    slate: "bg-slate-50 text-slate-600 border-slate-100/50 hover:bg-slate-100/50",
  }[color as keyof typeof colors] || "bg-slate-50 text-slate-600";

  return (
    <Link 
      to={to}
      className={cn(
        "group p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-md hover:-translate-y-1",
        colors
      )}
    >
      <div className="flex justify-between items-start">
        <div className="p-2 bg-white rounded-lg shadow-sm">
          <Icon size={18} />
        </div>
        <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
      </div>
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>
        <p className="text-[9px] font-medium leading-tight opacity-70">{desc}</p>
      </div>
    </Link>
  );
}

