'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { AuthFlow } from '@/components/auth/auth-flow';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [debug, setDebug] = useState('init');

  // Hard 3s timeout to prevent infinite spinner
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setDebug(`l=${loading} t=${timedOut} u=${!!user} s=${!!session} oc=${user?.onboarding_complete}`);
    
    // Still loading and haven't timed out — wait
    if (loading && !timedOut) return;

    if (user) {
      if (!user.onboarding_complete) {
        setDebug('→ onboarding');
        router.replace('/onboarding');
      } else {
        setDebug('→ checkActive');
        checkActiveEvent();
      }
    } else if (session) {
      setDebug('→ onboarding (session only)');
      router.replace('/onboarding');
    } else {
      setDebug('→ show AuthFlow');
    }
  }, [user, session, loading, timedOut]);

  const checkActiveEvent = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { router.replace('/discover'); return; }
      const res = await fetch('/api/events/mixer/statements', {
        headers: { 'Authorization': `Bearer ${s.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.eventId && ['active', 'checkin', 'draft'].includes(data.eventStatus)) {
          router.replace('/events/mixer');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking active event:', e);
    }
    router.replace('/discover');
  };

  // Loading state (max 3s)
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
        <div className="fixed bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">{debug}</div>
      </div>
    );
  }

  // Not authenticated — show sign in
  if (!user && !session) {
    return (
      <>
        <AuthFlow />
        <div className="fixed bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">{debug}</div>
      </>
    );
  }

  // Authenticated, waiting for redirect
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      <div className="fixed bottom-2 left-2 text-xs bg-black/70 text-white px-2 py-1 rounded">{debug}</div>
    </div>
  );
}
