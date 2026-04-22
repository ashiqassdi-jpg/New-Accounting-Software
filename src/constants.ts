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
  style: 'currency',
  currency: 'BDT',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatBDT = (amount: number = 0) => {
  // Ensure we show 2 decimal places and standard separators
  return BDT_FORMATTER.format(amount || 0).replace('BDT', '৳').trim();
};
