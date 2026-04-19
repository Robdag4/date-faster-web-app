'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { DiscoveryCard } from '@/components/discovery/discovery-card';
import { EmptyState } from '@/components/discovery/empty-state';
import { MatchModal } from '@/components/discovery/match-modal';
import { SwipeButtons } from '@/components/discovery/swipe-buttons';
import { api } from '@/lib/api';
import { DiscoveryProfile } from '@/types';
import toast from 'react-hot-toast';

export default function DiscoverPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<DiscoveryProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<{
    show: boolean;
    profile?: DiscoveryProfile;
    matchId?: string;
  }>({ show: false });
  
  const [locationPrompt, setLocationPrompt] = useState(false);

  // Update location on mount
  useEffect(() => {
    if (!user) return;
    const updateLocation = async () => {
      try {
        const perm = await navigator.permissions?.query({ name: 'geolocation' });
        if (perm?.state === 'granted') {
          // Silently update
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { supabase } = await import('@/lib/supabase');
            await supabase.from('users').update({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }).eq('id', user.id);
          }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
        } else if (perm?.state === 'prompt') {
          setLocationPrompt(true);
        }
      } catch {
        // permissions API not supported, show prompt
        setLocationPrompt(true);
      }
    };
    updateLocation();
  }, [user]);

  const handleLocationPermission = async () => {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('users').update({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }).eq('id', user?.id);
      setLocationPrompt(false);
      toast.success('Location updated!');
      loadDiscoveryFeed(); // reload with new location
    } catch {
      toast.error("Couldn't get location — using your last known location");
      setLocationPrompt(false);
    }
  };

  // Load discovery feed
  useEffect(() => {
    loadDiscoveryFeed();
  }, []);

  const loadDiscoveryFeed = async () => {
    try {
      setLoading(true);
      const feed = await api.discovery.feed();
      setProfiles(feed);
      setCurrentIndex(0);
    } catch (error: any) {
      console.error('Load discovery feed error:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSwipe = async (direction: 'like' | 'pass') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    try {
      const result = await api.discovery.swipe(currentProfile.id, direction);
      
      if (result.matched) {
        setMatchModal({ show: true, profile: currentProfile, matchId: result.matchId });
      }
      
      // Move to next profile
      setCurrentIndex((prev) => prev + 1);
      
    } catch (error: any) {
      console.error('Swipe error:', error);
      toast.error(error.message || 'Failed to process swipe');
    }
  };

  const handleUndoSwipe = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 h-full flex flex-col">
      {/* Location Prompt */}
      {locationPrompt && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-900">📍 Enable location</p>
            <p className="text-xs text-blue-700">Find matches near you</p>
          </div>
          <button onClick={handleLocationPermission} className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-bg">
            Allow
          </button>
        </div>
      )}

      {/* Discovery Stack */}
      <div className="flex-1 relative overflow-hidden">
        {!hasMoreProfiles ? (
          <EmptyState onRefresh={loadDiscoveryFeed} />
        ) : (
          <div className="relative h-full">
            {/* Card Stack */}
            <AnimatePresence>
              {profiles.slice(currentIndex, currentIndex + 3).map((profile, index) => (
                <motion.div
                  key={`${profile.id}-${currentIndex + index}`}
                  className="absolute inset-0"
                  initial={{ scale: 0.95 - index * 0.05, y: index * 8 }}
                  animate={{ 
                    scale: 1 - index * 0.05, 
                    y: index * 8,
                    zIndex: 10 - index 
                  }}
                  exit={{ 
                    x: 300,
                    opacity: 0,
                    transition: { duration: 0.3 }
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    filter: index > 0 ? 'blur(1px)' : 'none',
                    opacity: index > 2 ? 0 : 1 - index * 0.2,
                  }}
                >
                  <DiscoveryCard 
                    profile={profile}
                    onSwipe={index === 0 ? handleSwipe : undefined}
                    isInteractive={index === 0}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Swipe Controls */}
      {hasMoreProfiles && currentProfile && (
        <div className="mt-6 pb-4">
          <SwipeButtons
            onPass={() => handleSwipe('pass')}
            onLike={() => handleSwipe('like')}
            onUndo={currentIndex > 0 ? handleUndoSwipe : undefined}
            disabled={!currentProfile}
          />
          
          {/* Profile Counter */}
          <div className="text-center mt-4">
            <p className="text-sm text-slate-500">
              {profiles.length - currentIndex} profiles remaining
            </p>
          </div>
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        isOpen={matchModal.show}
        profile={matchModal.profile}
        matchId={matchModal.matchId}
        onClose={() => setMatchModal({ show: false })}
        onSendMessage={() => {
          setMatchModal({ show: false });
        }}
      />
    </div>
  );
}