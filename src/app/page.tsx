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

  // Hard 3s timeout to prevent infinite spinner
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Still loading and haven't timed out — wait
    if (loading && !timedOut) return;

    if (user) {
      // Authenticated with profile
      if (!user.onboarding_complete) {
        router.replace('/onboarding');
      } else {
        // Check for active mixer event
        checkActiveEvent();
      }
    } else if (session) {
      // Authenticated but no profile row (or profile fetch failed)
      // Send to onboarding — they need to complete their profile
      router.replace('/onboarding');
    }
    // else: no session, no user → show AuthFlow (below)
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
      </div>
    );
  }

  // Not authenticated — show sign in
  if (!user && !session) {
    return <AuthFlow />;
  }

  // Authenticated, waiting for redirect
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
    </div>
  );
}
