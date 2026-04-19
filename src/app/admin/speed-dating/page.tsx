'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../lib';

export default function AdminSpeedDating() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', venue_name: '', venue_address: '', date: '', max_capacity: '50', round_duration_seconds: '300' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'past'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEvents = events
    .filter(ev => {
      if (activeTab === 'past') return ev.status === 'completed';
      if (activeTab === 'active') return ev.status === 'active';
      return ev.status === 'draft' || ev.status === 'checkin';
    })
    .filter(ev => !searchQuery || ev.name.toLowerCase().includes(searchQuery.toLowerCase()) || ev.city?.toLowerCase().includes(searchQuery.toLowerCase()));

  const load = useCallback(async () => {
    try { setEvents(await adminApi.speedEvents()); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id: string) => {
    try {
      const d = await adminApi.speedEvent(id);
      setDetail(d);
      setSelected(d.event);
    } catch {}
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await adminApi.createSpeedEvent({
        ...form,
        max_capacity: parseInt(form.max_capacity),
        round_duration_seconds: parseInt(form.round_duration_seconds),
      });
      setShowCreate(false);
      setForm({ name: '', city: '', venue_name: '', venue_address: '', date: '', max_capacity: '50', round_duration_seconds: '300' });
      load();
    } catch (err: any) { setError(err.message); }
  };

  const action = async (actionName: string) => {
    setLoading(true);
    try {
      await adminApi.speedEventAction(selected.id, actionName);
      await loadDetail(selected.id);
      await load();
    } catch (err: any) { alert(err.message); }
    setLoading(false);
  };

  const statusColors: Record<string, string> = {
    draft: '#6b7280', checkin: '#f59e0b', active: '#10b981', completed: '#6366f1',
  };

  if (selected && detail) {
    const { event, checkins, rounds = [], pairings = [], matches = [] } = detail;
    const activeRound = rounds.find((r: any) => r.status === 'active');
    const votingRound = rounds.find((r: any) => r.status === 'voting');

    return (
      <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button onClick={() => { setSelected(null); setDetail(null); }} className="text-sm text-gray-500 mb-4">← Back</button>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
            <span className="text-xs px-2 py-1 rounded-full text-white font-semibold" style={{ background: statusColors[event.status] }}>{event.status}</span>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <p className="text-sm text-gray-600">📍 {event.venue_name || event.city} • 📅 {event.date} • 🔑 <code className="bg-gray-100 px-2 py-0.5 rounded">{event.event_code}</code></p>
            <p className="text-sm text-gray-600 mt-1">⏱ {event.round_duration_seconds}s per round • 👥 {checkins.length}/{event.max_capacity} checked in</p>
            {event.host_username && <p className="text-sm text-gray-600 mt-1">👤 Host: <code className="bg-gray-100 px-2 py-0.5 rounded font-bold">{event.host_username}</code></p>}
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {event.status === 'draft' && (
              <button onClick={() => action('checkin')} disabled={loading}
                className="px-4 py-2 rounded-xl text-white font-semibold bg-yellow-500 text-sm">Open Check-in</button>
            )}
            {(event.status === 'draft' || event.status === 'checkin') && checkins.length >= 2 && (
              <button onClick={() => action('lock')} disabled={loading}
                className="px-4 py-2 rounded-xl text-white font-semibold bg-blue-600 text-sm">🔒 Lock & Generate Rounds</button>
            )}
            {event.status === 'active' && !activeRound && !votingRound && (
              <button onClick={() => action('start_round')} disabled={loading}
                className="px-4 py-2 rounded-xl text-white font-semibold bg-green-600 text-sm">▶️ Start Next Round</button>
            )}
            {activeRound && (
              <button onClick={() => action('end_round')} disabled={loading}
                className="px-4 py-2 rounded-xl text-white font-semibold bg-orange-500 text-sm">⏹ End Round {activeRound.round_number}</button>
            )}
            {event.status === 'active' && (
              <button onClick={() => action('complete')} disabled={loading}
                className="px-4 py-2 rounded-xl text-white font-semibold bg-purple-600 text-sm">🏁 Complete Event</button>
            )}
          </div>

          <h2 className="font-bold text-gray-900 mb-2">Check-ins ({checkins.length})</h2>
          <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
            {checkins.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No check-ins yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-3 py-2 text-left text-gray-600">Seat</th>
                  <th className="px-3 py-2 text-left text-gray-600">Name</th>
                  <th className="px-3 py-2 text-left text-gray-600">Gender</th>
                  <th className="px-3 py-2 text-left text-gray-600">Age</th>
                </tr></thead>
                <tbody>
                  {checkins.map((c: any) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{c.seat_number}</td>
                      <td className="px-3 py-2 text-gray-900">{c.first_name}</td>
                      <td className="px-3 py-2 text-gray-600">{c.gender}</td>
                      <td className="px-3 py-2 text-gray-600">{c.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {rounds.length > 0 && (
            <>
              <h2 className="font-bold text-gray-900 mb-2">Rounds ({rounds.length})</h2>
              <div className="space-y-3 mb-6">
                {rounds.map((r: any) => {
                  const roundPairings = pairings.filter((p: any) => p.round_id === r.id);
                  return (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-900">Round {r.round_number}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: statusColors[r.status] || '#6b7280' }}>{r.status}</span>
                      </div>
                      {roundPairings.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                          {roundPairings.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-1 text-gray-600">
                              <span className="font-mono text-gray-400">T{p.table_number}</span>
                              <span>{p.user1_name}</span>
                              <span className="text-gray-400">×</span>
                              <span>{p.user2_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {event.status === 'completed' && matches.length > 0 && (
            <>
              <h2 className="font-bold text-gray-900 mb-2">💕 Matches ({matches.length})</h2>
              <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>
                    <th className="px-3 py-2 text-left text-gray-600">Person 1</th>
                    <th className="px-3 py-2 text-center text-gray-400">❤️</th>
                    <th className="px-3 py-2 text-left text-gray-600">Person 2</th>
                  </tr></thead>
                  <tbody>
                    {matches.map((m: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-900">{m.user1_name} <span className="text-gray-400 text-xs">({m.user1_gender}, {m.user1_age})</span></td>
                        <td className="px-3 py-2 text-center">💕</td>
                        <td className="px-3 py-2 text-gray-900">{m.user2_name} <span className="text-gray-400 text-xs">({m.user2_gender}, {m.user2_age})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: '#f8f9fa' }}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⚡ Speed Dating Events</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push('/admin')} className="text-sm text-gray-500">← Dashboard</button>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">+ New Event</button>
          </div>
        </div>

        {showCreate && (
          <form onSubmit={create} className="bg-white rounded-xl p-5 shadow-sm mb-6 space-y-3">
            <h2 className="font-bold text-gray-900">Create Event</h2>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Event Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                className="px-3 py-2 border rounded-lg text-sm text-gray-900 col-span-2" />
              <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} required
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
              <input placeholder="Venue Name" value={form.venue_name} onChange={e => setForm({ ...form, venue_name: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
              <input placeholder="Venue Address" value={form.venue_address} onChange={e => setForm({ ...form, venue_address: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
              <input type="number" placeholder="Max Capacity" value={form.max_capacity} onChange={e => setForm({ ...form, max_capacity: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
              <input type="number" placeholder="Round Duration (sec)" value={form.round_duration_seconds} onChange={e => setForm({ ...form, round_duration_seconds: e.target.value })}
                className="px-3 py-2 border rounded-lg text-sm text-gray-900" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl border text-sm text-gray-600">Cancel</button>
            </div>
          </form>
        )}

        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-4">
          {(['upcoming', 'active', 'past'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {tab === 'upcoming' ? '📋 Upcoming' : tab === 'active' ? '🟢 Active' : '✅ Past'}
              <span className="ml-1 text-xs text-gray-400">
                ({events.filter(ev => tab === 'past' ? ev.status === 'completed' : tab === 'active' ? ev.status === 'active' : (ev.status === 'draft' || ev.status === 'checkin')).length})
              </span>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <input type="text" placeholder="🔍 Search events..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>

        <div className="space-y-3">
          {filteredEvents.length > 0 ? filteredEvents.map(ev => (
            <button key={ev.id} onClick={() => loadDetail(ev.id)}
              className="w-full bg-white rounded-xl p-4 shadow-sm text-left hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{ev.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: statusColors[ev.status] }}>{ev.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">📍 {ev.city} • 📅 {ev.date} • 🔑 {ev.event_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">{ev.checkin_count}</p>
                  <p className="text-xs text-gray-500">checked in</p>
                </div>
              </div>
            </button>
          )) : (
            <p className="text-center text-gray-500 py-8">
              {events.length === 0 ? 'No events yet. Create one above!' : 'No events match your search.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
