'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
}

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...options.headers },
  });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

export default function PhotoModerationPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pending' | 'flagged' | 'approved'>('pending');

  const load = () => {
    setLoading(true);
    api(`photos?status=${tab}`).then(setPhotos).catch(() => setPhotos([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [tab]);

  const handleAction = async (id: string, action: 'approve' | 'flag' | 'remove') => {
    try {
      await api('photos', { method: 'PATCH', body: JSON.stringify({ id, action }) });
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch {}
  };

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">📸 Photo Moderation</h1>
        </div>

        <div className="flex gap-2 mb-4">
          {(['pending', 'flagged', 'approved'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-medium ${
                tab === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'
              }`}>
              {t === 'pending' ? '⏳ Pending' : t === 'flagged' ? '🚩 Flagged' : '✅ Approved'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : photos.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">{tab === 'pending' ? '🎉' : '📭'}</div>
            <p className="text-gray-500">{tab === 'pending' ? 'No photos to review!' : 'Nothing here'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map(p => (
              <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-square relative">
                  <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-gray-900 truncate">{p.user_name || 'Unknown'}</p>
                  <p className="text-[10px] text-gray-400">{new Date(p.created_at).toLocaleDateString()}</p>
                  <div className="flex gap-1 mt-2">
                    {tab !== 'approved' && (
                      <button onClick={() => handleAction(p.id, 'approve')}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium">
                        ✅
                      </button>
                    )}
                    {tab !== 'flagged' && (
                      <button onClick={() => handleAction(p.id, 'flag')}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium">
                        🚩
                      </button>
                    )}
                    <button onClick={() => handleAction(p.id, 'remove')}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-medium">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
