'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminRedemptionsPage() {
  const router = useRouter();
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { adminApi.redemptions().then(setRedemptions).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const togglePayout = async (r: any) => {
    if (!r.payment_id) return;
    const newStatus = r.payout_status === 'paid' ? 'pending' : 'paid';
    await adminApi.updatePayout(r.payment_id, newStatus);
    load();
  };

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-2xl text-gray-400">←</button>
          <h1 className="text-2xl font-bold text-gray-900">🎟️ Redemptions</h1>
        </div>

        {loading ? <p className="text-gray-500">Loading...</p> : redemptions.length === 0 ? <p className="text-gray-500">No redemptions yet</p> : (
          <div className="space-y-3">
            {redemptions.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{r.package_name}</h3>
                    <p className="text-sm text-gray-500">👫 {r.sender_name} & {r.receiver_name}</p>
                    {r.venue_name && <p className="text-sm text-gray-500">📍 {r.venue_name}</p>}
                    {r.scheduled_date && <p className="text-sm text-gray-400">📅 {r.scheduled_date} {r.scheduled_time || ''}</p>}
                    <p className="text-xs font-mono text-gray-400 mt-1">Code: {r.redemption_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCents(r.price_cents)}</p>
                    {r.redeemed_at ? (
                      <p className="text-xs text-green-600 font-semibold">✅ Redeemed</p>
                    ) : (
                      <p className="text-xs text-gray-400">Not redeemed</p>
                    )}
                  </div>
                </div>
                {r.redeemed_at && r.payment_id && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.payout_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      Payout: {r.payout_status}
                    </span>
                    <button onClick={() => togglePayout(r)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
                      Mark {r.payout_status === 'paid' ? 'Pending' : 'Paid'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
