'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneStep } from './phone-step';
import { CodeStep } from './code-step';
import { Heart } from 'lucide-react';

export interface AuthFlowProps {
  onSuccess?: () => void;
}

export const AuthFlow: React.FC<AuthFlowProps> = ({ onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handlePhoneSuccess = (phone: string) => {
    setPhoneNumber(phone);
    setStep('code');
  };

  const handleBack = () => {
    setStep('phone');
  };

  return (
    <div className="min-h-screen bg-gradient-bg flex flex-col items-center justify-center px-4">
      {/* Logo and Branding */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Heart className="w-8 h-8 text-white fill-current" />
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">+</span>
            </div>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Welcome to Date Faster
        </h1>
        <p className="text-lg text-slate-600 max-w-md">
          Find your perfect date through real experiences. 
          Speed dating, mixers, and curated date packages.
        </p>
      </motion.div>

      {/* Auth Steps */}
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PhoneStep onSuccess={handlePhoneSuccess} />
            </motion.div>
          )}
          
          {step === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CodeStep 
                phoneNumber={phoneNumber} 
                onBack={handleBack}
                onSuccess={onSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trust indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-12 text-center"
      >
        <div className="flex items-center justify-center space-x-6 text-sm text-slate-500">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Secure & Private
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            Verified Profiles
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-rose-500 rounded-full mr-2"></div>
            Real Experiences
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="mt-8 text-center text-xs text-slate-400 max-w-sm"
      >
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-rose-500 hover:text-rose-600">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-rose-500 hover:text-rose-600">
          Privacy Policy
        </a>
        .
      </motion.div>
    </div>
  );
};