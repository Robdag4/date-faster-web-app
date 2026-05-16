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

  // Hard 3-second timeout — if auth is still loading, force show auth flow
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading && !timedOut) return;
    if (user) {
      if (!user.onboarding_complete) {
        router.push('/onboarding');
      } else {
        checkActiveEvent();
      }
    } else if (session && !user) {
      router.push('/onboarding');
    }
    // If timedOut and no session/user, AuthFlow will render below
  }, [user, session, loading, timedOut, router]);

  const checkActiveEvent = async () => {
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!s) { router.push('/discover'); return; }
      const res = await fetch('/api/events/mixer/statements', {
        headers: { 'Authorization': `Bearer ${s.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.eventId && ['active', 'checkin', 'draft'].includes(data.eventStatus)) {
          router.push('/events/mixer');
          return;
        }
      }
    } catch (e) {
      console.error('Error checking active event:', e);
    }
    router.push('/discover');
  };

  // Show spinner only briefly (max 3s)
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  // No user — show auth flow (also shown after timeout if auth hung)
  if (!user && !session) {
    return <AuthFlow />;
  }

  // Have user/session, waiting for redirect
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
    </div>
  );
}
