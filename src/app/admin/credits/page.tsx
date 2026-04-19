'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminCreditsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { router.replace('/admin'); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [u, h] = await Promise.all([adminApi.users(), adminApi.creditsHistory()]);
      setUsers(u);
      setHistory(h);
    } catch { router.replace('/admin'); }
  }

  async function issueCredit() {
    if (!selectedUser || !amount) return;
    setSubmitting(true);
    try {
      await adminApi.issueCredits(selectedUser, Math.round((parseFloat(amount) || 0) * 100), reason);
      setMsg('Credits issued!');
      setAmount(''); setReason(''); setSelectedUser('');
      loadData();
    } catch (e: any) { setMsg(e.message || 'Error'); }
    setSubmitting(false);
  }

  const filtered = users.filter(u =>
    (u.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone_number || '').includes(search)
  );

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
          <h1 className="text-2xl font-bold text-gray-900">💳 Credits Management</h1>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
          <h2 className="text-lg font-bold text-gray-900">Issue Credits</h2>
          <input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-gray-200 outline-none text-gray-900" />
          {search && (
            <div className="max-h-48 overflow-auto">
              {filtered.slice(0, 10).map(u => (
                <button key={u.id} onClick={() => { setSelectedUser(u.id); setSearch(u.first_name || u.phone_number || u.id.slice(0, 8)); }}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${selectedUser === u.id ? 'bg-blue-50' : 'hover:bg-gray-50'} text-gray-900`}>
                  {u.first_name || 'No name'} — {u.phone_number || u.id.slice(0, 8)}
                  {u.credits_balance > 0 && <span className="text-green-600 ml-2">(${(u.credits_balance / 100).toFixed(2)} credits)</span>}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <input type="number" placeholder="Amount ($)" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 outline-none text-gray-900" />
            <input placeholder="Reason" value={reason} onChange={e => setReason(e.target.value)}
              className="flex-[2] px-4 py-2 rounded-xl border border-gray-200 outline-none text-gray-900" />
          </div>
          <button onClick={issueCredit} disabled={submitting || !selectedUser || !amount}
            className="px-6 py-2 rounded-xl bg-gray-900 text-white font-semibold text-sm disabled:opacity-50">
            {submitting ? 'Issuing...' : 'Issue Credits'}
          </button>
          {msg && <p className={`text-sm ${msg.includes('!') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Credit History</h2>
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm">No credits issued yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{h.first_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{h.reason || 'No reason'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">${(h.amount_cents / 100).toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
