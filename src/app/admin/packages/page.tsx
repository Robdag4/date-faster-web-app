'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

const categories = ['dinner', 'drinks', 'coffee', 'activity', 'entertainment', 'outdoor', 'other'];

export default function AdminPackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [venues, setVenues] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: 'dinner', venue_id: '', image_url: '' });

  useEffect(() => {
    if (!localStorage.getItem('admin_token')) { router.replace('/admin'); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [p, v] = await Promise.all([adminApi.packages(), adminApi.venues()]);
      setPackages(p);
      setVenues(v);
    } catch { router.replace('/admin'); }
  }

  async function handleSubmit() {
    const price_cents = Math.round((parseFloat(form.price) || 0) * 100);
    const data = { ...form, price_cents };
    if (!data.name || !price_cents) { alert('Name and price required'); return; }
    try {
      if (editId) {
        await adminApi.updatePackage(editId, data);
      } else {
        await adminApi.createPackage(data);
      }
      setShowForm(false); setEditId(null);
      setForm({ name: '', description: '', price: '', category: 'dinner', venue_id: '', image_url: '' });
      loadData();
    } catch (e: any) { alert(e.message || 'Error'); }
  }

  function startEdit(p: any) {
    setEditId(p.id);
    setForm({
      name: p.name, description: p.description || '', price: (p.price_cents / 100).toFixed(2),
      category: p.category, venue_id: p.venue_id || '', image_url: p.image_url || '',
    });
    setShowForm(true);
  }

  async function toggleActive(p: any) {
    await adminApi.updatePackage(p.id, { active: !p.active });
    loadData();
  }

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin')} className="text-xl text-gray-500">←</button>
            <h1 className="text-2xl font-bold text-gray-900">📋 Date Packages</h1>
          </div>
          <button onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', description: '', price: '', category: 'dinner', venue_id: '', image_url: '' }); }}
            className="px-4 py-2 rounded-xl text-white font-semibold text-sm bg-gray-900">+ Add Package</button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 space-y-3">
            <h3 className="font-bold text-gray-900">{editId ? 'Edit Package' : 'New Package'}</h3>
            <input placeholder="Package name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm resize-vertical" />
            <div className="flex gap-3">
              <input type="number" step="0.01" placeholder="Price ($) *" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm">
                {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <select value={form.venue_id} onChange={e => setForm({ ...form, venue_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm">
              <option value="">No venue (generic package)</option>
              {venues.filter(v => v.active !== false).map(v => <option key={v.id} value={v.id}>{v.name} — {v.address || 'No address'}</option>)}
            </select>
            <input placeholder="Image URL (optional)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 outline-none text-gray-900 text-sm" />
            <div className="flex gap-2">
              <button onClick={handleSubmit} className="px-4 py-2 rounded-xl text-white font-semibold text-sm bg-gray-900">
                {editId ? 'Save Changes' : 'Create Package'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-xl text-sm text-gray-500">Cancel</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {packages.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-5 shadow-sm ${!p.active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    {!p.active && <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-600">Inactive</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{p.description}</p>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="font-bold text-gray-900">${(p.price_cents / 100).toFixed(2)}</span>
                    <span className="text-gray-500 uppercase">{p.category}</span>
                    {p.venue_name && <span className="text-gray-500">📍 {p.venue_name}</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700">Edit</button>
                  <button onClick={() => toggleActive(p)} className={`text-xs px-3 py-1.5 rounded-lg ${p.active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="text-center text-gray-500 py-8">No date packages yet. Add your first one!</p>}
        </div>
      </div>
    </div>
  );
}
