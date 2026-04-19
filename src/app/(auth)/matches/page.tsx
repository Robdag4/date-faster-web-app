'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { Match } from '@/types';
import { EmptyMatches } from '@/components/matches/empty-matches';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Heart, ChevronRight, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function MatchesPage() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const userMatches = await api.discovery.matches();
      setMatches(userMatches);
    } catch (error: any) {
      console.error('Load matches error:', error);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'matched': return { text: 'New', color: 'bg-green-500' };
      case 'date_pending': return { text: 'Date Pending', color: 'bg-amber-500' };
      case 'date_accepted': return { text: 'Date Set', color: 'bg-blue-500' };
      case 'paid': return { text: 'Date Paid', color: 'bg-purple-500' };
      case 'completed': return { text: 'Complete', color: 'bg-slate-400' };
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return <EmptyMatches />;
  }

  return (
    <div className="min-h-dvh bg-cream-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-slate-900">Matches</h1>
        <p className="text-sm text-slate-500 mt-1">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Match List */}
      <div className="divide-y divide-slate-100">
        {matches.map((match) => {
          const badge = getStatusBadge(match);
          const photo = match.other_photos?.[0];
          const isVideo = photo && (photo.endsWith('.mp4') || photo.endsWith('.mov') || photo.endsWith('.webm'));

          return (
            <Link
              key={match.id}
              href={`/chat/${match.id}`}
              className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              {/* Avatar */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-200 flex-shrink-0">
                {photo ? (
                  isVideo ? (
                    <video src={photo} muted className="w-full h-full object-cover" />
                  ) : (
                    <Image
                      src={photo}
                      alt={match.other_name}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-7 h-7 text-slate-400" />
                  </div>
                )}
                {/* Online indicator could go here */}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {match.other_name}{match.other_age ? `, ${match.other_age}` : ''}
                  </h3>
                  {badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${badge.color} flex-shrink-0`}>
                      {badge.text}
                    </span>
                  )}
                </div>
                {match.other_job_title && (
                  <p className="text-sm text-slate-600 truncate">{match.other_job_title}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {match.source === 'speed_dating' ? '⚡ Speed Dating • ' : match.source === 'mixer' ? '🎉 Mixer • ' : ''}
                  Matched {formatDistanceToNow(new Date(match.created_at))} ago
                </p>
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-rose-500" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
