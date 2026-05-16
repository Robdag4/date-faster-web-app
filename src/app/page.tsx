'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { AuthFlow } from '@/components/auth/auth-flow';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.onboarding_complete) {
        router.push('/onboarding');
      } else {
        // Check for active mixer event before going to discover
        checkActiveEvent();
      }
    } else if (session && !user) {
      router.push('/onboarding');
    }
  }, [user, session, loading, router]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthFlow />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
    </div>
  );
}