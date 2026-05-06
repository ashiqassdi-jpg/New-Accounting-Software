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
            <div ref={componentRef} className="p-16 text-black bg-white mx-auto w-full">
            <style type="text/css" media="print">
              {`
                @page { 
                  size: A4 portrait; 
                  margin: 20mm; 
                }
                body { 
                  -webkit-print-color-adjust: exact; 
                  color: black;
                  background: white;
                }
                .no-print { display: none !important; }
              `}
            </style>
            
            <div className="max-w-[800px] mx-auto font-sans">
              {/* Header */}
              <div className="text-center">
                <h1 
                  className="text-[38px] text-black tracking-tight whitespace-nowrap"
                  style={{ fontFamily: '"Times New Roman", Times, serif' }}
                >
                  {company?.name || "As-Sunnah Skill Development Institute (New Shade)"}
                </h1>
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mt-2 whitespace-nowrap">
                  {company?.address || 'BLOCK-D, PLOT: U-4, ROAD: SHADHINATA SHARANI, SATARKUL, NORTH BADDA, DHAKA 1212'}
                </p>
                
                <div className="mt-8 flex justify-center">
                  <div className="border-y-[1.5px] border-black py-2 px-12">
                    <h2 className="text-[14px] font-bold text-black uppercase tracking-[0.3em]">
                      {voucher.type} VOUCHER
                    </h2>
                  </div>
                </div>
              </div>

              {/* Reference Info */}
              <div className="flex justify-between items-end mt-8">
                <div className="flex items-end gap-2 text-[12px] font-bold uppercase tracking-widest">
                  <span className="mb-0.5">VOUCHER NO :</span>
                  <span className="border-b border-black w-40 text-center pb-0.5 text-[15px]">{voucher.voucher_no}</span>
                </div>
                <div className="flex items-end gap-2 text-[12px] font-bold uppercase tracking-widest">
                  <span className="mb-0.5">DATE :</span>
                  <span className="border-b border-black w-40 text-center pb-0.5 text-[15px]">{format(new Date(voucher.date), 'dd-MMM-yyyy').toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-end gap-2 text-[12px] font-bold uppercase tracking-widest mt-6 mb-6">
                <span className="mb-0.5">THROUGH :</span>
                <span className="border-b border-black flex-1 pl-2 pb-0.5 text-[15px] uppercase">{throughAccount}</span>
              </div>

              {/* Transaction Table */}
              <div className="border border-black flex flex-col">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="py-3 px-6 text-left border-r border-black font-bold uppercase text-[13px] tracking-widest w-[75%]">PARTICULARS</th>
                      <th className="py-3 px-6 text-center font-bold uppercase text-[13px] tracking-widest w-[25%]">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {particularItems.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="px-6 py-6 border-r border-black pb-0">
                          <div className="font-bold text-[11px] uppercase tracking-wider mb-1 text-black">ACCOUNT :</div>
                          <div className="pl-6 text-[14px] text-black font-semibold">{item.account_name}</div>
                          {item.narration && (
                            <div className="pl-6 pt-1 text-[11px] italic text-slate-700">
                              "{item.narration}"
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-6 text-center pb-0">
                          <div className="pt-5 text-[14px] font-mono text-black font-semibold">
                            {formatBDT(Math.abs(item.debit || item.credit)).replace(/[৳]/g, '').trim()}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {/* Spacer for minimum height */}
                    <tr className="h-[200px]">
                      <td className="border-r border-black"></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer details inside border */}
                <div className="border-t border-black p-6 space-y-6">
                  <div className="flex gap-4 items-end">
                    <span className="font-bold uppercase tracking-widest text-[11px] min-w-[130px] pb-1 text-slate-600">ON ACCOUNT OF :</span>
                    <span className="text-[14px] text-black flex-1 leading-snug border-b border-slate-300 pb-1">{voucher.narration || '-'}</span>
                  </div>
                  <div className="flex gap-4 items-end">
                    <span className="font-bold uppercase tracking-widest text-[11px] min-w-[130px] pb-1 text-slate-600">AMOUNT IN WORDS :</span>
                    <span className="text-[16px] text-black font-bold flex-1 capitalize leading-snug border-b border-slate-300 pb-1">{numberToWords(voucher.amount)}</span>
                  </div>
                </div>
                 
                <div className="border-t border-black flex justify-end items-center px-8 py-5">
                  <div className="flex items-center gap-6">
                    <span className="font-bold uppercase tracking-widest text-[11px]">TOTAL :</span>
                    <span className="text-[18px] font-mono text-black font-semibold border-b border-black pb-0.5">
                      TK. {formatBDT(voucher.amount).replace(/[৳]/g, '').trim()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-16 mb-8 pt-8">
                {/* First row of signatures */}
                <div className="flex justify-between px-8 text-[12px] font-bold uppercase tracking-widest">
                  <div className="w-56 text-center border-t border-black pt-2">
                    RECEIVER'S SIGNATURE
                  </div>
                  <div className="w-56 text-center border-t border-black pt-2">
                    AUTHORISED SIGNATORY
                  </div>
                </div>

                {/* Second row of signatures */}
                <div className="flex justify-between mt-24 px-8 text-[12px] font-bold uppercase tracking-widest">
                  <div className="w-40 text-center border-t border-black pt-2">
                    PREPARED BY
                  </div>
                  <div className="w-40 text-center border-t border-black pt-2">
                    CHECKED BY
                  </div>
                  <div className="w-40 text-center border-t border-black pt-2">
                    VERIFIED BY
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
