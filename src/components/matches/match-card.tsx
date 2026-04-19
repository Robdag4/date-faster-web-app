'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Heart, Calendar } from 'lucide-react';
import { Match } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface MatchCardProps {
  match: Match;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const [imageError, setImageError] = useState(false);

  const getStatusColor = () => {
    switch (match.status) {
      case 'matched': return 'bg-green-100 text-green-800';
      case 'date_pending': return 'bg-yellow-100 text-yellow-800';
      case 'date_accepted': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (match.status) {
      case 'matched': return 'New Match';
      case 'date_pending': return 'Date Pending';
      case 'date_accepted': return 'Date Accepted';
      case 'paid': return 'Date Paid';
      case 'completed': return 'Date Complete';
      default: return 'Match';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
    >
      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <Image
          src={!imageError && match.other_photos?.[0] ? match.other_photos[0] : '/placeholder-avatar.jpg'}
          alt={match.other_name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
          onError={() => setImageError(true)}
        />
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Source Badge */}
        {match.source && match.source !== 'swipe' && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 bg-rose-500 text-white rounded-full text-xs font-medium">
              {match.source === 'speed_dating' ? 'Speed' : 'Mixer'}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-slate-900 truncate">
            {match.other_name}
          </h3>
          <p className="text-sm text-slate-600">
            Age {match.other_age}
          </p>
          {match.other_job_title && (
            <p className="text-xs text-slate-500 truncate mt-1">
              {match.other_job_title}
            </p>
          )}
        </div>

        <div className="text-xs text-slate-500 mb-3">
          Matched {formatDistanceToNow(new Date(match.created_at))} ago
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Link
            href={`/matches/${match.id}/chat`}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center space-x-1 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat</span>
          </Link>
          
          {match.status === 'matched' && (
            <Link
              href={`/matches/${match.id}/date`}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-medium text-sm flex items-center justify-center transition-colors"
            >
              <Calendar className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
};