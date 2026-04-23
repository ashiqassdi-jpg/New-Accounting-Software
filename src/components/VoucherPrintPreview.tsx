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
        className="bg-white w-full max-w-[210mm] min-h-0 rounded-3xl shadow-2xl relative my-4 overflow-hidden"
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10 no-print">
          <button 
            onClick={() => handlePrint()}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            <Printer size={16} /> Print
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-bold uppercase tracking-widest text-[10px]">Assembling Voucher Data...</p>
          </div>
        ) : (
          <div ref={componentRef} className="p-8 md:p-12 text-slate-900 bg-white">
            <style type="text/css" media="print">
              {`
                @page { size: A4; margin: 20mm; }
                body { -webkit-print-color-adjust: exact; }
                .no-print { display: none !important; }
              `}
            </style>
            
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 p-1.5 rounded-lg">
                    <BookOpen className="text-white h-4 w-4" />
                  </div>
                  <span className="text-lg font-black tracking-tighter">Ashiq's Creation</span>
                </div>
                <div className="space-y-0.5">
                  <h1 className="text-base font-bold text-slate-900">{company?.name}</h1>
                  <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">{company?.address}</p>
                  <div className="flex gap-3 mt-1">
                    {company?.bin && <p className="text-[10px] font-bold text-slate-400">BIN: {company.bin}</p>}
                    {company?.tax_id && <p className="text-[10px] font-bold text-slate-400">Tax ID: {company.tax_id}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1.5">
                <div className="inline-block bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest mb-2">
                  {voucher.type} VOUCHER
                </div>
                <div className="text-xs font-medium text-slate-500 space-y-0.5">
                  <p>Voucher #: <span className="font-bold text-slate-900">{voucher.voucher_no}</span></p>
                  <p>Date: <span className="font-bold text-slate-900">{format(new Date(voucher.date), 'dd MMM yyyy')}</span></p>
                  {voucher.payment_channel && <p>Channel: <span className="font-bold text-slate-900 uppercase">{voucher.payment_channel}</span></p>}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="mt-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Details</th>
                    <th className="py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit (৳)</th>
                    <th className="py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Credit (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="group">
                      <td className="py-3">
                        <p className="text-sm font-bold text-slate-800">{item.account_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 italic leading-relaxed">{voucher.narration}</p>
                      </td>
                      <td className="py-3 text-right font-mono text-sm font-bold text-slate-900">
                        {item.debit > 0 ? formatBDT(item.debit).replace('৳', '') : '-'}
                      </td>
                      <td className="py-3 text-right font-mono text-sm font-bold text-slate-900">
                        {item.credit > 0 ? formatBDT(item.credit).replace('৳', '') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-100">
                    <td className="py-4 text-xs font-black text-slate-900 uppercase tracking-widest">Grand Total</td>
                    <td className="py-4 text-right font-mono font-black text-slate-900 text-base border-b-2 border-double border-slate-200">
                      {formatBDT(voucher.amount).replace('৳', '')}
                    </td>
                    <td className="py-4 text-right font-mono font-black text-slate-900 text-base border-b-2 border-double border-slate-200">
                      {formatBDT(voucher.amount).replace('৳', '')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Narration summary */}
            <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Authorization Note</p>
              <p className="text-xs font-medium text-slate-600 italic">"Processed in accordance with system-defined financial protocols."</p>
            </div>

            {/* Footer Signatures */}
            <div className="mt-16 grid grid-cols-4 gap-6">
              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-200 pt-1.5">
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Prepared</p>
                  <p className="text-[10px] text-slate-400 font-bold">{profile?.name || 'Authorized'}</p>
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-200 pt-1.5">
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Checked</p>
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-200 pt-1.5">
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Approved</p>
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <div className="border-t border-slate-200 pt-1.5">
                  <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Auditor</p>
                </div>
              </div>
            </div>

            {/* System info */}
            <div className="mt-12 flex justify-between items-center text-[7px] font-bold text-slate-300 uppercase tracking-[0.2em]">
              <span>Ashiq's Creation ERP</span>
              <span>Page 1 / 1</span>
              <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        )/* Loading state handled above */}
      </motion.div>
    </div>
  );
}
