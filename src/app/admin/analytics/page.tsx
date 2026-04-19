'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { router.replace('/admin'); return; }
    adminApi.analytics().then(setData).catch(() => router.replace('/admin')).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-dvh flex items-center justify-center" style={{ background: '#f8f9fa' }}><p className="text-gray-500">Loading...</p></div>;

  const d = data || {};

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">📊 Analytics</h1>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Revenue</h2>
          <p className="text-4xl font-bold text-green-600">${((d.totalRevenue || 0) / 100).toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Total revenue</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">${((d.avgSpendPerUser || 0) / 100).toFixed(2)}</p>
              <p className="text-xs text-gray-500">Avg spend/user</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{d.conversionRate?.purchaseRate || 0}%</p>
              <p className="text-xs text-gray-500">Match → Purchase</p>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Conversion Funnel</h2>
          <div className="space-y-2">
            {[
              { label: 'Total Matches', value: d.conversionRate?.totalMatches || 0 },
              { label: 'Date Requests Sent', value: d.conversionRate?.matchesWithDateRequests || 0, rate: d.conversionRate?.requestRate },
              { label: 'Dates Paid', value: d.conversionRate?.matchesWithPayments || 0, rate: d.conversionRate?.purchaseRate },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div>
                  <span className="text-lg font-bold text-gray-900">{item.value}</span>
                  {item.rate && <span className="text-sm text-gray-400 ml-2">({item.rate}%)</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Active Users</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total', value: d.activeUsers?.total || 0 },
              { label: 'Daily Active', value: d.activeUsers?.daily || 0 },
              { label: 'Weekly Active', value: d.activeUsers?.weekly || 0 },
              { label: 'Monthly Active', value: d.activeUsers?.monthly || 0 },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Packages */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Popular Date Packages</h2>
          <div className="space-y-2">
            {(d.popularPackages || []).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.category} — ${(p.price_cents / 100).toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 text-sm">{p.times_purchased} sold</p>
                  <p className="text-xs text-green-600">${((p.total_revenue || 0) / 100).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
