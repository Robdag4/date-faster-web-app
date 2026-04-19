'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userChats, setUserChats] = useState<any[]>([]);
  const [openChat, setOpenChat] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const loadUsers = (q?: string) => {
    setLoading(true);
    adminApi.users(q).then(setUsers).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(search);
  };

  const handleSelectUser = async (id: string) => {
    try {
      const data = await adminApi.user(id);
      setUserDetail(data);
      setSelectedUser(id);
      setUserChats(data.chats || []);
      setOpenChat(null);
      setChatMessages([]);
    } catch {}
  };

  const handleLock = async (id: string) => {
    if (!confirm('Lock this account?')) return;
    await adminApi.lockUser(id);
    loadUsers(search);
    if (selectedUser === id) handleSelectUser(id);
  };

  const handleUnlock = async (id: string) => {
    await adminApi.unlockUser(id);
    loadUsers(search);
    if (selectedUser === id) handleSelectUser(id);
  };

  const formatCents = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">👥 Users</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none text-gray-900"
            placeholder="Search by name or phone..." />
          <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium">Search</button>
        </form>

        {loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id}>
                <button onClick={() => handleSelectUser(u.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition ${selectedUser === u.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-white'} shadow-sm`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{u.first_name || '(no name)'}</span>
                      <span className="text-xs text-gray-400">{u.age ? `${u.age}y` : ''}</span>
                      {u.locked_at && <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">🔒 Locked</span>}
                      {u.deleted_at && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Deleted</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{u.phone_number} • {u.gender} • Credits: {formatCents(u.credits_balance || 0)}</p>
                  </div>
                </button>

                {selectedUser === u.id && userDetail && (
                  <div className="bg-white rounded-xl p-4 mt-1 mb-2 shadow-sm border border-gray-100 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {u.locked_at ? (
                        <button onClick={() => handleUnlock(u.id)} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs font-medium">Unlock</button>
                      ) : (
                        <button onClick={() => handleLock(u.id)} className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-medium">Lock Account</button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
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
                    </div>

                    {userDetail.user.last_ip && (
                      <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-medium text-gray-700 mb-1">📡 Tracking Info</p>
                        <p className="text-xs text-gray-600">IP: <span className="font-mono">{userDetail.user.last_ip}</span></p>
                        <p className="text-xs text-gray-600">Fingerprint: <span className="font-mono">{userDetail.user.last_device_fingerprint || 'N/A'}</span></p>
                        <p className="text-xs text-gray-600">Last Login: {userDetail.user.last_login_at ? new Date(userDetail.user.last_login_at).toLocaleString() : 'N/A'}</p>
                      </div>
                    )}

                    {userDetail.analytics.dateHistory.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-1">Payment History</p>
                        {userDetail.analytics.dateHistory.slice(0, 5).map((d: any) => (
                          <div key={d.payment_id} className="flex justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-600">{d.package_name}</span>
                            <span className="text-gray-900 font-medium">{formatCents(d.amount_cents)}</span>
                          </div>
                        ))}
                      </div>
                    )}

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
                                      <div className={`inline-block px-3 py-1.5 rounded-xl mt-0.5 max-w-[80%] ${msg.sender_id === selectedUser ? 'bg-rose-100 text-gray-800 ml-auto' : 'bg-white text-gray-800'}`}>
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
