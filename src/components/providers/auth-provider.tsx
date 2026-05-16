'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { User as AppUser } from '@/types';

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) {
        console.error('fetchUserProfile error:', error.message);
        return null;
      }
      if (!data) {
        // Auth user exists but no profile row — create a skeleton row
        // so onboarding can proceed
        console.log('No profile row for user, creating skeleton...');
        const { data: newRow, error: insertErr } = await supabase
          .from('users')
          .insert({ id: userId, first_name: '', age: 0, onboarding_complete: false })
          .select('*')
          .single();
        if (insertErr) {
          console.error('Failed to create skeleton profile:', insertErr.message);
          return null;
        }
        return newRow as AppUser;
      }
      return data as AppUser;
    } catch (error) {
      console.error('fetchUserProfile exception:', error);
      return null;
    }
  };

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user?.id) {
      const profile = await fetchUserProfile(s.user.id);
      setUser(profile);
      setSession(s);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  useEffect(() => {
    let mounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user?.id) {
        const profile = await fetchUserProfile(s.user.id);
        if (mounted) setUser(profile);
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // 2. Listen for auth changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        console.log('Auth event:', event);
        setSession(newSession);

        if (newSession?.user?.id && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          const profile = await fetchUserProfile(newSession.user.id);
          if (mounted) {
            setUser(profile);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // 3. Safety timeout — never stay loading forever
    const safety = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 4000);

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
