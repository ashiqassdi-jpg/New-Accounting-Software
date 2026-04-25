/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole, Company } from '../types';
import { useAppStore } from '../store';
import { Session, User } from '@supabase/supabase-js';
import SetupRequired from '../components/SetupRequired';

const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageCompanies: boolean;
  canWipeData: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const setProfileStore = useAppStore(state => state.setProfile);
  const setAccessibleCompanies = useAppStore(state => state.setAccessibleCompanies);
  const setLoadingStore = useAppStore(state => state.setLoading);

  const fetchAccessibleCompanies = async (profile: UserProfile | null) => {
    if (!profile) return [];
    
    let query = supabase.from('companies').select('*');
    
    const isSuperAdminUser = profile.role === 'SUPER_ADMIN' || profile.email === 'ashiq.assdi@gmail.com';

    // If not super admin, restrict by company purview
    if (!isSuperAdminUser) {
      if (profile.companies && profile.companies.length > 0) {
        query = query.in('id', profile.companies);
      } else {
        // If moderator/admin with no selected companies, they see nothing
        return [];
      }
    }

    const { data } = await query;
    return data as Company[] || [];
  };

  const fetchProfile = async (u: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (error && error.code === 'PGRST116') { // No record found
      console.log('Profile missing, creating automatic profile for user:', u.email);
      
      const isInitialSuperAdmin = u.email === 'ashiq.assdi@gmail.com';
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          id: u.id,
          name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'New User',
          email: u.email,
          role: isInitialSuperAdmin ? 'SUPER_ADMIN' : 'MODERATOR',
          can_add: true,
          can_edit: isInitialSuperAdmin,
          can_delete: isInitialSuperAdmin,
          can_manage_companies: isInitialSuperAdmin,
          can_wipe_data: isInitialSuperAdmin,
          joining_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating automatic profile:', insertError);
        return null;
      }
      
      return { ...newProfile, email: u.email } as UserProfile;
    }

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    return { ...data, email: u.email } as UserProfile;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Initial session fetch error:', error);
        // "Refresh Token Not Found" or "Invalid Refresh Token" means local state is out of sync
        if (error.message.includes('Refresh Token Not Found') || error.message.includes('invalid_grant')) {
          supabase.auth.signOut();
        }
        setLoading(false);
        return;
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).then(setProfile);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Fatal auth error:', err);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // If we get an error-like event or invalid refresh token error is thrown internally
      // console.log('Auth state change:', event, session);
      
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).then(setProfile);
      } else {
        setProfile(null);
        // If event is SIGNED_OUT, we've already handled it
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user);
      setProfile(p);
    }
  };

  useEffect(() => {
    const p = profile ? { ...profile } as UserProfile : null;
    setProfileStore(p);
    if (p) {
      fetchAccessibleCompanies(p).then(setAccessibleCompanies);
    } else {
      setAccessibleCompanies([]);
    }
    setLoadingStore(loading);
  }, [profile, loading]);

  const value = React.useMemo(() => {
    const isSA = user?.email === 'ashiq.assdi@gmail.com' || profile?.role === 'SUPER_ADMIN';
    const isA = isSA || profile?.role === 'ADMIN';

    return {
      user,
      profile,
      session,
      loading,
      isAdmin: isA,
      isSuperAdmin: isSA,
      canAdd: isSA || profile?.can_add !== false,
      canEdit: isSA || profile?.can_edit !== false,
      canDelete: isSA || profile?.can_delete !== false,
      canManageCompanies: isSA || (profile?.can_manage_companies !== false && isA),
      canWipeData: isSA || profile?.can_wipe_data === true,
      signOut,
      refreshProfile,
    };
  }, [user, profile, session, loading]);

  if (!isSupabaseConfigured) {
    return <SetupRequired />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
