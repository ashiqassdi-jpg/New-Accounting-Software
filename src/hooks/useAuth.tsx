/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';
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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // If it's the super admin, create a profile automatically if missing
      if (u.email === 'ashiq.assdi@gmail.com') {
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert([{
            id: u.id,
            name: 'Super Admin',
            role: 'SUPER_ADMIN',
            can_add: true,
            can_edit: true,
            can_delete: true
          }])
          .select()
          .single();
        return newProfile ? { ...newProfile, email: u.email } as UserProfile : null;
      }
      return null;
    }
    return { ...data, email: u.email } as UserProfile;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user).then(setProfile);
      } else {
        setProfile(null);
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

  const value = {
    user,
    profile,
    session,
    loading,
    isAdmin: user?.email === 'ashiq.assdi@gmail.com' || profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN',
    isSuperAdmin: user?.email === 'ashiq.assdi@gmail.com' || profile?.role === 'SUPER_ADMIN',
    canAdd: user?.email === 'ashiq.assdi@gmail.com' || profile?.can_add !== false,
    canEdit: user?.email === 'ashiq.assdi@gmail.com' || profile?.can_edit !== false,
    canDelete: user?.email === 'ashiq.assdi@gmail.com' || profile?.can_delete !== false,
    signOut,
    refreshProfile,
  };

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
