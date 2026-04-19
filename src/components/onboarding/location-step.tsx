'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, ArrowLeft, ArrowRight, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import { User as UserType } from '@/types';
import toast from 'react-hot-toast';

interface LocationStepProps {
  user: UserType;
  data: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

export const LocationStep: React.FC<LocationStepProps> = ({ 
  user, 
  data, 
  onNext, 
  onBack 
}) => {
  const [location, setLocation] = useState({
    latitude: data.latitude || user.latitude || null,
    longitude: data.longitude || user.longitude || null,
  });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.latitude && location.longitude) {
      setLocationStatus('granted');
    }
  }, [location.latitude, location.longitude]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location services are not supported by your browser');
      return;
    }

    setLocationStatus('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setLocationStatus('granted');
        toast.success('Location updated!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocationStatus('denied');
        
        let errorMessage = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. You can enable it in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  };

  const handleNext = async () => {
    if (!location.latitude || !location.longitude) {
      toast.error('Please enable location access to continue');
      return;
    }

    setLoading(true);

    try {
      await api.auth.updateProfile({
        latitude: location.latitude,
        longitude: location.longitude,
        onboarding_complete: true,
      });

      onNext({ ...location, onboarding_complete: true });
    } catch (error: any) {
      console.error('Update location error:', error);
      toast.error(error.message || 'Failed to update location');
    } finally {
      setLoading(false);
    }
  };

  const skipLocation = async () => {
    setLoading(true);

    try {
      // Set a default location (e.g., center of US) for now
      await api.auth.updateProfile({
        latitude: 39.8283,
        longitude: -98.5795,
        onboarding_complete: true,
      });

      onNext({ 
        latitude: 39.8283, 
        longitude: -98.5795, 
        onboarding_complete: true 
      });
    } catch (error: any) {
      console.error('Skip location error:', error);
      toast.error(error.message || 'Failed to complete setup');
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
          <MapPin className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Share your location
        </h2>
        <p className="text-slate-600">
          We'll use your location to find nearby matches and suggest local date spots
        </p>
      </div>

      {/* Location Status */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200">
        {locationStatus === 'granted' && location.latitude && location.longitude ? (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Navigation className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-green-900 mb-2">Location enabled!</h3>
            <p className="text-sm text-green-700">
              Your approximate location: {location.latitude.toFixed(2)}, {location.longitude.toFixed(2)}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Enable location access</h3>
            <p className="text-sm text-slate-600 mb-4">
              Click the button below and allow location access when prompted
            </p>
            
            <button
              onClick={requestLocation}
              disabled={locationStatus === 'requesting'}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {locationStatus === 'requesting' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-5 h-5" />
                  <span>Enable Location</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Privacy Note */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Privacy & Location</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• We only use your general area, not your exact location</li>
          <li>• Your location is never shared with other users</li>
          <li>• You can change your location settings anytime</li>
          <li>• Location is used to find nearby matches and events</li>
        </ul>
      </div>

      {/* Location Access Issues */}
      {locationStatus === 'denied' && (
        <div className="bg-yellow-50 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">Having trouble?</h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>If location access was blocked:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Click the location icon in your browser's address bar</li>
              <li>Select "Always allow" for this site</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="space-y-4">
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
            disabled={loading || !location.latitude || !location.longitude}
            className="btn-primary flex-[2] flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Completing...</span>
              </>
            ) : (
              <>
                <span>Complete Setup</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* Skip option */}
        <button
          onClick={skipLocation}
          disabled={loading}
          className="w-full text-slate-500 hover:text-slate-700 font-medium py-3 transition-colors"
        >
          Skip for now (limited matching)
        </button>
      </div>
    </motion.div>
  );
};