'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

/**
 * Public guest entry for Singles Mixer — no phone number required.
 * Enter event code + name (+ gender) → creates a guest session → drops
 * straight into the Two Truths and a Lie game at /events/mixer.
 */
export default function GuestMixerPage() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [joining, setJoining] = useState(false);

  const join = async () => {
    if (!eventCode.trim()) {
      toast.error('Enter your event code');
      return;
    }
    if (!name.trim()) {
      toast.error('Enter your name');
      return;
    }
    if (!gender) {
      toast.error('Select your gender');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch('/api/events/mixer/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: eventCode.trim(),
          name: name.trim(),
          gender: gender || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not join');
        setJoining(false);
        return;
      }

      // Establish the guest session in the browser Supabase client.
      // setSession can stall on token validation, so race it against a
      // timeout and navigate regardless — the session is persisted to
      // storage either way and the mixer page reads it from getSession().
      try {
        await Promise.race([
          supabase.auth.setSession({
            access_token: data.accessToken,
            refresh_token: data.refreshToken,
          }),
          new Promise((resolve) => setTimeout(resolve, 2500)),
        ]);
      } catch {
        // ignore — fall through to navigation
      }

      toast.success("You're in! 🎉");
      // Hard navigation so the auth provider re-reads the persisted session
      // cleanly on the mixer page.
      window.location.href = '/events/mixer';
    } catch {
      toast.error('Network error. Please try again.');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Singles Mixer</h1>
          <p className="text-slate-600">
            Enter your event code to join the game
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Event Code
            </label>
            <input
              type="text"
              placeholder="1234"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-center text-2xl font-mono tracking-widest"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              placeholder="First name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              I am a...
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: 'male', label: 'Man' },
                { v: 'female', label: 'Woman' },
              ] as const).map((g) => (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => setGender(g.v)}
                  className={`py-3 rounded-lg border-2 font-medium transition-colors ${
                    gender === g.v
                      ? 'border-rose-500 bg-rose-50 text-rose-600'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={join}
            disabled={joining || !eventCode.trim() || !name.trim() || !gender}
            className="btn-primary w-full disabled:opacity-50"
          >
            {joining ? 'Joining...' : 'Join Mixer'}
          </button>
        </motion.div>

        <div className="bg-blue-50 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• Submit 3 statements (2 truths, 1 lie)</p>
            <p>• Guess other people&apos;s lies</p>
            <p>• Star people you want to match with</p>
            <p>• Connect with your mutual matches</p>
          </div>
        </div>
      </div>
    </div>
  );
}
