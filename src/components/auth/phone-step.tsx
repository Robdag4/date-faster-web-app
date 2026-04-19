'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Smartphone, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PhoneStepProps {
  onSuccess: (phone: string) => void;
}

export const PhoneStep: React.FC<PhoneStepProps> = ({ onSuccess }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

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
      await api.auth.sendCode(normalizedPhone);
      
      toast.success('Verification code sent!');
      onSuccess(normalizedPhone);
    } catch (error: any) {
      console.error('Send code error:', error);
      toast.error(error.message || 'Failed to send verification code');
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
          We'll send you a verification code to get started
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
              <span>Send verification code</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-500">
          By providing your phone number, you consent to receive SMS messages 
          from Date Faster for verification and account security purposes.
        </p>
      </div>
    </motion.div>
  );
};