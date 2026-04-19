'use client';

import { motion } from 'framer-motion';
import { Heart, Compass, Calendar } from 'lucide-react';
import Link from 'next/link';

export const EmptyMatches: React.FC = () => {
  return (
    <div className="max-w-md mx-auto p-4 h-full flex flex-col items-center justify-center text-center">
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
            No matches yet
          </h2>
          <p className="text-slate-600 max-w-sm leading-relaxed">
            Start discovering people and when you both like each other, 
            you'll see them here!
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-4 w-full max-w-xs">
          <Link
            href="/discover"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <Compass className="w-5 h-5" />
            <span>Start Discovering</span>
          </Link>

          <Link
            href="/events"
            className="btn-secondary w-full flex items-center justify-center space-x-2"
          >
            <Calendar className="w-5 h-5" />
            <span>Join Events</span>
          </Link>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How to get matches</h3>
          <div className="space-y-2 text-sm text-blue-800 text-left">
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Be active - like profiles you're genuinely interested in</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Add more photos and complete your profile details</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Join speed dating events for instant connections</span>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <span>Check back daily - new people join constantly</span>
            </div>
          </div>
        </div>

        {/* Encouragement */}
        <div className="text-center pt-4">
          <p className="text-sm text-slate-500">
            Your perfect match is out there. Keep looking! ❤️
          </p>
        </div>
      </motion.div>
    </div>
  );
};