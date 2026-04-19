'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { MatchCard } from '@/components/matches/match-card';
import { EmptyMatches } from '@/components/matches/empty-matches';
import { api } from '@/lib/api';
import { Match } from '@/types';
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

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (matches.length === 0) {
    return <EmptyMatches />;
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Your Matches
        </h1>
        <p className="text-slate-600">
          {matches.length} {matches.length === 1 ? 'match' : 'matches'} waiting for you
        </p>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-2 gap-4">
        {matches.map((match, index) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MatchCard match={match} />
          </motion.div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-xl p-4 mt-8">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Match Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Start conversations within 24 hours for best results</li>
          <li>• Ask about their interests to break the ice</li>
          <li>• Suggest a date package that matches their style</li>
          <li>• Be genuine and show interest in who they are</li>
        </ul>
      </div>
    </div>
  );
}