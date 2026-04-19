'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminDuplicatesPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.duplicates().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLock = async (id: string) => {
    if (!confirm('Lock this account?')) return;
    await adminApi.lockUser(id);
    adminApi.duplicates().then(setData);
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleString() : 'Never';

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">🔍 Duplicate Detection</h1>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : data && (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-3">🌐 Shared IP Addresses</h2>
            {data.duplicateIPs.length === 0 ? (
              <p className="text-gray-500 text-sm mb-6">No shared IPs found.</p>
            ) : (
              <div className="space-y-3 mb-8">
                {data.duplicateIPs.map((group: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
                    <p className="text-sm font-mono text-gray-600 mb-2">IP: {group.ip}</p>
                    <div className="space-y-1">
                      {group.users.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <div>
                            <span className="font-medium text-gray-900">{u.first_name || '(no name)'}</span>
                            <span className="text-gray-400 ml-2">{u.phone_number}</span>
                            {u.locked_at && <span className="ml-2 text-xs text-red-500">🔒</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDate(u.last_login_at)}</span>
                            {!u.locked_at && (
                              <button onClick={() => handleLock(u.id)} className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100">Lock</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="text-lg font-bold text-gray-900 mb-3">📱 Shared Device Fingerprints</h2>
            {data.duplicateFingerprints.length === 0 ? (
              <p className="text-gray-500 text-sm">No shared fingerprints found.</p>
            ) : (
              <div className="space-y-3">
                {data.duplicateFingerprints.map((group: any, i: number) => (
                  <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-400">
                    <p className="text-sm font-mono text-gray-600 mb-2">Fingerprint: {group.fingerprint}</p>
                    <div className="space-y-1">
                      {group.users.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50">
                          <div>
                            <span className="font-medium text-gray-900">{u.first_name || '(no name)'}</span>
                            <span className="text-gray-400 ml-2">{u.phone_number}</span>
                            {u.locked_at && <span className="ml-2 text-xs text-red-500">🔒</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{formatDate(u.last_login_at)}</span>
                            {!u.locked_at && (
                              <button onClick={() => handleLock(u.id)} className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 hover:bg-red-100">Lock</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
