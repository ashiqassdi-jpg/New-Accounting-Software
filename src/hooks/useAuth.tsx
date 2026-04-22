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
