/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { useReactToPrint } from 'react-to-print';
import { supabase } from '../lib/supabase';
import { Voucher, Company, UserProfile } from '../types';
import { formatBDT } from '../constants';
import { numberToWords } from '../lib/numberToWords';

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
          account:accounts(name, type)
        `)
        .eq('voucher_id', voucher.id);

      if (error) throw error;
      
      setItems(data?.map((tx: any) => ({
        ...tx,
        account_name: tx.account?.name,
        account_type: tx.account?.type
      })) || []);
    } catch (err) {
      console.error('Error fetching transactions for print:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${voucher.type}_Voucher_${voucher.voucher_no}`,
  });

  useEffect(() => {
    document.body.classList.add('modal-open');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Identify "Through" account (Cash/Bank side)
  const throughAccount = items.find(item => {
    if (voucher.type === 'PAYMENT') return item.credit > 0;
    if (voucher.type === 'RECEIPT') return item.debit > 0;
    if (voucher.type === 'CONTRA') return item.credit > 0;
    return false;
  })?.account_name || 'N/A';

  const particularItems = items.filter(item => {
    if (voucher.type === 'PAYMENT') return item.debit > 0;
    if (voucher.type === 'RECEIPT') return item.credit > 0;
    return true; // Show all for Journal etc or refine logic
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-[850px] max-h-[95vh] rounded-3xl shadow-2xl relative my-4 overflow-y-auto scrollbar-hide"
      >
        <div className="sticky top-0 right-0 p-4 flex justify-end gap-2 z-10 no-print bg-white/80 backdrop-blur border-b border-slate-100">
          <button 
            onClick={() => handlePrint()}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-black transition-all disabled:opacity-50"
          >
            <Printer size={16} /> Print Voucher
          </button>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-bold uppercase tracking-widest text-[10px]">Processing Financial Document...</p>
          </div>
        ) : (
          <div ref={componentRef} className="p-12 text-black bg-white mx-auto w-full">
            <style type="text/css" media="print">
              {`
                @page { 
                  size: A4 portrait; 
                  margin: 15mm; 
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  font-family: 'Inter', sans-serif;
                  color: black;
                }
                .company-name {
                  font-family: "Times New Roman", Times, serif !important;
                }
                .no-print { display: none !important; }
              `}
            </style>
            
            <div className="max-w-[700px] mx-auto space-y-8 font-sans">
              {/* Header */}
              <div className="text-center space-y-2">
                <h1 className="text-4xl company-name text-black leading-tight whitespace-nowrap">
                  {company?.name || "Ashiq's Creation"}
                </h1>
                <p className="text-[10px] font-bold text-black uppercase tracking-[0.2em] leading-tight max-w-full mx-auto whitespace-nowrap overflow-hidden text-ellipsis">
                  {company?.address || 'Your Company Address'}
                </p>
                <div className="pt-3">
                  <h2 className="text-sm font-black border-y-2 border-black py-2 inline-block px-12 uppercase tracking-[0.4em] text-black">
                    {voucher.type} VOUCHER
                  </h2>
                </div>
              </div>

              {/* Reference Info */}
              <div className="flex justify-between items-end text-[11px] font-black uppercase tracking-widest">
                <div className="flex gap-2">
                  <span className="text-black">Voucher No :</span>
                  <span className="border-b-2 border-black min-w-[120px] inline-block text-center text-sm">{voucher.voucher_no}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-black">Date :</span>
                  <span className="border-b-2 border-black min-w-[140px] inline-block text-center text-sm">{format(new Date(voucher.date), 'dd-MMM-yyyy')}</span>
                </div>
              </div>

              {/* Through Line */}
              <div className="flex gap-2 text-xs font-black uppercase tracking-widest">
                <span className="text-black">Through :</span>
                <span className="border-b-2 border-black flex-1 text-sm font-bold">{throughAccount}</span>
              </div>

              {/* Transaction Table */}
              <div className="border-2 border-black min-h-[300px] relative flex flex-col">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-black bg-slate-50">
                      <th className="py-4 px-6 text-left border-r-2 border-black font-black text-[11px] uppercase tracking-widest w-full">Particulars</th>
                      <th className="py-4 px-6 text-center w-44 font-black text-[11px] uppercase tracking-widest">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {particularItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 last:border-0">
                        <td className="px-6 py-5 border-r-2 border-black">
                          <p className="text-[12px] font-black uppercase text-black">Account :</p>
                          <p className="pl-6 text-[13px] font-bold text-slate-800">{item.account_name}</p>
                          {item.narration && (
                            <p className="pl-6 pt-1.5 text-[11px] text-slate-600 italic font-bold">
                              "{item.narration}"
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-sm font-mono text-black">
                          {formatBDT(Math.abs(item.debit || item.credit)).replace(/[৳]/g, '').trim()}
                        </td>
                      </tr>
                    ))}
                    {/* Empty spacer rows */}
                    <tr className="flex-1 min-h-[80px]">
                      <td className="border-r-2 border-black"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer details inside border */}
                <div className="mt-auto border-t-2 border-black">
                   <div className="p-6 space-y-5">
                      <div className="flex gap-4 text-xs items-center">
                        <span className="font-black uppercase tracking-widest text-[11px] text-black min-w-[130px]">On Account of :</span>
                        <div className="flex-1 font-bold text-slate-900 border-b-2 border-slate-200 pb-1 text-[13px]">
                          {voucher.narration || 'N/A'}
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs items-center">
                        <span className="font-black uppercase tracking-widest text-[11px] text-black min-w-[130px]">Amount in Words :</span>
                        <div className="flex-1 font-black italic text-black border-b-2 border-slate-200 pb-1 text-[13px] capitalize">
                          {numberToWords(voucher.amount)}
                        </div>
                      </div>
                   </div>
                   
                   <div className="border-t-2 border-black flex items-center justify-end px-8 py-4">
                      <div className="flex items-center gap-4 font-bold text-sm">
                        <span className="uppercase tracking-widest text-black">Total :</span>
                        <span className="text-lg border-b-2 border-black pb-0.5 min-w-[120px] text-right">
                          TK. {formatBDT(voucher.amount).replace(/[৳]/g, '').trim()}
                        </span>
                      </div>
                   </div>
                </div>
              </div>

              {/* Signatures Row 1 */}
              <div className="grid grid-cols-2 pt-12 text-xs font-black uppercase tracking-widest px-8">
                <div className="border-t-2 border-black pt-4 inline-block w-fit min-w-[220px] text-black">
                  Receiver's Signature
                </div>
                <div className="text-right">
                  <div className="border-t-2 border-black pt-4 inline-block w-fit min-w-[220px] text-center text-black">
                    Authorised Signatory
                  </div>
                </div>
              </div>

              {/* Signatures Row 2 */}
              <div className="grid grid-cols-3 pt-16 text-[11px] font-black uppercase tracking-[0.25em] px-8 text-black">
                <div className="text-left">
                   <div className="border-t-2 border-slate-800 pt-3 inline-block w-fit min-w-[150px] text-center">
                    Prepared by
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t-2 border-slate-800 pt-3 inline-block w-fit min-w-[150px] text-center">
                    Checked by
                  </div>
                </div>
                <div className="text-right">
                  <div className="border-t-2 border-slate-800 pt-3 inline-block w-fit min-w-[150px] text-center">
                    Verified by
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
