'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

type Tab = 'all' | 'active' | 'no-photos' | 'deleted' | 'locked' | 'flagged';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userChats, setUserChats] = useState<any[]>([]);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [sort, setSort] = useState<'newest' | 'matches' | 'active'>('newest');
  const [counts, setCounts] = useState<any>({});

  const loadUsers = (q?: string) => {
    setLoading(true);
    adminApi.users(q).then((data: any[]) => {
      setUsers(data);
      setCounts({
        all: data.filter(u => !u.deleted_at).length,
        active: data.filter(u => !u.deleted_at && u.onboarding_complete && !u.locked_at).length,
        noPhotos: data.filter(u => !u.deleted_at && (!u.photos || u.photos.filter((p: string) => p).length < 3)).length,
        deleted: data.filter(u => u.deleted_at).length,
        locked: data.filter(u => u.locked_at && !u.deleted_at).length,
        flagged: data.filter(u => u.photo_flagged).length,
      });
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(search);
  };

  const filtered = users.filter(u => {
    if (tab === 'all') return !u.deleted_at;
    if (tab === 'active') return !u.deleted_at && u.onboarding_complete && !u.locked_at;
    if (tab === 'no-photos') return !u.deleted_at && (!u.photos || u.photos.filter((p: string) => p).length < 3);
    if (tab === 'deleted') return !!u.deleted_at;
    if (tab === 'locked') return !!u.locked_at && !u.deleted_at;
    if (tab === 'flagged') return !!u.photo_flagged;
    return true;
  }).sort((a, b) => {
    if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  const handleSelectUser = async (id: string) => {
    if (selectedUser === id) { setSelectedUser(null); return; }
    try {
      const data = await adminApi.user(id);
      setUserDetail(data);
      setSelectedUser(id);
      setUserChats(data.chats || []);
      setOpenChat(null);
      setChatMessages([]);
    } catch {}
  };

  const handleAction = async (id: string, action: string) => {
    if (action === 'lock' && !confirm('Lock this account?')) return;
    if (action === 'delete' && !confirm('Delete this user? They can be restored later.')) return;
    try {
      if (action === 'lock') await adminApi.lockUser(id);
      else if (action === 'unlock') await adminApi.unlockUser(id);
      else if (action === 'delete') await adminApi.deleteUser(id);
      else if (action === 'restore') await adminApi.restoreUser(id);
      loadUsers(search);
      if (selectedUser === id) handleSelectUser(id);
    } catch {}
  };

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;
  const photoCount = (u: any) => Array.isArray(u.photos) ? u.photos.filter((p: string) => p).length : 0;

  const tabs: { key: Tab; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: counts.all || 0, color: 'bg-gray-100 text-gray-700' },
    { key: 'active', label: 'Active', count: counts.active || 0, color: 'bg-green-100 text-green-700' },
    { key: 'no-photos', label: 'No Photos', count: counts.noPhotos || 0, color: 'bg-amber-100 text-amber-700' },
    { key: 'locked', label: 'Locked', count: counts.locked || 0, color: 'bg-red-100 text-red-700' },
    { key: 'deleted', label: 'Deleted', count: counts.deleted || 0, color: 'bg-gray-100 text-gray-500' },
    { key: 'flagged', label: '🚩 Flagged', count: counts.flagged || 0, color: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">👥 Users</h1>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} shown</span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none text-gray-900 text-sm"
            placeholder="Search by name or phone..." />
          <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium">Search</button>
        </form>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                tab === t.key ? 'ring-2 ring-gray-900 ' + t.color : t.color + ' opacity-60'
              }`}>
              {t.label} <span className="font-bold">{t.count}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2 mb-4">
          {(['newest', 'active', 'matches'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${sort === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {s === 'newest' ? '🕐 Newest' : s === 'active' ? '🔥 Active' : '💕 Matches'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No users found</p>
        ) : (
          <div className="space-y-2">
            {filtered.map(u => (
              <div key={u.id}>
                <div className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer ${
                  selectedUser === u.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'
                } shadow-sm`}
                  onClick={() => handleSelectUser(u.id)}>

                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0">
                    {u.photos?.[0] ? (
                      <img src={u.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">👤</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{u.first_name || '(no name)'}</span>
                      {u.age && <span className="text-xs text-gray-400">{u.age}y</span>}
                      {u.gender && <span className="text-xs text-gray-400">• {u.gender}</span>}
                      {u.is_premium && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">⭐ PRO</span>}
                      {u.locked_at && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">🔒</span>}
                      {u.deleted_at && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500">🗑️</span>}
                      {u.photo_flagged && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">🚩</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.phone_number} • 📸 {photoCount(u)} photos</p>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {u.deleted_at ? (
                      <button onClick={() => handleAction(u.id, 'restore')}
                        className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200">
                        Restore
                      </button>
                    ) : (
                      <>
                        {u.locked_at ? (
                          <button onClick={() => handleAction(u.id, 'unlock')}
                            className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-medium hover:bg-green-200">
                            Unlock
                          </button>
                        ) : (
                          <button onClick={() => handleAction(u.id, 'lock')}
                            className="px-2 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200">
                            Lock
                          </button>
                        )}
                        <button onClick={() => handleAction(u.id, 'delete')}
                          className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200">
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded Detail */}
                {selectedUser === u.id && userDetail && (
                  <div className="bg-white rounded-xl p-4 mt-1 mb-2 shadow-sm border border-gray-100 space-y-4">
                    {/* Photos Grid */}
                    {u.photos && u.photos.filter((p: string) => p).length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">📸 Photos ({photoCount(u)})</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {u.photos.filter((p: string) => p).map((photo: string, i: number) => (
                            <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              <img src={photo} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900">{userDetail.analytics.datesPurchased}</p>
                        <p className="text-[10px] text-gray-500">Dates</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900">{formatCents(userDetail.analytics.totalSpent)}</p>
                        <p className="text-[10px] text-gray-500">Spent</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900">{userDetail.analytics.matchCount}</p>
                        <p className="text-[10px] text-gray-500">Matches</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900">{photoCount(u)}</p>
                        <p className="text-[10px] text-gray-500">Photos</p>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
                      <p className="font-medium text-gray-700 mb-1">📋 Profile</p>
                      {userDetail.user.tagline && <p className="text-gray-600">💬 "{userDetail.user.tagline}"</p>}
                      {userDetail.user.job_title && <p className="text-gray-600">💼 {userDetail.user.job_title}</p>}
                      {userDetail.user.ideal_date && <p className="text-gray-600">❤️ Ideal date: {userDetail.user.ideal_date}</p>}
                      {userDetail.user.relationship_goal && <p className="text-gray-600">🎯 Looking for: {userDetail.user.relationship_goal}</p>}
                      <p className="text-gray-600">📍 Lat: {userDetail.user.latitude?.toFixed(2) || 'N/A'}, Lng: {userDetail.user.longitude?.toFixed(2) || 'N/A'}</p>
                      <p className="text-gray-600">🔍 Preference: {userDetail.user.preference || 'N/A'} • Radius: {userDetail.user.discovery_radius || 25}mi</p>
                      <p className="text-gray-600">📅 Joined: {new Date(userDetail.user.created_at).toLocaleDateString()}</p>
                      {userDetail.user.last_login_at && <p className="text-gray-600">🕐 Last login: {new Date(userDetail.user.last_login_at).toLocaleString()}</p>}
                    </div>

                    {/* Tracking */}
                    {(userDetail.user.last_ip || userDetail.user.last_device_fingerprint) && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-xs">
                        <p className="font-medium text-gray-700 mb-1">📡 Tracking</p>
                        {userDetail.user.last_ip && <p className="text-gray-600">IP: <span className="font-mono">{userDetail.user.last_ip}</span></p>}
                        {userDetail.user.last_device_fingerprint && <p className="text-gray-600">Fingerprint: <span className="font-mono">{userDetail.user.last_device_fingerprint}</span></p>}
                      </div>
                    )}

                    {/* Payment History */}
                    {userDetail.analytics.dateHistory.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">💳 Payment History</p>
                        {userDetail.analytics.dateHistory.slice(0, 5).map((d: any) => (
                          <div key={d.payment_id} className="flex justify-between text-xs py-1.5 border-b border-gray-50">
                            <span className="text-gray-600">{d.package_name}</span>
                            <span className="text-gray-900 font-medium">{formatCents(d.amount_cents)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Chats */}
                    {userChats.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">💬 Chats ({userChats.length})</p>
                        {userChats.map((c: any) => {
                          const otherName = c.user1_id === selectedUser ? c.user2_name : c.user1_name;
                          return (
                            <div key={c.match_id}>
                              <button onClick={async () => {
                                if (openChat === c.match_id) { setOpenChat(null); return; }
                                setOpenChat(c.match_id);
                                try { setChatMessages(await adminApi.matchMessages(c.match_id)); } catch { setChatMessages([]); }
                              }}
                                className="w-full flex justify-between items-center text-xs py-2 border-b border-gray-50 hover:bg-gray-50 px-1 rounded">
                                <span className="text-gray-700 font-medium">with {otherName || 'Unknown'}</span>
                                <span className="text-gray-400">{c.message_count} msgs • {c.status}</span>
                              </button>
                              {openChat === c.match_id && (
                                <div className="bg-gray-50 rounded-lg p-3 my-1 max-h-64 overflow-y-auto space-y-2">
                                  {chatMessages.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center">No messages yet</p>
                                  ) : chatMessages.map((msg: any) => (
                                    <div key={msg.id} className={`text-xs ${msg.sender_id === selectedUser ? 'text-right' : 'text-left'}`}>
                                      <span className="font-medium text-gray-700">{msg.sender_name}</span>
                                      <div className={`inline-block px-3 py-1.5 rounded-xl mt-0.5 max-w-[80%] ${
                                        msg.sender_id === selectedUser ? 'bg-rose-100 text-gray-800 ml-auto' : 'bg-white text-gray-800'
                                      }`}>
                                        {msg.content}
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(msg.created_at).toLocaleString()}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
