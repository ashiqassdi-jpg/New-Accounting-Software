/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../lib/supabase';
import { Voucher, Company, UserProfile } from '../types';
import { formatBDT } from '../constants';

interface VoucherPrintPreviewProps {
  voucher: Voucher;
  company: Company | null;
  profile: UserProfile | null;
  onClose: () => void;
}

export default function VoucherPrintPreview({ voucher, company, profile, onClose }: VoucherPrintPreviewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransactions();
  }, [voucher.id]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          account:accounts(name)
        `)
        .eq('voucher_id', voucher.id);

      if (error) throw error;
      
      setItems(data?.map(tx => ({
        ...tx,
        account_name: tx.account?.name
      })) || []);
    } catch (err) {
      console.error('Error fetching transactions for print:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Voucher_${voucher.voucher_no}`,
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-[210mm] min-h-[297mm] rounded-3xl shadow-2xl relative my-8"
      >
        <div className="absolute top-6 right-6 flex gap-3 z-10">
          <button 
            onClick={() => handlePrint()}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Printer size={18} /> Print Now
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-bold uppercase tracking-widest text-xs">Assembling Voucher Data...</p>
          </div>
        ) : (
          <div ref={componentRef} className="p-[20mm] text-slate-900 bg-white min-h-[297mm]">
            <style type="text/css" media="print">
              {`
                @page { size: A4; margin: 20mm; }
                body { -webkit-print-color-adjust: exact; }
                .no-print { display: none !important; }
              `}
            </style>
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600 p-2 rounded-xl">
                    <BookOpen className="text-white h-6 w-6" />
                  </div>
                  <span className="text-2xl font-black tracking-tighter">Ashiq's Creation</span>
                </div>
                <div className="space-y-1">
                  <h1 className="text-xl font-bold text-slate-900">{company?.name}</h1>
                  <p className="text-sm text-slate-500 max-w-xs">{company?.address}</p>
                  {company?.bin && <p className="text-xs font-bold text-slate-400">BIN: {company.bin}</p>}
                  {company?.tax_id && <p className="text-xs font-bold text-slate-400">Tax ID: {company.tax_id}</p>}
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest mb-4">
                  {voucher.type} VOUCHER
                </div>
                <div className="text-sm font-medium text-slate-500">
                  <p>Voucher #: <span className="font-bold text-slate-900">{voucher.voucher_no}</span></p>
                  <p>Date: <span className="font-bold text-slate-900">{format(new Date(voucher.date), 'dd MMMM yyyy')}</span></p>
                  {voucher.payment_channel && <p>Channel: <span className="font-bold text-slate-900 uppercase">{voucher.payment_channel}</span></p>}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="mt-12">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Account Details</th>
                    <th className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Debit (৳)</th>
                    <th className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="group">
                      <td className="py-5">
                        <p className="font-bold text-slate-800">{item.account_name}</p>
                        <p className="text-xs text-slate-400 mt-1 italic">{voucher.narration}</p>
                      </td>
                      <td className="py-5 text-right font-mono font-bold text-slate-900">
                        {item.debit > 0 ? formatBDT(item.debit).replace('৳', '') : '-'}
                      </td>
                      <td className="py-5 text-right font-mono font-bold text-slate-900">
                        {item.credit > 0 ? formatBDT(item.credit).replace('৳', '') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100">
                    <td className="py-6 text-sm font-black text-slate-900 uppercase tracking-widest">Grand Total</td>
                    <td className="py-6 text-right font-mono font-black text-slate-900 text-lg border-b-4 border-double border-slate-200">
                      {formatBDT(voucher.amount).replace('৳', '')}
                    </td>
                    <td className="py-6 text-right font-mono font-black text-slate-900 text-lg border-b-4 border-double border-slate-200">
                      {formatBDT(voucher.amount).replace('৳', '')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Narration summary */}
            <div className="mt-10 p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authorization Note</p>
              <p className="text-sm font-medium text-slate-700 italic">"The above mentioned amount has been processed in accordance with system-defined financial protocols."</p>
            </div>

            {/* Footer Signatures */}
            <div className="mt-32 grid grid-cols-4 gap-10">
              <div className="text-center space-y-2">
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Prepared by</p>
                  <p className="text-xs text-slate-400 font-bold mt-1">{profile?.name || 'Authorized User'}</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Checked by</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Approved by</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Auditor</p>
                </div>
              </div>
            </div>

            {/* System info */}
            <div className="mt-auto pt-20 flex justify-between items-center text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
              <span>Generated by Ashiq's Creation ERP</span>
              <span>Page 01 of 01</span>
              <span>{new Date().toLocaleString()}</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
