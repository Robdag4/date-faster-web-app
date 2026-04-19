'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, ArrowLeft, ArrowRight, Users, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';
import toast from 'react-hot-toast';

interface PreferencesStepProps {
  user: UserType;
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export const PreferencesStep: React.FC<PreferencesStepProps> = ({ 
  user, 
  data, 
  onNext, 
  onBack 
}) => {
  const [formData, setFormData] = useState({
    preference: data.preference || user.preference || '',
    sexuality: data.sexuality || user.sexuality || '',
    relationship_goal: data.relationship_goal || user.relationship_goal || '',
    interests: data.interests || user.interests || [],
    ideal_date: data.ideal_date || user.ideal_date || '',
    age_min: data.age_min || user.age_min || 18,
    age_max: data.age_max || user.age_max || 35,
    discovery_radius: data.discovery_radius || user.discovery_radius || 25,
  });
  const [loading, setLoading] = useState(false);

  const interestOptions = [
    '🎬 Movies', '🎵 Music', '🏃 Fitness', '🍳 Cooking', '📚 Reading',
    '✈️ Travel', '🎨 Art', '📸 Photography', '🏔️ Hiking', '🏖️ Beach',
    '🍷 Wine', '☕ Coffee', '🎮 Gaming', '🐕 Dogs', '🐱 Cats',
    '🏊 Swimming', '🧘 Yoga', '💃 Dancing', '🎭 Theater', '🏀 Sports',
    '🌱 Gardening', '🍕 Food', '🎪 Comedy', '📺 TV Shows', '🎸 Guitar',
    '🏍️ Motorcycles', '🚴 Cycling', '⛰️ Outdoors', '🎨 Crafts', '📖 Writing'
  ];

  const handleInterestToggle = (interest: string) => {
    const interests = [...formData.interests];
    const index = interests.indexOf(interest);
    
    if (index > -1) {
      interests.splice(index, 1);
    } else if (interests.length < 10) {
      interests.push(interest);
    } else {
      toast.error('Maximum 10 interests allowed');
      return;
    }
    
    setFormData({ ...formData, interests });
  };

  const handleNext = async () => {
    if (!formData.preference) {
      toast.error('Please select your dating preference');
      return;
    }
    
    if (!formData.relationship_goal) {
      toast.error('Please select your relationship goal');
      return;
    }

    setLoading(true);

    try {
      await api.auth.updateProfile({
        preference: formData.preference as 'men' | 'women' | 'both',
        sexuality: formData.sexuality as 'straight' | 'gay' | 'bisexual' | '',
        relationship_goal: formData.relationship_goal as 'casual' | 'serious' | 'open',
        interests: formData.interests,
        ideal_date: formData.ideal_date,
        age_min: formData.age_min,
        age_max: formData.age_max,
        discovery_radius: formData.discovery_radius,
      });

      onNext(formData);
    } catch (error: any) {
      console.error('Update preferences error:', error);
      toast.error(error.message || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Dating preferences
        </h2>
        <p className="text-slate-600">
          Help us find your perfect matches
        </p>
      </div>

      <div className="space-y-6">
        {/* Dating Preference */}
        <div>
          <label className="label">I'm interested in dating</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'men', label: 'Men' },
              { value: 'women', label: 'Women' },
              { value: 'both', label: 'Both' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, preference: option.value })}
                className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.preference === option.value
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sexuality */}
        <div>
          <label className="label">
            Sexuality <span className="text-slate-400">(optional)</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'straight', label: 'Straight' },
              { value: 'gay', label: 'Gay' },
              { value: 'bisexual', label: 'Bisexual' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, sexuality: option.value })}
                className={`p-3 rounded-lg border-2 font-medium transition-colors ${
                  formData.sexuality === option.value
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Relationship Goal */}
        <div>
          <label className="label">I'm looking for</label>
          <div className="space-y-3">
            {[
              { value: 'casual', label: 'Something casual', desc: 'Fun dates and new connections' },
              { value: 'serious', label: 'A serious relationship', desc: 'Long-term partnership and commitment' },
              { value: 'open', label: 'Open to both', desc: 'See where things go naturally' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFormData({ ...formData, relationship_goal: option.value })}
                className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.relationship_goal === option.value
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-medium text-slate-900">{option.label}</div>
                <div className="text-sm text-slate-600 mt-1">{option.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Age Range */}
        <div>
          <label className="label">Age range</label>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="age_min" className="block text-sm text-slate-600 mb-1">Min</label>
              <input
                id="age_min"
                type="number"
                min="18"
                max="99"
                value={formData.age_min}
                onChange={(e) => setFormData({ ...formData, age_min: parseInt(e.target.value) || 18 })}
                className="input text-center"
              />
            </div>
            <div className="text-slate-400 mt-6">to</div>
            <div className="flex-1">
              <label htmlFor="age_max" className="block text-sm text-slate-600 mb-1">Max</label>
              <input
                id="age_max"
                type="number"
                min="18"
                max="99"
                value={formData.age_max}
                onChange={(e) => setFormData({ ...formData, age_max: parseInt(e.target.value) || 35 })}
                className="input text-center"
              />
            </div>
          </div>
        </div>

        {/* Distance */}
        <div>
          <label htmlFor="discovery_radius" className="label">
            Maximum distance: {formData.discovery_radius} miles
          </label>
          <input
            id="discovery_radius"
            type="range"
            min="5"
            max="100"
            value={formData.discovery_radius}
            onChange={(e) => setFormData({ ...formData, discovery_radius: parseInt(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-sm text-slate-500 mt-1">
            <span>5 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="label">
            Interests <span className="text-slate-400">(select up to 10)</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {interestOptions.map((interest) => {
              const isSelected = formData.interests.includes(interest);
              
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleInterestToggle(interest)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {formData.interests.length}/10 selected
          </p>
        </div>

        {/* Ideal Date */}
        <div>
          <label htmlFor="ideal_date" className="label">
            Ideal first date <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            id="ideal_date"
            value={formData.ideal_date}
            onChange={(e) => setFormData({ ...formData, ideal_date: e.target.value })}
            className="input min-h-[80px] resize-none"
            placeholder="Describe your ideal first date..."
            maxLength={200}
            rows={3}
          />
          <div className="text-xs text-slate-400 mt-1 text-right">
            {formData.ideal_date.length}/200
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onBack}
          className="btn-secondary flex-1 flex items-center justify-center space-x-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={loading || !formData.preference || !formData.relationship_goal}
          className="btn-primary flex-[2] flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
};