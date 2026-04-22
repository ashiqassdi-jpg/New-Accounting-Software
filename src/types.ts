/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  designation?: string;
  joining_date?: string;
  role: UserRole;
  companies?: string[];
  can_add?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface Company {
  id: string;
  name: string;
  address?: string;
  tax_id?: string;
  bin?: string;
  opening_cash?: number;
  opening_bank?: number;
  opening_bkash?: number;
  opening_nagad?: number;
  fiscal_year_start?: string;
  currency_symbol?: string;
  financial_status?: 'ACTIVE' | 'CLOSED' | 'AUDITED';
  created_at: string;
  created_by: string;
}

export type VoucherType = 'PAYMENT' | 'RECEIPT' | 'JOURNAL' | 'CONTRA' | 'SALES' | 'PURCHASE';
export type PaymentChannel = 'CASH' | 'BANK' | 'BKASH' | 'NAGAD';

export interface Account {
  id: string;
  company_id: string;
  name: string;
  code: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parent_id?: string;
  opening_balance: number;
  current_balance: number;
}

export interface Voucher {
  id: string;
  company_id: string;
  voucher_no: string;
  date: string;
  type: VoucherType;
  payment_channel?: PaymentChannel;
  narration: string;
  amount: number;
  created_at: string;
  created_by: string;
}

export interface Transaction {
  id: string;
  voucher_id: string;
  company_id: string;
  account_id: string;
  debit: number;
  credit: number;
  date: string;
}

export interface DashboardStats {
  netProfit: number;
  totalRevenue: number;
  totalExpenses: number;
  totalEquity: number;
  balances: {
    CASH: number;
    BANK: number;
    BKASH: number;
    NAGAD: number;
  };
}
