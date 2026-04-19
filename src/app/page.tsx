'use client';

import { useAuth } from '@/components/providers/auth-provider';
import { AuthFlow } from '@/components/auth/auth-flow';
import { AppShell } from '@/components/layout/app-shell';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (!user.onboarding_complete) {
        router.push('/onboarding');
      } else {
        router.push('/discover');
      }
    }
  }, [user, loading, router]);

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