'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Clock, User, ChevronRight, Heart, Plus, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface DateRequest {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  package_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  note: string;
  created_at: string;
  redemption_code: string | null;
  redeemed_at: string | null;
  // Joined
  package_name?: string;
  package_description?: string;
  package_category?: string;
  price_cents?: number;
  venue_name?: string;
  other_name?: string;
  other_photo?: string;
  payment_status?: string;
}

type Tab = 'upcoming' | 'pending' | 'past';

export default function DatesPage() {
  const { user } = useAuth();
  const [dates, setDates] = useState<DateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (user) loadDates();
  }, [user]);

  const loadDates = async () => {
    if (!user) return;
    try {
      // Get all date requests involving this user
      const { data: requests, error } = await supabase
        .from('date_requests')
        .select(`
          *,
          date_packages (name, description, category, price_cents, venue_id,
            venues (name, address)
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      // Get other user info for each date
      const enriched = await Promise.all((requests || []).map(async (req: any) => {
        const otherId = req.sender_id === user.id ? req.receiver_id : req.sender_id;
        const { data: otherUser } = await supabase
          .from('users')
          .select('first_name, photos')
          .eq('id', otherId)
          .single();

        // Check payment status
        const { data: payment } = await supabase
          .from('payments')
          .select('status')
          .eq('date_request_id', req.id)
          .eq('status', 'completed')
          .single();

        return {
          ...req,
          package_name: req.date_packages?.name,
          package_description: req.date_packages?.description,
          package_category: req.date_packages?.category,
          price_cents: req.date_packages?.price_cents,
          venue_name: req.date_packages?.venues?.name,
          other_name: otherUser?.first_name || 'Someone',
          other_photo: otherUser?.photos?.[0] || null,
          payment_status: payment?.status || null,
        };
      }));

      setDates(enriched);
    } catch (err) {
      console.error('Error loading dates:', err);
      toast.error('Failed to load dates');
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const upcoming = dates.filter(d => d.status === 'accepted' && (d.scheduled_date || '') >= today);
  const pending = dates.filter(d => d.status === 'pending');
  const past = dates.filter(d => d.status === 'accepted' && d.scheduled_date && d.scheduled_date < today);

  const currentDates = activeTab === 'upcoming' ? upcoming : activeTab === 'pending' ? pending : past;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const addToGoogleCalendar = (date: DateRequest) => {
    if (!date.scheduled_date) return;
    const time = date.scheduled_time || '19:00';
    const [year, month, day] = date.scheduled_date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = `Date with ${date.other_name} — ${date.package_name}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`Date Faster: ${date.package_name}\nWith: ${date.other_name}`)}`;
    window.open(url, '_blank');
  };

  const downloadICS = (date: DateRequest) => {
    if (!date.scheduled_date) return;
    const time = date.scheduled_time || '19:00';
    const [year, month, day] = date.scheduled_date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const start = new Date(year, month - 1, day, hour, minute);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = `Date with ${date.other_name} — ${date.package_name}`;

    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Date Faster//EN', 'BEGIN:VEVENT',
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Date Faster: ${date.package_name}\\nWith: ${date.other_name}`,
      `UID:${date.id}@datefaster.com`, 'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `date-${date.id.slice(0, 8)}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getDaysUntil = (dateStr: string) => {
    const target = new Date(dateStr + 'T12:00:00');
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today!';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900">My Dates</h1>
          <Link href="/discover" className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['upcoming', 'pending', 'past'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              {tab}
              {tab === 'upcoming' && upcoming.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[10px] rounded-full">{upcoming.length}</span>
              )}
              {tab === 'pending' && pending.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded-full">{pending.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {currentDates.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {activeTab === 'upcoming' ? 'No upcoming dates' : activeTab === 'pending' ? 'No pending requests' : 'No past dates'}
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              {activeTab === 'upcoming'
                ? 'Match with someone and propose a date!'
                : activeTab === 'pending'
                ? 'Date requests you send or receive show up here'
                : 'Your date history will appear here'}
            </p>
            {activeTab === 'upcoming' && (
              <Link href="/discover" className="inline-flex items-center px-6 py-3 rounded-xl text-white font-semibold gradient-bg">
                <Heart className="w-4 h-4 mr-2" /> Find Matches
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentDates.map(date => (
              <div key={date.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Date header with countdown */}
                {date.scheduled_date && activeTab === 'upcoming' && (
                  <div className="gradient-bg px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-sm font-semibold">{getDaysUntil(date.scheduled_date)}</span>
                    <span className="text-white/80 text-xs">{formatDate(date.scheduled_date)}</span>
                  </div>
                )}

                <div className="p-4">
                  {/* Person + Package */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                      {date.other_photo ? (
                        <Image src={date.other_photo} alt="" width={48} height={48} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">
                        Date with {date.other_name}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">{date.package_name}</p>
                    </div>
                    {date.status === 'pending' && (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                        {date.sender_id === user?.id ? 'Sent' : 'Received'}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-3">
                    {date.scheduled_date && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{formatDate(date.scheduled_date)}</span>
                        {date.scheduled_time && (
                          <span>at {formatTime(date.scheduled_time)}</span>
                        )}
                      </div>
                    )}
                    {date.venue_name && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{date.venue_name}</span>
                      </div>
                    )}
                    {date.price_cents && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-4 h-4 text-slate-400 text-center font-bold">$</span>
                        <span>${(date.price_cents / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {activeTab === 'upcoming' && date.scheduled_date && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => addToGoogleCalendar(date)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1"
                      >
                        <Calendar className="w-4 h-4" /> Google Cal
                      </button>
                      <button
                        onClick={() => downloadICS(date)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 flex items-center justify-center gap-1"
                      >
                        <Download className="w-4 h-4" /> Export .ics
                      </button>
                      {date.redemption_code && (
                        <Link
                          href={`/redeem/${date.redemption_code}`}
                          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg flex items-center justify-center gap-1"
                        >
                          QR Code
                        </Link>
                      )}
                    </div>
                  )}

                  {activeTab === 'pending' && date.receiver_id === user?.id && (
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await supabase.from('date_requests').update({ status: 'accepted' }).eq('id', date.id);
                          toast.success('Date accepted! 🎉');
                          loadDates();
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-bg"
                      >
                        Accept ❤️
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from('date_requests').update({ status: 'declined' }).eq('id', date.id);
                          toast('Date declined');
                          loadDates();
                        }}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {activeTab === 'pending' && date.sender_id === user?.id && (
                    <p className="text-xs text-slate-400 text-center">Waiting for {date.other_name} to respond...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
