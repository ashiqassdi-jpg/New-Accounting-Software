/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { UserProfile, Company } from './types';

interface AppState {
  profile: UserProfile | null;
  accessibleCompanies: Company[];
  loading: boolean;
  
  // Actions
  setProfile: (profile: UserProfile | null) => void;
  setAccessibleCompanies: (companies: Company[]) => void;
  setLoading: (loading: boolean) => void;
  
  // Computed (Helper getters)
  getCanAdd: () => boolean;
  getCanEdit: () => boolean;
  getCanDelete: () => boolean;
  getCanManageCompanies: () => boolean;
  getCanWipeData: () => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  accessibleCompanies: [],
  loading: true,

  setProfile: (profile) => set({ profile }),
  setAccessibleCompanies: (companies) => set({ accessibleCompanies: companies }),
  setLoading: (loading) => set({ loading }),

  getCanAdd: () => {
    const { profile } = get();
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com') return true;
    return profile.can_add !== false;
  },

  getCanEdit: () => {
    const { profile } = get();
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com') return true;
    return profile.can_edit !== false;
  },

  getCanDelete: () => {
    const { profile } = get();
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com') return true;
    return profile.can_delete !== false;
  },

  getCanManageCompanies: () => {
    const { profile } = get();
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com') return true;
    return profile.can_manage_companies !== false && profile.role === 'ADMIN';
  },

  getCanWipeData: () => {
    const { profile } = get();
    if (!profile) return false;
    return profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com' || profile.can_wipe_data === true;
  }
}));

import { supabase } from './lib/supabase';

export const batchOperations = {
  async postVoucher(voucherData: any, transactionRows: any[]) {
    let voucherId = voucherData.id;
    let resultVoucher = null;

    if (voucherId) {
      // Update existing voucher
      const { data, error: vError } = await supabase
        .from('vouchers')
        .update(voucherData)
        .eq('id', voucherId)
        .select()
        .single();
      
      if (vError) throw vError;
      resultVoucher = data;

      // Delete existing transactions before re-inserting
      const { error: dError } = await supabase
        .from('transactions')
        .delete()
        .eq('voucher_id', voucherId);
      
      if (dError) throw dError;
    } else {
      // Create new voucher
      const { data, error: vError } = await supabase
        .from('vouchers')
        .insert([voucherData])
        .select()
        .single();

      if (vError) throw vError;
      resultVoucher = data;
      voucherId = resultVoucher.id;
    }

    const transactions = transactionRows.map(row => ({
      ...row,
      voucher_id: voucherId
    }));

    const { error: tError } = await supabase
      .from('transactions')
      .insert(transactions);

    if (tError) {
      // If transactions fail on a NEW voucher, we might want to cleanup the voucher
      if (!voucherData.id) {
        await supabase.from('vouchers').delete().eq('id', voucherId);
      }
      throw tError;
    }

    return resultVoucher;
  },

  async bulkCreateAccounts(accounts: any[]) {
    const { data, error } = await supabase
      .from('accounts')
      .insert(accounts)
      .select();

    if (error) throw error;
    return data;
  },

  getNextLedgerCode(accType: string, existingAccounts: any[], currentBulkRows: any[] = []) {
    const defaults: Record<string, string> = {
      'ASSET': '1000',
      'EXPENSE': '2000',
      'INCOME': '3000',
      'LIABILITY': '4000',
      'EQUITY': '5000'
    };

    const defaultCode = defaults[accType] || '1000';

    const allCodes = [
      ...existingAccounts.filter(a => a.type === accType).map(a => a.code),
      ...currentBulkRows.filter(r => r.type === accType).map(r => r.code)
    ];

    const numericCodes = allCodes
      .map(c => parseInt(c))
      .filter(n => !isNaN(n));

    if (numericCodes.length === 0) return defaultCode;

    const maxCode = Math.max(...numericCodes);
    return (maxCode + 1).toString();
  }
};
