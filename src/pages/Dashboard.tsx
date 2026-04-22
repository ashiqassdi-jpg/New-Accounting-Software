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
  Coins
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { motion } from 'motion/react';
import { formatBDT } from '../constants';
import { useCompany } from '../hooks/useCompany';
import { supabase } from '../lib/supabase';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { cn } from '../lib/utils';

const COLORS = ['#6366f1', '#94a3b8', '#fbbf24', '#f43f5e', '#8b5cf6'];

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
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

  useEffect(() => {
    if (selectedCompany) {
      fetchStats();
    }
  }, [selectedCompany, confirmedDateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', selectedCompany!.id);

      if (!accounts) return;

      const { data: transactions } = await supabase
        .from('transactions')
        .select('account_id, debit, credit, accounts!inner(type)')
        .eq('company_id', selectedCompany!.id)
        .gte('date', confirmedDateRange.from)
        .lte('date', confirmedDateRange.to);

      const getBalance = (name: string) => {
        const acc = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
        return acc ? acc.current_balance : 0;
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
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-sans tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Overview of {selectedCompany?.name || 'Your Company'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="inline-flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm border-b-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl text-slate-400">
              <Calendar size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Date Filters</span>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <input 
                type="date" 
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="text-xs outline-none border-none bg-transparent font-bold text-slate-700 w-28"
              />
              <span className="text-slate-300">→</span>
              <input 
                type="date" 
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="text-xs outline-none border-none bg-transparent font-bold text-slate-700 w-28"
              />
            </div>
            <button 
              onClick={() => setConfirmedDateRange(dateRange)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              Apply Filter
            </button>
          </div>
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
            <AreaChart data={[
              { name: 'Jan', revenue: 4000, expenses: 2400 },
              { name: 'Feb', revenue: 3000, expenses: 1398 },
              { name: 'Mar', revenue: 2000, expenses: 9800 },
              { name: 'Apr', revenue: 2780, expenses: 3908 },
              { name: 'May', revenue: 1890, expenses: 4800 },
              { name: 'Jun', revenue: 2390, expenses: 3800 },
            ]}>
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
                  data={[
                    { name: 'Salaries', value: 4000 },
                    { name: 'Rent', value: 3000 },
                    { name: 'Utilities', value: 2000 },
                    { name: 'Marketing', value: 1000 },
                  ]}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {[0,1,2,3].map((entry, index) => (
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
              {['Salaries', 'Rent', 'Utilities', 'Marketing'].map((name, index) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{name}</span>
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
    indigo: 'bg-indigo-50/50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50/50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50/50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50/50 text-slate-600 border-slate-100',
  };

  return (
    <motion.div 
      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)' }}
      className={cn(
        "bg-white p-8 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300 relative overflow-hidden group",
      )}
    >
      <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full opacity-[0.03] transition-transform group-hover:scale-110", colorMap[color])} />
      <div className="flex items-center justify-between mb-6">
        <div className={cn("p-4 rounded-2xl border transition-colors", colorMap[color])}>
          <Icon size={24} />
        </div>
      </div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-2xl font-bold text-slate-900 font-mono tracking-tighter">
        {formatBDT(value)}
      </p>
    </motion.div>
  );
}

function ChartBox({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative pt-10">
      <div className="absolute top-8 left-8 flex items-center gap-3">
        <div className="bg-slate-50 p-2 rounded-xl text-slate-400">
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="mt-8">
        {children}
      </div>
    </div>
  );
}
