/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VoucherType, PaymentChannel } from './types';

export const VOUCHER_TYPES: { value: VoucherType; label: string }[] = [
  { value: 'PAYMENT', label: 'Payment' },
  { value: 'RECEIPT', label: 'Receipt' },
  { value: 'JOURNAL', label: 'Journal' },
  { value: 'CONTRA', label: 'Contra' },
  { value: 'SALES', label: 'Sales' },
  { value: 'PURCHASE', label: 'Purchase' },
];

export const PAYMENT_CHANNELS: { value: PaymentChannel; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK', label: 'Bank' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
];

export const ACCOUNT_GROUPS = [
  { value: 'ASSET', label: 'Assets', color: 'slate' },
  { value: 'LIABILITY', label: 'Liabilities', color: 'rose' },
  { value: 'EQUITY', label: 'Equity', color: 'amber' },
  { value: 'INCOME', label: 'Income', color: 'emerald' },
  { value: 'EXPENSE', label: 'Expenses', color: 'indigo' },
];

export const BDT_FORMATTER = new Intl.NumberFormat('en-BD', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatBDT = (amount: number = 0) => {
  return `৳${BDT_FORMATTER.format(amount || 0)}`;
};

export const calculateBalance = (type: string, debit: number, credit: number) => {
  const d = Number(debit) || 0;
  const c = Number(credit) || 0;
  if (['INCOME', 'LIABILITY', 'EQUITY'].includes(type)) {
    return c - d;
  }
  return d - c;
};

export const getDisplayBalance = (type: string, balance: number) => {
  const b = Number(balance) || 0;
  if (['INCOME', 'LIABILITY', 'EQUITY'].includes(type)) {
    return -b;
  }
  return b;
};
