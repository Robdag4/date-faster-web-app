'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from './lib';

export default function AdminDashboard() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setAuthed(true);
      adminApi.stats().then(setStats).catch(() => {
        localStorage.removeItem('admin_token');
        setAuthed(false);
      });
    }
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      localStorage.setItem('admin_token', token);
      const s = await adminApi.stats();
      setAuthed(true);
      setStats(s);
    } catch {
      localStorage.removeItem('admin_token');
      setError('Invalid admin token');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setAuthed(false);
    setStats(null);
  };

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6" style={{ background: '#f8f9fa' }}>
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg space-y-4">
          <h1 className="text-2xl font-bold text-center text-gray-900">🔐 Admin Login</h1>
          <input type="password" value={token} onChange={e => setToken(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-gray-900"
            placeholder="Admin Token" />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full py-3 rounded-xl text-white font-semibold bg-gray-900">Sign In</button>
        </form>
      </div>
    );
  }

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📊 Admin Dashboard</h1>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
              { label: 'Active Matches', value: stats.activeMatches, icon: '💕' },
              { label: 'Pending Reports', value: stats.pendingReports, icon: '🚩', alert: stats.pendingReports > 0 },
              { label: 'Total Revenue', value: formatCents(stats.totalRevenue), icon: '💰' },
              { label: 'Total Payments', value: stats.totalPayments, icon: '💳' },
              { label: 'Credits Issued', value: formatCents(stats.totalCreditsIssued), icon: '🎁' },
            ].map((s, i) => (
              <div key={i} className={`bg-white rounded-xl p-4 shadow-sm ${s.alert ? 'ring-2 ring-red-300' : ''}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {[
            { href: '/admin/users', icon: '👥', label: 'Users', desc: 'Manage users' },
            { href: '/admin/reports', icon: '🚩', label: 'Reports', desc: 'Review reports' },
            { href: '/admin/credits', icon: '🎁', label: 'Credits', desc: 'Issue credits' },
            { href: '/admin/analytics', icon: '📈', label: 'Analytics', desc: 'Revenue & stats' },
            { href: '/admin/packages', icon: '🎁', label: 'Date Packages', desc: 'Manage packages' },
            { href: '/admin/duplicates', icon: '🔍', label: 'Duplicates', desc: 'Detect fake accounts' },
            { href: '/admin/venues', icon: '📍', label: 'Venues', desc: 'Manage venues' },
            { href: '/admin/redemptions', icon: '🎟️', label: 'Redemptions', desc: 'Track redemptions' },
            { href: '/admin/photos', icon: '📸', label: 'Photo Review', desc: 'Moderate uploads' },
            { href: '/admin/speed-dating', icon: '⚡', label: 'Speed Dating', desc: 'Manage events' },
            { href: '/admin/mixer', icon: '🎭', label: 'Mixers', desc: 'Two Truths & a Lie' },
          ].map(nav => (
            <button key={nav.href} onClick={() => router.push(nav.href)}
              className="bg-white rounded-xl p-5 shadow-sm text-left hover:shadow-md transition">
              <div className="text-3xl mb-2">{nav.icon}</div>
              <h3 className="font-bold text-gray-900">{nav.label}</h3>
              <p className="text-xs text-gray-500">{nav.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
