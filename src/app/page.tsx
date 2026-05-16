'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { AuthFlow } from '@/components/auth/auth-flow';
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
      if (user.onboarding_complete) {
        router.replace('/discover');
      } else {
        router.replace('/onboarding');
      }
    } else if (session) {
      // Session exists but no profile row — go to onboarding
      router.replace('/onboarding');
    }
    // else: no session — show AuthFlow (handled by render below)
  }, [user, session, loading, timedOut, router]);

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
