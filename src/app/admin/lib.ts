// Admin API helper — all calls go through Next.js API routes

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';
}

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`/api/admin/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const adminApi = {
  login: (token: string) => {
    localStorage.setItem('admin_token', token);
    return api('stats');
  },
  stats: () => api('stats'),
  users: (search?: string) => api(`users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  user: (id: string) => api(`users?id=${id}`),
  lockUser: (id: string) => api('users', { method: 'PATCH', body: JSON.stringify({ id, action: 'lock' }) }),
  unlockUser: (id: string) => api('users', { method: 'PATCH', body: JSON.stringify({ id, action: 'unlock' }) }),
  deleteUser: (id: string) => api('users', { method: 'DELETE', body: JSON.stringify({ id }) }),
  matchMessages: (matchId: string) => api(`messages?match_id=${matchId}`),
  reports: () => api('reports'),
  reportAction: (id: string, action: string, adminNote: string) => api('reports', { method: 'PATCH', body: JSON.stringify({ id, action, adminNote }) }),
  creditsHistory: () => api('credits'),
  issueCredits: (userId: string, amountCents: number, reason: string) => api('credits', { method: 'POST', body: JSON.stringify({ userId, amountCents, reason }) }),
  analytics: () => api('analytics'),
  packages: () => api('packages'),
  createPackage: (data: any) => api('packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id: string, data: any) => api('packages', { method: 'PATCH', body: JSON.stringify({ id, ...data }) }),
  deletePackage: (id: string) => api('packages', { method: 'DELETE', body: JSON.stringify({ id }) }),
  venues: () => api('venues'),
  createVenue: (data: any) => api('venues', { method: 'POST', body: JSON.stringify(data) }),
  updateVenue: (id: string, data: any) => api('venues', { method: 'PATCH', body: JSON.stringify({ id, ...data }) }),
  redemptions: () => api('redemptions'),
  updatePayout: (paymentId: string, status: string) => api('redemptions', { method: 'PATCH', body: JSON.stringify({ paymentId, status }) }),
  duplicates: () => api('duplicates'),
  // Speed dating
  speedEvents: () => api('events?type=speed'),
  speedEvent: (id: string) => api(`events?type=speed&id=${id}`),
  createSpeedEvent: (data: any) => api('events', { method: 'POST', body: JSON.stringify({ ...data, type: 'speed' }) }),
  speedEventAction: (id: string, action: string) => api('events', { method: 'PATCH', body: JSON.stringify({ id, type: 'speed', action }) }),
  // Mixer
  mixerEvents: () => api('events?type=mixer'),
  mixerEvent: (id: string) => api(`events?type=mixer&id=${id}`),
  createMixerEvent: (data: any) => api('events', { method: 'POST', body: JSON.stringify({ ...data, type: 'mixer' }) }),
  mixerEventAction: (id: string, action: string) => api('events', { method: 'PATCH', body: JSON.stringify({ id, type: 'mixer', action }) }),
};
