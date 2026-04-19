'use client';

import { motion } from 'framer-motion';
import { Heart, RefreshCw, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  onRefresh: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onRefresh }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-6"
      >
        {/* Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-12 h-12 text-rose-400" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">
            That's everyone nearby!
          </h2>
          <p className="text-slate-600 max-w-sm leading-relaxed">
            You've seen all available profiles in your area. Check back later for new people, 
            or expand your search preferences.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4 w-full max-w-xs">
          <button
            onClick={onRefresh}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>

          <div className="flex space-x-3">
            <Link
              href="/settings"
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>

            <Link
              href="/events"
              className="btn-secondary flex-1 flex items-center justify-center space-x-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Events</span>
            </Link>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Ways to meet more people</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Increase your discovery radius in settings</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Join speed dating events and mixers</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Add more photos and update your profile</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Check back regularly as new users join</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="text-center pt-4">
          <p className="text-sm text-slate-500">
            Your profile has been shown to people in your area. 
            Keep your profile updated to attract more matches!
          </p>
        </div>
      </motion.div>
    </div>
  );
};