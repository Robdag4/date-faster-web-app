'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    adminApi.reports().then(setReports).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: string) => {
    const note = action === 'dismiss' ? '' : (prompt('Admin note (optional):') || '');
    if (action === 'ban' && !confirm('Ban this user? They will be locked out.')) return;
    try {
      await adminApi.reportAction(id, action, note);
      load();
    } catch { alert('Action failed'); }
  };

  const statusColor = (s: string) => {
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
    if (s === 'warned') return 'bg-orange-100 text-orange-700';
    if (s === 'banned') return 'bg-red-100 text-red-700';
    return 'bg-green-100 text-green-700';
  };

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">🚩 Reports</h1>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No reports</p>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>{r.status}</span>
                    <span className="text-xs ml-2 text-gray-400">{r.reason?.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                  <div>
                    <p className="text-gray-500">Reporter</p>
                    <p className="font-medium text-gray-900">{r.reporter_name} ({r.reporter_phone})</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Reported</p>
                    <p className="font-medium text-gray-900">{r.reported_name} ({r.reported_phone})</p>
                  </div>
                </div>

                {r.details && <p className="text-xs text-gray-600 mb-2 italic">&ldquo;{r.details}&rdquo;</p>}
                {r.admin_note && <p className="text-xs text-blue-600 mb-2">Admin: {r.admin_note}</p>}

                {r.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAction(r.id, 'warn')}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-medium">⚠️ Warn</button>
                    <button onClick={() => handleAction(r.id, 'ban')}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium">🚫 Ban</button>
                    <button onClick={() => handleAction(r.id, 'dismiss')}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-medium">✓ Dismiss</button>
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
