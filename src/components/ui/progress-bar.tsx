'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  className = '' 
}) => {
  return (
    <div className={`w-full bg-slate-200 rounded-full h-2 ${className}`}>
      <motion.div
        className="bg-gradient-to-r from-rose-400 to-rose-500 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};