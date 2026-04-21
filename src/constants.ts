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

export const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Assets' },
  { value: 'LIABILITY', label: 'Liabilities' },
  { value: 'EQUITY', label: 'Equity' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expenses' },
];

export const BDT_FORMATTER = new Intl.NumberFormat('en-BD', {
  style: 'currency',
  currency: 'BDT',
  minimumFractionDigits: 2,
});

export const formatBDT = (amount: number) => {
  return BDT_FORMATTER.format(amount).replace('BDT', '৳');
};
