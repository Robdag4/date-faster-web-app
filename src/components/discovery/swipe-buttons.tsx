'use client';

import { X, Heart, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface SwipeButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onUndo?: () => void;
  showUndo?: boolean;
  disabled?: boolean;
}

export const SwipeButtons: React.FC<SwipeButtonsProps> = ({
  onPass,
  onLike,
  onUndo,
  showUndo = false,
  disabled = false,
}) => {
  const undoDisabled = disabled || !onUndo;

  return (
    <div className="flex items-center justify-center space-x-5">
      {/* Undo Button — always visible, disabled when can't undo */}
      <motion.button
        onClick={onUndo}
        disabled={undoDisabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow transition-colors ${
          undoDisabled
            ? 'bg-gray-100 cursor-not-allowed'
            : 'bg-white border-2 border-amber-300 hover:bg-amber-50 active:bg-amber-100'
        }`}
        whileHover={!undoDisabled ? { scale: 1.1 } : undefined}
        whileTap={!undoDisabled ? { scale: 0.95 } : undefined}
      >
        <RotateCcw className={`w-5 h-5 ${undoDisabled ? 'text-gray-300' : 'text-amber-500'}`} />
      </motion.button>

      {/* Pass Button */}
      <motion.button
        onClick={onPass}
        disabled={disabled}
        className="w-16 h-16 bg-white hover:bg-red-50 disabled:bg-gray-50 border-2 border-red-200 hover:border-red-300 disabled:border-gray-200 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed shadow-lg"
        whileHover={!disabled ? { scale: 1.1 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
      >
        <X className="w-7 h-7 text-red-500" strokeWidth={2.5} />
      </motion.button>

      {/* Like Button */}
      <motion.button
        onClick={onLike}
        disabled={disabled}
        className="w-16 h-16 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-300 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed shadow-lg"
        whileHover={!disabled ? { scale: 1.1 } : undefined}
        whileTap={!disabled ? { scale: 0.95 } : undefined}
      >
        <Heart className="w-7 h-7 text-white fill-current" />
      </motion.button>
    </div>
  );
};
