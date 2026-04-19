'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, MessageCircle, Clock, Check, X, RefreshCw, CreditCard, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface MatchDetail {
  id: string;
  status: string;
  source: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  first_name: string;
  age: number;
  photos: string[];
  job_title: string;
  bio: string;
  tagline: string;
}

interface DateReq {
  id: string;
  sender_id: string;
  receiver_id: string;
  package_id: string;
  counter_package_id: string | null;
  status: string;
  note: string;
  created_at: string;
  package?: { id: string; name: string; description: string; price_cents: number; category: string; image_url: string };
  counterPackage?: { id: string; name: string; description: string; price_cents: number; category: string; image_url: string };
}

interface PaymentInfo {
  id: string;
  status: string;
}

export default function MatchDetailPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [dateRequest, setDateRequest] = useState<DateReq | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  useEffect(() => {
    loadData();
  }, [matchId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }
      setCurrentUserId(user.id);

      // Load match
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchErr || !matchData) { toast.error('Match not found'); router.push('/matches'); return; }
      setMatch(matchData);

      // Load other user
      const otherId = matchData.user1_id === user.id ? matchData.user2_id : matchData.user1_id;
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, age, photos, job_title, bio, tagline')
        .eq('id', otherId)
        .single();
      if (userData) setOtherUser(userData);

      // Load latest date request for this match
      const { data: dateReqs } = await supabase
        .from('date_requests')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (dateReqs && dateReqs.length > 0) {
        const dr = dateReqs[0];
        // Load package info
        const { data: pkg } = await supabase.from('date_packages').select('*').eq('id', dr.package_id).single();
        let counterPkg = null;
        if (dr.counter_package_id) {
          const { data: cp } = await supabase.from('date_packages').select('*').eq('id', dr.counter_package_id).single();
          counterPkg = cp;
        }
        setDateRequest({ ...dr, package: pkg || undefined, counterPackage: counterPkg || undefined });

        // Check payment if accepted
        if (dr.status === 'accepted') {
          const { data: paymentData } = await supabase
            .from('payments')
            .select('id, status')
            .eq('date_request_id', dr.id)
            .eq('status', 'completed')
            .limit(1);
          if (paymentData && paymentData.length > 0) {
            setPayment(paymentData[0]);
          }
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load match');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (action: 'accept' | 'decline') => {
    if (!dateRequest) return;
    setResponding(true);
    try {
      const res = await fetch('/api/dates/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: dateRequest.id, action })
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      toast.success(action === 'accept' ? 'Date accepted! 🎉' : 'Date declined');
      loadData();
    } catch {
      toast.error('Network error');
    } finally {
      setResponding(false);
    }
  };

  const handlePay = async () => {
    if (!dateRequest) return;
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRequestId: dateRequest.id, matchId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.clientSecret) {
        toast('Payment flow started');
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch {
      toast.error('Network error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!match || !otherUser) {
    return (
      <div className="min-h-dvh bg-cream-50 flex items-center justify-center">
        <p className="text-slate-500">Match not found</p>
      </div>
    );
  }

  const isSender = dateRequest?.sender_id === currentUserId;
  const isReceiver = dateRequest?.receiver_id === currentUserId;
  const activePackage = dateRequest?.status === 'countered' && dateRequest.counterPackage
    ? dateRequest.counterPackage
    : dateRequest?.package;
  const activePrice = activePackage?.price_cents || 0;
  const isPaid = payment?.status === 'completed';
  const canRespond = dateRequest &&
    ((dateRequest.status === 'pending' && isReceiver) ||
     (dateRequest.status === 'countered' && isSender));

  const photo = otherUser.photos?.[0];

  return (
    <div className="min-h-dvh bg-cream-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3 flex items-center gap-3">
        <button onClick={() => router.push('/matches')} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Match Details</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
          <div className="relative h-64 bg-slate-200">
            {photo ? (
              <Image src={photo} alt={otherUser.first_name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-slate-400" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h2 className="text-xl font-bold text-slate-900">
              {otherUser.first_name}, {otherUser.age}
            </h2>
            {otherUser.job_title && (
              <p className="text-slate-600 text-sm mt-1">{otherUser.job_title}</p>
            )}
            {otherUser.tagline && (
              <p className="text-slate-500 text-sm mt-1 italic">"{otherUser.tagline}"</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Matched {formatDistanceToNow(new Date(match.created_at))} ago
              {match.source !== 'swipe' && ` • ${match.source === 'speed_dating' ? '⚡ Speed Dating' : '🎉 Mixer'}`}
            </p>
          </div>
        </div>

        {/* Date Negotiation Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-500" />
            Date Status
          </h3>

          {/* No proposal yet */}
          {!dateRequest && (
            <div className="text-center py-4">
              <p className="text-slate-600 mb-4">No date proposed yet. Make the first move!</p>
              <Link
                href={`/matches/${matchId}/date`}
                className="inline-flex items-center gap-2 px-6 py-3 gradient-bg text-white rounded-xl font-semibold"
              >
                <Calendar className="w-5 h-5" />
                Propose a Date
              </Link>
            </div>
          )}

          {/* Proposal exists */}
          {dateRequest && activePackage && (
            <div className="space-y-4">
              {/* Package info */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    dateRequest.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    dateRequest.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    dateRequest.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {dateRequest.status === 'pending' ? 'Pending' :
                     dateRequest.status === 'accepted' ? 'Accepted' :
                     dateRequest.status === 'countered' ? 'Counter Proposal' :
                     'Declined'}
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    ${(activePrice / 100).toFixed(2)}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-900">{activePackage.name}</h4>
                <p className="text-sm text-slate-600 mt-1">{activePackage.description}</p>
                {activePackage.category && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-xs">
                    {activePackage.category}
                  </span>
                )}
                {dateRequest.note && (
                  <p className="text-sm text-slate-500 mt-2 italic">"{dateRequest.note}"</p>
                )}
              </div>

              {/* Waiting for response (you sent) */}
              {dateRequest.status === 'pending' && isSender && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-xl p-3">
                  <Clock className="w-5 h-5" />
                  <span className="text-sm font-medium">Waiting for {otherUser.first_name}'s response...</span>
                </div>
              )}

              {/* Countered (waiting for you) */}
              {dateRequest.status === 'countered' && isSender && (
                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 rounded-xl p-3">
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm font-medium">{otherUser.first_name} sent a counter proposal!</span>
                </div>
              )}

              {/* You need to respond */}
              {canRespond && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleRespond('accept')}
                    disabled={responding}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 gradient-bg text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    Accept Date
                  </button>
                  <div className="flex gap-2">
                    <Link
                      href={`/matches/${matchId}/date?counter=${dateRequest.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl font-semibold"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Counter
                    </Link>
                    <button
                      onClick={() => handleRespond('decline')}
                      disabled={responding}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {/* Accepted but not paid */}
              {dateRequest.status === 'accepted' && !isPaid && (
                <button
                  onClick={handlePay}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 gradient-bg text-white rounded-xl font-semibold"
                >
                  <CreditCard className="w-5 h-5" />
                  Pay ${(activePrice / 100).toFixed(2)} to Unlock Chat
                </button>
              )}

              {/* Paid - chat unlocked */}
              {isPaid && (
                <Link
                  href={`/chat/${matchId}`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 gradient-bg text-white rounded-xl font-semibold"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat Now
                </Link>
              )}

              {/* Declined */}
              {dateRequest.status === 'declined' && (
                <div className="text-center py-2">
                  <p className="text-slate-500 text-sm mb-3">This date was declined.</p>
                  <Link
                    href={`/matches/${matchId}/date`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 gradient-bg text-white rounded-xl font-semibold text-sm"
                  >
                    Propose a New Date
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
