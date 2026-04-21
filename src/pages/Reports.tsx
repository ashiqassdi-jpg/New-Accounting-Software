/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useCompany } from '../hooks/useCompany';
import { formatBDT } from '../constants';
import { FileText, Download, Printer, Filter } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportRow {
  account_name: string;
  account_code: string;
  type: string;
  debit: number;
  credit: number;
}

export default function Reports() {
  const { selectedCompany } = useCompany();
  const [data, setData] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTrialBalance = async () => {
    if (!selectedCompany) return;
    setLoading(true);

    try {
      // 1. Fetch all accounts
      const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', selectedCompany.id);
      
      // 2. Fetch all transactions to calculate net balances
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', selectedCompany.id);

      if (!accounts) return;

      const reportRows: ReportRow[] = accounts.map(account => {
        const accTransactions = transactions?.filter(t => t.account_id === account.id) || [];
        const totalDebit = accTransactions.reduce((sum, t) => sum + Number(t.debit), 0);
        const totalCredit = accTransactions.reduce((sum, t) => sum + Number(t.credit), 0);
        
        let debit = 0;
        let credit = 0;

        // Assets and Expenses are typically Debit-natured
        // Liabilities, Equity, and Income are typically Credit-natured
        const balance = account.opening_balance + totalDebit - totalCredit;

        if (balance > 0) {
          debit = balance;
        } else if (balance < 0) {
          credit = Math.abs(balance);
        }

        return {
          account_name: account.name,
          account_code: account.code,
          type: account.type,
          debit,
          credit
        };
      }).filter(row => row.debit !== 0 || row.credit !== 0);

      setData(reportRows);
    } catch (error) {
      console.error('Error calculating trial balance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialBalance();
  }, [selectedCompany]);

  const totalDebit = data.reduce((sum, r) => sum + r.debit, 0);
  const totalCredit = data.reduce((sum, r) => sum + r.credit, 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-sans tracking-tight">
            Financial Reports
          </h1>
          <p className="text-gray-500 mt-1">
            Trial Balance for {selectedCompany?.name || 'Selected Company'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Printer size={18} />
            <span>Print</span>
          </button>
          <button className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Trial Balance Table */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-gray-400" size={18} />
            <h3 className="font-bold text-gray-800">Trial Balance</h3>
          </div>
          <span className="text-xs text-gray-500 font-medium">As of {new Date().toLocaleDateString()}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Code</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Name</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Debit (৳)</th>
                <th className="px-8 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Credit (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((row) => (
                <tr key={row.account_code} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-4 text-sm font-mono text-gray-400">
                    {row.account_code}
                  </td>
                  <td className="px-8 py-4 text-sm font-semibold text-gray-900">
                    {row.account_name}
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                      {row.type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-sm font-mono text-gray-900 text-right">
                    {row.debit > 0 ? formatBDT(row.debit).replace('৳', '') : '-'}
                  </td>
                  <td className="px-8 py-4 text-sm font-mono text-gray-900 text-right">
                    {row.credit > 0 ? formatBDT(row.credit).replace('৳', '') : '-'}
                  </td>
                </tr>
              ))}
              
              {data.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-gray-400 italic">
                    No transaction data available for this company.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-gray-50/80 border-t-2 border-gray-100">
              <tr>
                <td colSpan={3} className="px-8 py-6 text-sm font-bold text-gray-900 uppercase tracking-tight">Totals</td>
                <td className="px-8 py-6 text-xl font-bold text-gray-900 text-right font-mono tracking-tighter">
                  {formatBDT(totalDebit)}
                </td>
                <td className="px-8 py-6 text-xl font-bold text-gray-900 text-right font-mono tracking-tighter">
                  {formatBDT(totalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </motion.div>

      {/* Equality Check */}
      {Math.abs(totalDebit - totalCredit) > 0.01 && (
        <div className="flex items-center gap-3 bg-red-50 p-4 rounded-2xl border border-red-100 text-red-600">
          <Filter size={20} />
          <p className="text-sm font-medium">
            Trial Balance is not equal! Difference: {formatBDT(Math.abs(totalDebit - totalCredit))}
          </p>
        </div>
      )}
    </div>
  );
}
