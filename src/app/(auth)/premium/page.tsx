'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { ArrowLeft } from 'lucide-react';

const benefits = [
  { icon: '↩️', title: 'Undo Swipes', desc: 'Changed your mind? Go back and swipe again' },
  { icon: '🥷', title: 'Incognito+', desc: 'See incognito users while staying hidden from non-premium' },
  { icon: '🌍', title: 'Change Location', desc: 'Set your discovery location to anywhere in the world' },
  { icon: '⭐', title: 'Premium Badge', desc: 'Stand out with a premium badge on your profile' },
  { icon: '🔥', title: 'Priority Discovery', desc: 'Get shown to more people first' },
  { icon: '💌', title: 'Unlimited Likes', desc: 'No daily limits on swiping' },
  { icon: '👀', title: 'See Who Likes You', desc: 'View everyone who liked your profile' },
];

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh flex items-center justify-center bg-cream-50"><div className="text-4xl animate-pulse">⭐</div></div>}>
      <PremiumContent />
    </Suspense>
  );
}

function PremiumContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [cancelAt, setCancelAt] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (searchParams.get('success') === '1') {
      refreshUser();
    }
  }, [searchParams, refreshUser]);

  useEffect(() => {
    if (user?.is_premium) {
      fetch('/api/premium/status').then(r => r.json()).then(s => setCancelAt(s.cancelAt)).catch(() => {});
    }
  }, [user?.is_premium]);

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch('/api/premium/checkout', {
        method: 'POST',
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to start checkout');
        setProcessing(false);
      }
    } catch {
      alert('Failed to start checkout');
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/premium/cancel', { method: 'POST' });
      const data = await res.json();
      setCancelAt(data.cancelAt);
      setShowCancelConfirm(false);
    } catch {
      alert('Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await fetch('/api/premium/reactivate', { method: 'POST' });
      setCancelAt(null);
    } catch {
      alert('Failed to reactivate');
    } finally {
      setProcessing(false);
    }
  };

  // Already premium view
  if (user?.is_premium) {
    return (
      <div className="min-h-dvh bg-cream-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">⭐</div>
        <h1 className="text-3xl font-bold mb-2 text-slate-900">You're Premium!</h1>
        <p className="mb-6 text-slate-500">All premium features are unlocked</p>

        {cancelAt ? (
          <div className="w-full max-w-xs space-y-3">
            <div className="rounded-2xl p-4 bg-amber-50 border border-amber-400">
              <p className="text-sm font-semibold text-amber-800">
                Your subscription ends {new Date(cancelAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button onClick={handleReactivate} disabled={processing}
              className="w-full px-8 py-3 rounded-xl text-white font-semibold gradient-bg disabled:opacity-50">
              {processing ? 'Processing...' : 'Keep My Subscription'}
            </button>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-3">
            <button onClick={() => router.push('/settings')} className="w-full px-8 py-3 rounded-xl text-white font-semibold gradient-bg">
              Go to Settings
            </button>
            <button onClick={() => setShowCancelConfirm(true)}
              className="w-full px-8 py-3 rounded-xl font-semibold text-sm text-slate-400 bg-white border border-slate-200">
              Cancel Subscription
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
            <div className="w-full max-w-sm rounded-3xl p-6 space-y-4 bg-white">
              <h3 className="text-xl font-bold text-center text-slate-900">Cancel Premium?</h3>
              <p className="text-sm text-center text-slate-500">
                You'll keep premium features until the end of your billing period.
              </p>
              <div className="space-y-2">
                <button onClick={handleCancel} disabled={processing}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-red-500 disabled:opacity-50">
                  {processing ? 'Canceling...' : 'Yes, Cancel'}
                </button>
                <button onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-3 rounded-xl font-semibold text-slate-900 bg-slate-100">
                  Never Mind
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Upgrade view
  return (
    <div className="min-h-dvh bg-cream-50 pb-8">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Premium ⭐</h1>
        <div className="w-10" />
      </div>

      <div className="px-4">
        <div className="text-center py-6">
          <div className="text-6xl mb-3">💎</div>
          <h2 className="text-3xl font-bold mb-2 text-slate-900">
            Date Faster <span className="text-rose-500">Premium</span>
          </h2>
          <p className="text-slate-500">Supercharge your dating experience</p>
        </div>

        <div className="space-y-3 mb-8">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl shadow-sm bg-white border border-slate-200">
              <div className="text-3xl flex-shrink-0">{b.icon}</div>
              <div>
                <h3 className="font-semibold text-slate-900">{b.title}</h3>
                <p className="text-sm mt-0.5 text-slate-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-6 text-center mb-4 bg-slate-900 shadow-lg">
          <p className="text-slate-400 text-sm mb-1">Monthly</p>
          <div className="text-4xl font-bold text-white mb-1">$19.99</div>
          <p className="text-slate-400 text-sm">Cancel anytime</p>
        </div>

        <button onClick={handleUpgrade} disabled={processing}
          className="w-full py-4 rounded-2xl text-white font-semibold text-lg disabled:opacity-50 bg-rose-500 hover:bg-rose-600 shadow-lg">
          {processing ? 'Redirecting to checkout...' : 'Go Premium ⭐'}
        </button>
        <p className="text-center text-xs mt-3 text-slate-400">
          Subscription auto-renews monthly. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
