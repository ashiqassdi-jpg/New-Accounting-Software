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
  Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import { motion } from 'motion/react';
import { formatBDT } from '../constants';
import { useCompany } from '../hooks/useCompany';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const { selectedCompany } = useCompany();
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  // Mock data for initial rendering
  const revenueVsExpenses = [
    { name: 'Jan', revenue: 400000, expenses: 240000 },
    { name: 'Feb', revenue: 300000, expenses: 139000 },
    { name: 'Mar', revenue: 200000, expenses: 980000 },
    { name: 'Apr', revenue: 278000, expenses: 390000 },
    { name: 'May', revenue: 189000, expenses: 480000 },
    { name: 'Jun', revenue: 239000, expenses: 380000 },
  ];

  const expenseBreakdown = [
    { name: 'Rent', value: 45000 },
    { name: 'Salaries', value: 250000 },
    { name: 'Utilities', value: 15000 },
    { name: 'Marketing', value: 30000 },
    { name: 'Supplies', value: 20000 },
  ];

  const accountBalances = [
    { name: 'Cash', balance: 150000 },
    { name: 'Bank', balance: 1200000 },
    { name: 'bKash', balance: 45000 },
    { name: 'Nagad', balance: 32000 },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            {selectedCompany?.name || 'Loading company...'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <Calendar className="text-gray-400 ml-2" size={18} />
          <input 
            type="date" 
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="text-sm outline-none border-none bg-transparent font-medium text-gray-600 focus:ring-0"
          />
          <span className="text-gray-300">-</span>
          <input 
            type="date" 
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="text-sm outline-none border-none bg-transparent font-medium text-gray-600 focus:ring-0"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Net Profit" 
          value={150000} 
          icon={TrendingUp} 
          color="indigo" 
          trend="+12.5%" 
        />
        <StatCard 
          title="Total Revenue" 
          value={850000} 
          icon={DollarSign} 
          color="emerald" 
        />
        <StatCard 
          title="Total Expenses" 
          value={700000} 
          icon={TrendingDown} 
          color="rose" 
        />
        <StatCard 
          title="Total Equity" 
          value={450000} 
          icon={Wallet} 
          color="amber" 
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Revenue vs. Expenses" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueVsExpenses}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `৳${val/1000}k`} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(val: number) => formatBDT(val)}
              />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" />
              <Area type="monotone" dataKey="expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Expense Breakdown" icon={PieChartIcon}>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseBreakdown.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => formatBDT(val)}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="shrink-0 w-full md:w-auto px-4 space-y-2">
              {expenseBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartContainer>
      </div>

      {/* Account Balances Bar Chart */}
      <ChartContainer title="Account Balances" icon={Wallet}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={accountBalances}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `৳${val/1000}k`} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              formatter={(val: number) => formatBDT(val)}
            />
            <Bar dataKey="balance" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  const colorMap: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 font-mono tracking-tighter">
        {formatBDT(value)}
      </p>
    </motion.div>
  );
}

function ChartContainer({ title, children, icon: Icon }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-gray-100 p-2 rounded-lg">
          <Icon size={18} className="text-gray-600" />
        </div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}
