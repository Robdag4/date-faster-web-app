'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PersonalInfoStep } from '@/components/onboarding/personal-info-step';
import { PhotosStep } from '@/components/onboarding/photos-step';
import { PreferencesStep } from '@/components/onboarding/preferences-step';
import { LocationStep } from '@/components/onboarding/location-step';
import { CompletionStep } from '@/components/onboarding/completion-step';
import { ProgressBar } from '@/components/ui/progress-bar';

type OnboardingStep = 'personal' | 'photos' | 'preferences' | 'location' | 'complete';

export default function OnboardingPage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [onboardingData, setOnboardingData] = useState<any>({});

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (!loading && user?.onboarding_complete) {
      router.push('/discover');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const steps: OnboardingStep[] = ['personal', 'photos', 'preferences', 'location', 'complete'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = async (data: any) => {
    const newData = { ...onboardingData, ...data };
    setOnboardingData(newData);

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStep(steps[nextStepIndex]);
    }
  };

  const handleBack = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(steps[prevStepIndex]);
    }
  };

  const handleComplete = async () => {
    await refreshUser();
    router.push('/discover');
  };

  return (
    <div className="min-h-screen bg-gradient-bg">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-slate-900">
              Complete Your Profile
            </h1>
            <span className="text-sm text-slate-500">
              {currentStepIndex + 1} of {steps.length}
            </span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {currentStep === 'personal' && (
            <motion.div
              key="personal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PersonalInfoStep 
                user={user}
                data={onboardingData}
                onNext={handleNext}
              />
            </motion.div>
          )}

          {currentStep === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PhotosStep 
                user={user}
                data={onboardingData}
                onNext={handleNext}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {currentStep === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <PreferencesStep 
                user={user}
                data={onboardingData}
                onNext={handleNext}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {currentStep === 'location' && (
            <motion.div
              key="location"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LocationStep 
                user={user}
                data={onboardingData}
                onNext={handleNext}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {currentStep === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <CompletionStep 
                onComplete={handleComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}