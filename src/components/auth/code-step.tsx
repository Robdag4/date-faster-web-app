'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowLeft, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface CodeStepProps {
  phoneNumber: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export const CodeStep: React.FC<CodeStepProps> = ({ 
  phoneNumber, 
  onBack, 
  onSuccess 
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { refreshUser } = useAuth();
  const router = useRouter();

  // Start resend cooldown
  useEffect(() => {
    setResendCooldown(30);
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev > 0 ? prev - 1 : 0);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const formatPhone = (phone: string) => {
    // Format +1XXXXXXXXXX to (XXX) XXX-XXXX
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const number = digits.slice(1);
      return `(${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    return phone;
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Pasted multiple characters - distribute across inputs
      const newCode = [...code];
      const chars = value.slice(0, 6 - index).split('');
      
      chars.forEach((char, i) => {
        if (index + i < 6 && /^\d$/.test(char)) {
          newCode[index + i] = char;
        }
      });
      
      setCode(newCode);
      
      // Focus next empty input or last input
      const nextIndex = Math.min(index + chars.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      return;
    }

    // Single character input
    if (/^\d?$/.test(value)) {
      const newCode = [...code];
      newCode[index] = value;
      setCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit if all fields are filled
      if (value && newCode.every(digit => digit !== '')) {
        handleSubmit(newCode.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Backspace on empty input - focus previous input
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleSubmit = async (codeValue?: string) => {
    const finalCode = codeValue || code.join('');
    
    if (finalCode.length !== 6) {
      toast.error('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);

    try {
      const result = await api.auth.verifyCode(phoneNumber, finalCode);
      
      // Refresh the auth context to get the latest user data
      await refreshUser();
      
      toast.success('Welcome to Date Faster!');
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Redirect based on onboarding status
      if (result.isNew || !result.onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push('/discover');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      toast.error(error.message || 'Invalid verification code');
      
      // Clear the code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);

    try {
      await api.auth.sendCode(phoneNumber);
      toast.success('New verification code sent!');
      setResendCooldown(30);
    } catch (error: any) {
      console.error('Resend code error:', error);
      toast.error(error.message || 'Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Enter verification code
        </h2>
        <p className="text-slate-600">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-slate-900">
            {formatPhone(phoneNumber)}
          </span>
        </p>
      </div>

      {/* Code Input */}
      <div className="flex justify-center space-x-3 mb-6">
        {code.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6} // Allow pasting full code
            value={digit}
            onChange={(e) => handleCodeChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-bold border border-slate-300 rounded-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-colors duration-200 outline-none"
            disabled={loading}
            autoFocus={index === 0}
          />
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={() => handleSubmit()}
        disabled={loading || code.some(digit => !digit)}
        className="btn-primary w-full flex items-center justify-center space-x-2 text-lg py-4 mb-6"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Verifying...</span>
          </>
        ) : (
          <span>Verify & Continue</span>
        )}
      </button>

      {/* Resend Code */}
      <div className="text-center space-y-4">
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resendLoading}
          className="text-rose-500 hover:text-rose-600 font-medium disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mx-auto"
        >
          {resendLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-500"></div>
              <span>Sending...</span>
            </>
          ) : resendCooldown > 0 ? (
            <span>Resend code in {resendCooldown}s</span>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              <span>Resend code</span>
            </>
          )}
        </button>

        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-700 font-medium flex items-center justify-center space-x-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change phone number</span>
        </button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Didn't receive the code? Check your spam folder or try resending.
        </p>
      </div>
    </motion.div>
  );
};