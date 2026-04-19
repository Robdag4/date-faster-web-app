'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, X, Sparkles, Calendar, MapPin } from 'lucide-react';
import { DiscoveryProfile } from '@/types';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface MatchModalProps {
  isOpen: boolean;
  profile?: DiscoveryProfile;
  matchId?: string;
  onClose: () => void;
  onSendMessage: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  profile,
  matchId,
  onClose,
  onSendMessage,
}) => {
  const { user } = useAuth();
  const router = useRouter();

  if (!profile || !user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
            className="relative bg-white rounded-3xl p-8 max-w-sm mx-4 text-center overflow-hidden"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>

            {/* Floating Hearts */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, x: Math.random() * 300 - 150, y: 100 + Math.random() * 50 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1, 0], y: -50, x: Math.random() * 300 - 150 }}
                  transition={{ delay: i * 0.1, duration: 2, ease: 'easeOut' }}
                  className="absolute"
                >
                  <Heart className={`w-6 h-6 fill-current ${i % 2 === 0 ? 'text-rose-400' : 'text-pink-400'}`} />
                </motion.div>
              ))}
            </div>

            <div className="space-y-6">
              {/* Title */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-2">
                <div className="flex items-center justify-center space-x-2">
                  <Sparkles className="w-6 h-6 text-yellow-400 fill-current" />
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                    It's a Match!
                  </h1>
                  <Sparkles className="w-6 h-6 text-yellow-400 fill-current" />
                </div>
                <p className="text-slate-600">
                  You and {profile.first_name} liked each other
                </p>
              </motion.div>

              {/* Profile Photos */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="flex items-center justify-center space-x-4"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image src={user.photos?.[0] || '/placeholder-avatar.jpg'} alt="You" width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>

                <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ delay: 0.7, duration: 0.6 }}>
                  <Heart className="w-8 h-8 text-rose-500 fill-current" />
                </motion.div>

                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <Image src={profile.photos?.[0] || '/placeholder-avatar.jpg'} alt={profile.first_name} width={80} height={80} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
                    <Heart className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>
              </motion.div>

              {/* Match info */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-4">
                <h3 className="font-semibold text-slate-900 mb-1">{profile.first_name}, {profile.age}</h3>
                {profile.job_title && <p className="text-sm text-slate-600 mb-1">{profile.job_title}</p>}
                {profile.distance && <p className="text-xs text-slate-500">{profile.distance} miles away</p>}
              </motion.div>

              {/* Date Proposal CTA */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                className="space-y-3">
                <p className="text-sm text-slate-600 font-medium">
                  🎉 Don't let this match go cold — propose a date!
                </p>
                <button
                  onClick={() => {
                    onClose();
                    if (matchId) {
                      router.push(`/matches/${matchId}/date`);
                    } else {
                      router.push('/dates');
                    }
                  }}
                  className="w-full py-3 rounded-xl text-white font-semibold gradient-bg flex items-center justify-center space-x-2"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Propose a Date</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (matchId) {
                      router.push(`/chat/${matchId}`);
                    } else {
                      router.push('/matches');
                    }
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center space-x-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Send a Message First</span>
                </button>

                <button onClick={onClose} className="w-full py-2 text-sm text-slate-400 hover:text-slate-600">
                  Keep discovering
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
