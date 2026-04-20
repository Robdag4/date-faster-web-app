'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EventData {
  id: string;
  name: string;
  event_code: string;
  city: string;
  venue_name: string;
  date: string;
  status: string;
  event_type: string;
  max_capacity: number;
  round_duration_seconds: number;
}

interface Checkin {
  user_id: string;
  first_name: string;
  age: number;
  gender: string;
  seat_number: number;
  hasStatements?: boolean;
}

interface Round {
  id: string;
  round_number: number;
  status: string;
  started_at: string | null;
}

interface Pairing {
  id: string;
  round_id: string;
  user1_name: string;
  user2_name: string;
  table_number: number;
  round_number: number;
  icebreaker?: string;
}

interface HostStatus {
  event: EventData;
  checkins: Checkin[];
  rounds: Round[];
  pairings: Pairing[];
  activeRound: Round | null;
  votingRound: Round | null;
  completedRounds: number;
  pendingRounds: number;
  totalRounds: number;
  voteCounts: Record<string, { voted: number; total: number }>;
  statementStats: { submitted: number; total: number } | null;
  mixerEndsAt: string | null;
}

export default function HostPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [hostUsername, setHostUsername] = useState('');
  const [eventCode, setEventCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<HostStatus | null>(null);
  const [actionLoading, setActionLoading] = useState('');

  const login = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events/host/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostUsername: hostUsername.trim(), eventCode: eventCode.trim() }),
      });
      if (res.ok) {
        setLoggedIn(true);
        fetchStatus();
      } else {
        alert('Invalid credentials');
      }
    } catch { alert('Network error'); }
    setLoading(false);
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/host/${eventCode.trim()}/status?u=${hostUsername.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {}
  }, [eventCode, hostUsername]);

  useEffect(() => {
    if (!loggedIn) return;
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [loggedIn, fetchStatus]);

  const doAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/events/host/${eventCode.trim()}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, hostUsername: hostUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Action failed');
      fetchStatus();
    } catch { alert('Network error'); }
    setActionLoading('');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Host Login</h1>
          <div className="space-y-4">
            <input
              type="text" placeholder="Host Username"
              value={hostUsername} onChange={e => setHostUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg"
            />
            <input
              type="text" placeholder="Event Code"
              value={eventCode} onChange={e => setEventCode(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg text-center font-mono tracking-widest"
              maxLength={4}
            />
            <button onClick={login} disabled={loading}
              className="w-full bg-rose-500 text-white py-3 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  const ev = status.event;
  const isMixer = ev.event_type === 'mixer';

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'checkin': return 'bg-blue-100 text-blue-700';
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const males = status.checkins.filter(c => c.gender === 'male');
  const females = status.checkins.filter(c => c.gender === 'female');

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{ev.name}</h1>
              <p className="text-slate-600">{ev.venue_name}, {ev.city} • Code: <span className="font-mono font-bold">{ev.event_code}</span></p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ev.status)}`}>
              {ev.status}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Controls</h2>
          <div className="flex flex-wrap gap-3">
            {ev.status === 'draft' && (
              <button onClick={() => doAction('open-checkin')} disabled={!!actionLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                {actionLoading === 'open-checkin' ? '...' : 'Open Check-in'}
              </button>
            )}
            {(ev.status === 'checkin' || ev.status === 'draft') && !isMixer && (
              <button onClick={() => doAction('lock')} disabled={!!actionLoading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {actionLoading === 'lock' ? '...' : 'Lock & Generate Rounds'}
              </button>
            )}
            {ev.status === 'active' && !isMixer && !status.activeRound && (
              <button onClick={() => doAction('start-round')} disabled={!!actionLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                {actionLoading === 'start-round' ? '...' : 'Start Next Round'}
              </button>
            )}
            {ev.status === 'active' && !isMixer && status.activeRound && (
              <button onClick={() => doAction('end-round')} disabled={!!actionLoading}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                {actionLoading === 'end-round' ? '...' : 'End Round'}
              </button>
            )}
            {ev.status === 'active' && !isMixer && (
              <button onClick={() => doAction('complete')} disabled={!!actionLoading}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
                {actionLoading === 'complete' ? '...' : 'Complete Event'}
              </button>
            )}
            {(ev.status === 'checkin' || ev.status === 'draft') && isMixer && (
              <button onClick={() => doAction('start-mixer')} disabled={!!actionLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                {actionLoading === 'start-mixer' ? '...' : 'Start Mixer'}
              </button>
            )}
            {ev.status === 'active' && isMixer && (
              <button onClick={() => doAction('complete-mixer')} disabled={!!actionLoading}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
                {actionLoading === 'complete-mixer' ? '...' : 'Complete Mixer'}
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-slate-900">{status.checkins.length}</p>
            <p className="text-sm text-slate-600">Checked In</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-blue-600">{males.length}</p>
            <p className="text-sm text-slate-600">Males</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-pink-600">{females.length}</p>
            <p className="text-sm text-slate-600">Females</p>
          </div>
          {!isMixer ? (
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{status.totalRounds}</p>
              <p className="text-sm text-slate-600">Total Rounds</p>
            </div>
          ) : status.statementStats ? (
            <div className="bg-white rounded-xl p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-slate-900">{status.statementStats.submitted}/{status.statementStats.total}</p>
              <p className="text-sm text-slate-600">Statements</p>
            </div>
          ) : null}
        </div>

        {/* Mixer timer */}
        {isMixer && status.mixerEndsAt && (
          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <p className="text-yellow-800">Auto-completes at {new Date(status.mixerEndsAt).toLocaleTimeString()}</p>
          </div>
        )}

        {/* Active Round */}
        {status.activeRound && (
          <div className="bg-green-50 rounded-2xl p-6">
            <h2 className="font-semibold text-green-900 mb-2">
              🟢 Round {status.activeRound.round_number} Active
            </h2>
            {status.activeRound.started_at && (
              <p className="text-green-700">Started: {new Date(status.activeRound.started_at).toLocaleTimeString()}</p>
            )}
          </div>
        )}

        {/* Vote Counts */}
        {status.votingRound && (
          <div className="bg-purple-50 rounded-2xl p-6">
            <h2 className="font-semibold text-purple-900 mb-2">
              🗳️ Round {status.votingRound.round_number} — Voting
            </h2>
            {status.voteCounts[status.votingRound.id] && (
              <p className="text-purple-700">
                {status.voteCounts[status.votingRound.id].voted}/{status.voteCounts[status.votingRound.id].total} votes in
              </p>
            )}
          </div>
        )}

        {/* Checkins */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-900 mb-4">Check-ins ({status.checkins.length})</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {status.checkins.map(c => (
              <div key={c.user_id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${c.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}`}>
                  {c.seat_number}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{c.first_name}, {c.age}</p>
                  {c.hasStatements !== undefined && (
                    <p className="text-xs text-slate-500">{c.hasStatements ? '✅ Statements' : '⏳ No statements'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pairings by Round */}
        {status.pairings.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900 mb-4">Pairings</h2>
            {status.rounds.map(round => {
              const rPairings = status.pairings.filter(p => p.round_id === round.id);
              if (rPairings.length === 0) return null;
              return (
                <div key={round.id} className="mb-6">
                  <h3 className="font-medium text-slate-700 mb-2">
                    Round {round.round_number}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${getStatusColor(round.status)}`}>{round.status}</span>
                    {status.voteCounts[round.id] && (
                      <span className="ml-2 text-xs text-slate-500">
                        ({status.voteCounts[round.id].voted}/{status.voteCounts[round.id].total} votes)
                      </span>
                    )}
                  </h3>
                  <div className="space-y-2">
                    {rPairings.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-sm font-medium">Table {p.table_number}: </span>
                          <span className="text-sm text-slate-700">{p.user1_name} × {p.user2_name}</span>
                        </div>
                        {p.icebreaker && (
                          <p className="text-xs text-slate-500 max-w-[200px] truncate">{p.icebreaker}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
