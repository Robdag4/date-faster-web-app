'use client';

import { X, Heart, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface SwipeButtonsProps {
  onPass: () => void;
  onLike: () => void;
  onUndo?: () => void;
  disabled?: boolean;
}

export const SwipeButtons: React.FC<SwipeButtonsProps> = ({
  onPass,
  onLike,
  onUndo,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-center space-x-6">
      {/* Undo Button */}
      {onUndo && (
        <motion.button
          onClick={onUndo}
          disabled={disabled}
          className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed"
          whileHover={!disabled ? { scale: 1.1 } : undefined}
          whileTap={!disabled ? { scale: 0.95 } : undefined}
        >
          <RotateCcw className="w-5 h-5 text-gray-600" />
        </motion.button>
      )}

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

      {/* Super Like Button (Optional - can be added later) */}
      {/* <motion.button
        className="w-12 h-12 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Star className="w-5 h-5 text-white fill-current" />
      </motion.button> */}
    </div>
  );
};