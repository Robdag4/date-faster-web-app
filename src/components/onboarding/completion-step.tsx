'use client';

import { motion } from 'framer-motion';
import { Heart, Sparkles, ArrowRight } from 'lucide-react';

interface CompletionStepProps {
  onComplete: () => void;
}

export const CompletionStep: React.FC<CompletionStepProps> = ({ onComplete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8"
    >
      {/* Celebration Animation */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
          className="w-24 h-24 bg-gradient-to-r from-rose-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <Heart className="w-12 h-12 text-white fill-current" />
        </motion.div>
        
        {/* Floating sparkles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0], 
              scale: [0, 1, 0],
              x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 10)],
              y: [0, -20 - i * 5]
            }}
            transition={{ 
              delay: 0.8 + i * 0.1,
              duration: 1.5,
              ease: 'easeOut'
            }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <Sparkles className="w-4 h-4 text-yellow-400 fill-current" />
          </motion.div>
        ))}
      </div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="space-y-4"
      >
        <h2 className="text-3xl font-bold text-slate-900">
          Welcome to Date Faster! 🎉
        </h2>
        <p className="text-lg text-slate-600 max-w-sm mx-auto">
          Your profile is complete and you're ready to start meeting amazing people
        </p>
      </motion.div>

      {/* Features Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white rounded-2xl p-6 border border-slate-200"
      >
        <h3 className="font-semibold text-slate-900 mb-4">What's next?</h3>
        <div className="space-y-3 text-left">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Discover matches</h4>
              <p className="text-sm text-slate-600">Swipe through profiles and find your perfect match</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Plan amazing dates</h4>
              <p className="text-sm text-slate-600">Choose from curated date packages and experiences</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-rose-500 font-bold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Join events</h4>
              <p className="text-sm text-slate-600">Attend speed dating and mixer events near you</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="space-y-4"
      >
        <button
          onClick={onComplete}
          className="btn-primary w-full text-lg py-4 flex items-center justify-center space-x-2"
        >
          <span>Start Discovering</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        
        <p className="text-sm text-slate-500">
          Ready to find your perfect date? Let's go! ❤️
        </p>
      </motion.div>

      {/* Pro tip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="bg-blue-50 rounded-xl p-4"
      >
        <h4 className="font-semibold text-blue-900 mb-2">💡 Pro tip</h4>
        <p className="text-sm text-blue-800">
          Complete your profile with more photos and details to get better matches. 
          You can always edit your profile in settings.
        </p>
      </motion.div>
    </motion.div>
  );
};