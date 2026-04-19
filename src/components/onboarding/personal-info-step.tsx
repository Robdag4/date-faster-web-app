'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, Briefcase, Heart } from 'lucide-react';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';
import toast from 'react-hot-toast';

interface PersonalInfoStepProps {
  user: UserType;
  data: any;
  onNext: (data: any) => void;
}

export const PersonalInfoStep: React.FC<PersonalInfoStepProps> = ({ 
  user, 
  data, 
  onNext 
}) => {
  const [formData, setFormData] = useState({
    first_name: data.first_name || user.first_name || '',
    date_of_birth: data.date_of_birth || user.date_of_birth || '',
    gender: data.gender || user.gender || '',
    job_title: data.job_title || user.job_title || '',
    bio: data.bio || user.bio || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name.trim()) {
      toast.error('Please enter your first name');
      return;
    }
    
    if (!formData.date_of_birth) {
      toast.error('Please enter your date of birth');
      return;
    }
    
    if (!formData.gender) {
      toast.error('Please select your gender');
      return;
    }

    // Check if user is at least 18
    const dob = new Date(formData.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      toast.error('You must be at least 18 years old to use Date Faster');
      return;
    }

    setLoading(true);

    try {
      await api.auth.updateProfile({
        first_name: formData.first_name.trim(),
        date_of_birth: formData.date_of_birth,
        gender: formData.gender as 'male' | 'female' | 'non-binary',
        job_title: formData.job_title.trim(),
        bio: formData.bio.trim(),
        age,
      });

      onNext(formData);
    } catch (error: any) {
      console.error('Update profile error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number | null => {
    if (!dateOfBirth) return null;
    
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = calculateAge(formData.date_of_birth);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Tell us about yourself
        </h2>
        <p className="text-slate-600">
          Let's start with the basics to create your profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Name */}
        <div>
          <label htmlFor="first_name" className="label">
            First Name
          </label>
          <input
            id="first_name"
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="input"
            placeholder="Your first name"
            maxLength={50}
            required
          />
        </div>

        {/* Date of Birth */}
        <div>
          <label htmlFor="date_of_birth" className="label">
            Date of Birth
          </label>
          <div className="relative">
            <input
              id="date_of_birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="input pr-12"
              max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
              required
            />
            <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
          {age !== null && (
            <p className="text-sm text-slate-500 mt-1">
              Age: {age} {age < 18 && '(Must be 18 or older)'}
            </p>
          )}
        </div>

        {/* Gender */}
        <div>
          <label className="label">Gender</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'non-binary', label: 'Non-binary' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, gender: option.value })}
                className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.gender === option.value
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Job Title */}
        <div>
          <label htmlFor="job_title" className="label">
            Job Title <span className="text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="job_title"
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              className="input pr-12"
              placeholder="e.g. Software Engineer, Teacher, Student"
              maxLength={100}
            />
            <Briefcase className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="label">
            About You <span className="text-slate-400">(optional)</span>
          </label>
          <div className="relative">
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="input min-h-[100px] resize-none"
              placeholder="Tell potential matches a little about yourself..."
              maxLength={500}
              rows={4}
            />
            <div className="absolute bottom-3 right-3 text-xs text-slate-400">
              {formData.bio.length}/500
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !formData.first_name || !formData.date_of_birth || !formData.gender || (age !== null && age < 18)}
          className="btn-primary w-full text-lg py-4 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <Heart className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};