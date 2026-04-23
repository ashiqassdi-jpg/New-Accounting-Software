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
