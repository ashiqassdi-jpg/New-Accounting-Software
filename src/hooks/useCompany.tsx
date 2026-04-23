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

const SELECTED_COMPANY_KEY = 'selected_company_id';

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const accessibleCompanies = useAppStore(state => state.accessibleCompanies);
  const loadingStore = useAppStore(state => state.loading);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  useEffect(() => {
    // Persistent Selection Logic
    if (accessibleCompanies.length > 0) {
      const savedCompanyId = localStorage.getItem(SELECTED_COMPANY_KEY);
      
      if (!selectedCompany) {
        // First load or refresh: try to find the saved company
        const savedCompany = accessibleCompanies.find(c => c.id === savedCompanyId);
        setSelectedCompany(savedCompany || accessibleCompanies[0]);
      } else {
        // Check if current selection is still valid in the (possibly updated) accessible list
        const stillAccessible = accessibleCompanies.find(c => c.id === selectedCompany.id);
        if (!stillAccessible) {
          // If not accessible anymore, fall back to saved one (if valid) or first available
          const savedCompany = accessibleCompanies.find(c => c.id === savedCompanyId);
          setSelectedCompany(savedCompany || accessibleCompanies[0]);
        }
      }
    } else if (accessibleCompanies.length === 0) {
      setSelectedCompany(null);
    }
  }, [accessibleCompanies, selectedCompany?.id]);

  const handleSetSelectedCompany = (company: Company | null) => {
    setSelectedCompany(company);
    if (company) {
      localStorage.setItem(SELECTED_COMPANY_KEY, company.id);
    } else {
      localStorage.removeItem(SELECTED_COMPANY_KEY);
    }
  };

  const value = {
    companies: accessibleCompanies,
    selectedCompany,
    setSelectedCompany: handleSetSelectedCompany,
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
