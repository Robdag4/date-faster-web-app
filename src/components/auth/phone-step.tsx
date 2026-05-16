'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PhoneStepProps {
  onSuccess: (phone: string) => void;
}

export const PhoneStep: React.FC<PhoneStepProps> = ({ onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  const normalizePhone = (phoneNumber: string): string => {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it starts with 1, keep it; otherwise add 1 (US default)
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    
    return '+' + cleaned;
  };

  const formatPhone = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return digits;
  };

  const handlePhoneChange = (value: string) => {
    // Only allow digits, spaces, parentheses, and dashes
    const cleaned = value.replace(/[^\d\s\(\)\-]/g, '');
    const formatted = formatPhone(cleaned);
    setPhone(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const normalizedPhone = normalizePhone(phone);
      // Sign in/up directly — skip SMS verification
      const result = await api.auth.verifyCode(normalizedPhone, '000000');
      await refreshUser();
      toast.success('Welcome to Date Faster!');
      if (result.isNew || !result.onboardingComplete) {
        router.push('/onboarding');
      } else {
        router.push('/discover');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Smartphone className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Enter your phone number
        </h2>
        <p className="text-slate-600">
          Enter your phone number to get started
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="phone" className="label">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="input text-lg text-center tracking-wider"
            maxLength={14} // Format: (XXX) XXX-XXXX
            required
            disabled={loading}
          />
          <p className="text-sm text-slate-500 mt-2">
            US phone numbers only. Standard messaging rates may apply.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || phone.length < 14}
          className="btn-primary w-full flex items-center justify-center space-x-2 text-lg py-4"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Sending...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          Your phone number is used to create your account and won't be shared.
        </p>
      </div>
    </motion.div>
  );
};