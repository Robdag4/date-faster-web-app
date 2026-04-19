'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '', contact_name: '', payout_method: 'manual', payout_details: '', pin: '' });

  const load = () => { adminApi.venues().then(setVenues).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await adminApi.updateVenue(editId, form);
      } else {
        await adminApi.createVenue(form);
      }
      setShowForm(false); setEditId(null); setForm({ name: '', address: '', phone: '', email: '', contact_name: '', payout_method: 'manual', payout_details: '', pin: '' });
      load();
    } catch { alert('Failed'); }
  };

  const startEdit = (v: any) => {
    setEditId(v.id);
    setForm({ name: v.name, address: v.address || '', phone: v.phone || '', email: v.email || '', contact_name: v.contact_name || '', payout_method: v.payout_method || 'manual', payout_details: v.payout_details || '', pin: v.pin || '' });
    setShowForm(true);
  };

  const toggleActive = async (v: any) => {
    await adminApi.updateVenue(v.id, { active: !v.active });
    load();
  };

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-2xl text-gray-400">←</button>
            <h1 className="text-2xl font-bold text-gray-900">📍 Venues</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', address: '', phone: '', email: '', contact_name: '', payout_method: 'manual', payout_details: '', pin: '' }); }}
            className="px-4 py-2 rounded-xl text-white font-semibold text-sm bg-gray-900">+ Add Venue</button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
            <h3 className="font-bold text-gray-900">{editId ? 'Edit Venue' : 'New Venue'}</h3>
            {['name', 'address', 'phone', 'email', 'contact_name', 'payout_details', 'pin'].map(f => (
              <input key={f} type="text" placeholder={f.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                value={(form as any)[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm" />
            ))}
            <select value={form.payout_method} onChange={e => setForm({ ...form, payout_method: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm">
              <option value="manual">Manual</option><option value="stripe">Stripe</option><option value="bank">Bank Transfer</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-xl text-white font-semibold text-sm bg-gray-900">Save</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-xl text-sm text-gray-500">Cancel</button>
            </div>
          </form>
        )}

        {loading ? <p className="text-gray-500">Loading...</p> : venues.length === 0 ? <p className="text-gray-500">No venues yet</p> : (
          <div className="space-y-3">
            {venues.map(v => (
              <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{v.name} {!v.active && <span className="text-xs text-red-400">(Inactive)</span>}</h3>
                    {v.address && <p className="text-sm text-gray-500">{v.address}</p>}
                    {v.contact_name && <p className="text-sm text-gray-500">Contact: {v.contact_name}</p>}
                    {v.phone && <p className="text-sm text-gray-400">{v.phone}</p>}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => startEdit(v)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">Edit</button>
                  <button onClick={() => toggleActive(v)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">
                    {v.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
