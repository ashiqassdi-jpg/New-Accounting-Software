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
        className="bg-white w-full max-w-[850px] max-h-[90vh] rounded-3xl shadow-2xl relative my-4 overflow-y-auto scrollbar-hide"
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
          <div ref={componentRef} className="p-8 text-slate-900 bg-white shadow-inner mx-auto max-w-full overflow-x-hidden">
            <style type="text/css" media="print">
              {`
                @page { 
                  size: A4 portrait; 
                  margin: 10mm; 
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  font-family: 'Inter', sans-serif;
                }
                .no-print { display: none !important; }
                .print-content {
                  width: 190mm !important; /* A4 is 210mm, minus 10mm margins on each side */
                  margin: 0 auto !important;
                  padding: 0 !important;
                }
              `}
            </style>
            
            <div className="print-content">
              {/* Minimal Header */}
              <div className="text-center space-y-1 border-b border-slate-300 pb-4">
                <h1 className="text-xl font-black tracking-tight text-slate-800 uppercase">{company?.name}</h1>
                <p className="text-[10px] font-medium text-slate-500">{company?.address}</p>
                <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {company?.bin && <span>BIN: {company.bin}</span>}
                  {company?.tax_id && <span>TAX: {company.tax_id}</span>}
                </div>
              </div>

              {/* Voucher Title & Stats Bar */}
              <div className="mt-4 flex justify-between items-center bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h2 className="text-xs font-black text-slate-700 uppercase tracking-wider">{voucher.type} VOUCHER</h2>
                </div>
                <div className="flex gap-6 text-[10px]">
                  <p className="font-medium text-slate-400 uppercase">No: <span className="text-slate-900 font-bold ml-1">{voucher.voucher_no}</span></p>
                  <p className="font-medium text-slate-400 uppercase">Date: <span className="text-slate-900 font-bold ml-1">{format(new Date(voucher.date), 'dd-MM-yyyy')}</span></p>
                </div>
              </div>

              {/* Creator & Editor Info */}
              {(voucher.creator || voucher.editor) && (
                <div className="mt-2 flex justify-between text-[9px] bg-slate-50/50 px-4 py-1.5 rounded-md border border-slate-100/50">
                  <div className="flex gap-1 items-center">
                    {voucher.creator ? (
                      <>
                        <span className="text-slate-400 uppercase tracking-wider font-semibold">Prepared by:</span>
                        <span className="font-bold text-slate-700">{voucher.creator.name}</span>
                        <span className="text-slate-400">({voucher.creator.email})</span>
                      </>
                    ) : <span />}
                  </div>
                  <div className="flex gap-1 items-center">
                    {voucher.editor ? (
                      <>
                        <span className="text-slate-400 uppercase tracking-wider font-semibold">Last Edited by:</span>
                        <span className="font-bold text-slate-700">{voucher.editor.name}</span>
                        <span className="text-slate-400">({voucher.editor.email})</span>
                      </>
                    ) : <span />}
                  </div>
                </div>
              )}

              {/* Compact Transaction Table */}
              <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Ledger Description</th>
                      <th className="px-4 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Debit ({formatBDT(0).split(' ')[0]})</th>
                      <th className="px-4 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest w-32">Credit ({formatBDT(0).split(' ')[0]})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          <p className="text-[11px] font-bold text-slate-700 uppercase">{item.account_name}</p>
                          {idx === 0 && <p className="text-[9px] text-slate-400 mt-1 italic leading-tight">Narration: {voucher.narration}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-slate-900">
                          {item.debit > 0 ? formatBDT(item.debit).replace(/[^0-9.,]/g, '') : ''}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] font-bold text-slate-900">
                          {item.credit > 0 ? formatBDT(item.credit).replace(/[^0-9.,]/g, '') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900 text-white font-black">
                    <tr>
                      <td className="px-4 py-2.5 text-[10px] uppercase tracking-widest text-right">Total</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[10px]">{formatBDT(voucher.amount).replace(/[^0-9.,]/g, '')}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-[10px]">{formatBDT(voucher.amount).replace(/[^0-9.,]/g, '')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Refined Modular Signatures */}
              <div className="mt-16 grid grid-cols-4 gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-full border-t border-slate-300 pt-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Signature</p>
                    <p className="text-[9px] text-slate-300 mt-1 italic">(Prepared By)</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full border-t border-slate-300 pt-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Pre-Verification</p>
                    <p className="text-[9px] text-slate-300 mt-1 italic">(Account Dept)</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full border-t border-slate-300 pt-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Audit</p>
                    <p className="text-[9px] text-slate-300 mt-1 italic">(Verification)</p>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-full border-t border-slate-300 pt-2 text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Approved</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">{profile?.role === 'SUPER_ADMIN' ? 'Authorized Manager' : 'Approval Hub'}</p>
                  </div>
                </div>
              </div>

              {/* Clean Footer */}
              <div className="mt-12 pt-4 border-t border-slate-50 flex justify-between items-center text-[7px] font-bold text-slate-300 uppercase tracking-widest">
                <span>Elite Accounting Protocol v2.5</span>
                <span>Computer Generated Voucher • {format(new Date(), 'dd MMM yyyy HH:mm')}</span>
              </div>
            </div>
          </div>
        )/* Loading state handled above */}
      </motion.div>
    </div>
  );
}
