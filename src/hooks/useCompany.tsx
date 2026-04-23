/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Company } from '../types';
import { useAuth } from './useAuth';
import { useAppStore } from '../store';

interface CompanyContextType {
  companies: Company[];
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company | null) => void;
  loading: boolean;
  refreshCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const accessibleCompanies = useAppStore(state => state.accessibleCompanies);
  const loadingStore = useAppStore(state => state.loading);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    // Auto-select first company if none selected and companies changed
    if (accessibleCompanies.length > 0 && !selectedCompany) {
      setSelectedCompany(accessibleCompanies[0]);
    } else if (accessibleCompanies.length > 0 && selectedCompany) {
      // Check if selected company is still in accessible list
      const stillAccessible = accessibleCompanies.find(c => c.id === selectedCompany.id);
      if (!stillAccessible) {
        setSelectedCompany(accessibleCompanies[0]);
      }
    } else if (accessibleCompanies.length === 0) {
      setSelectedCompany(null);
    }
  }, [accessibleCompanies]);

  const value = {
    companies: accessibleCompanies,
    selectedCompany,
    setSelectedCompany,
    loading: loadingStore,
    refreshCompanies: async () => {
      await refreshProfile();
    },
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
