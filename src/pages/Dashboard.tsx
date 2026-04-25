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
  X
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { motion } from 'motion/react';
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

      const monthlyData: { [key: string]: { revenue: number; expenses: number } } = {};
      
      transactions.forEach((t: any) => {
        const month = format(new Date(t.date), 'MMM');
        if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0 };
        
        if (t.accounts.type === 'INCOME') {
          monthlyData[month].revenue += (Number(t.credit) || 0) - (Number(t.debit) || 0);
        } else if (t.accounts.type === 'EXPENSE') {
          monthlyData[month].expenses += (Number(t.debit) || 0) - (Number(t.credit) || 0);
        }
      });

      const formatted = Object.keys(monthlyData).map(month => ({
        name: month,
        revenue: Math.max(0, monthlyData[month].revenue),
        expenses: Math.max(0, monthlyData[month].expenses)
      }));

      setChartData(formatted.length > 0 ? formatted.sort((a, b) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months.indexOf(a.name) - months.indexOf(b.name);
      }) : [
        { name: 'N/A', revenue: 0, expenses: 0 }
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

      let transQuery = supabase
        .from('transactions')
        .select('account_id, debit, credit, accounts!inner(type)')
        .eq('company_id', selectedCompany!.id);

      if (confirmedDateRange.from) transQuery = transQuery.gte('date', confirmedDateRange.from);
      if (confirmedDateRange.to) transQuery = transQuery.lte('date', confirmedDateRange.to);

      const { data: transactions } = await transQuery;

      const getBalance = (name: string) => {
        const acc = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
        return acc ? getDisplayBalance(acc.type, acc.current_balance) : 0;
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
        cashBalance: getBalance('Cash'),
        bankBalance: getBalance('Bank'),
        bkashBalance: getBalance('bKash'),
        nagadBalance: getBalance('Nagad')
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
        <ChartBox title="Revenue vs Expenses" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} tickFormatter={(val) => `৳${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                formatter={(val: number) => formatBDT(val)}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#94a3b8" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox title="Operating Expenses" icon={PieChartIcon}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={expenseDistribution}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} radius={4} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => formatBDT(val)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="shrink-0 space-y-4 px-6 border-l border-slate-50">
              {expenseDistribution.map((item, index) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartBox>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600',
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-white p-5 rounded-2xl border border-slate-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] transition-all duration-300 relative group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg bg-slate-50/50", colorMap[color])}>
          <Icon size={16} />
        </div>
        <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      <p className={cn(
        "text-xl font-bold font-mono tracking-tighter tabular-nums truncate",
        value < 0 ? "text-rose-600" : "text-slate-800"
      )}>
        {formatBDT(value)}
      </p>
    </motion.div>
  );
}

function ChartBox({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_1px_2px_0_rgba(0,0,0,0.02)] relative">
      <div className="flex items-center gap-2.5 mb-8">
        <div className="bg-slate-50 p-1.5 rounded-lg text-slate-400">
          <Icon size={14} />
        </div>
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
