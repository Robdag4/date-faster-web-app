'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { DiscoveryCard, DiscoveryCardHandle } from '@/components/discovery/discovery-card';
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
  const cardRef = useRef<DiscoveryCardHandle>(null);

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

  const handleUndoSwipe = async () => {
    if (currentIndex <= 0) return;
    const prevProfile = profiles[currentIndex - 1];
    if (!prevProfile) return;

    try {
      const session = (await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session;
      if (!session) return;

      const res = await fetch('/api/swipe/undo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetId: prevProfile.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 403) {
          toast('⭐ Undo is a Premium feature', { icon: '🔒' });
          return;
        }
        throw new Error(data.error);
      }

      setCurrentIndex((prev) => prev - 1);
      toast.success('Swipe undone!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to undo');
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
          <button onClick={handleLocationPermission} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 shadow-sm">
            Allow
          </button>
        </div>
      )}

      {/* Discovery Stack */}
      <div className="flex-1 relative overflow-hidden" style={{ minHeight: '400px' }}>
        {!hasMoreProfiles ? (
          <EmptyState onRefresh={loadDiscoveryFeed} />
        ) : (
          <div className="relative h-full">
            {/* Card Stack — render up to 2 behind current */}
            {profiles.slice(currentIndex, currentIndex + 2).map((profile, index) => (
              <div
                key={profile.id}
                className="absolute inset-0"
                style={{ zIndex: 10 - index }}
              >
                {index === 0 ? (
                  <DiscoveryCard 
                    ref={cardRef}
                    profile={profile}
                    onSwipe={handleSwipe}
                    isInteractive
                  />
                ) : (
                  <div className="absolute inset-0 bg-white rounded-3xl shadow-lg overflow-hidden scale-[0.97] translate-y-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Swipe Controls */}
      {hasMoreProfiles && currentProfile && (
        <div className="mt-6 pb-4">
          <SwipeButtons
            onPass={() => cardRef.current ? cardRef.current.flyOut('pass') : handleSwipe('pass')}
            onLike={() => cardRef.current ? cardRef.current.flyOut('like') : handleSwipe('like')}
            onUndo={currentIndex > 0 ? handleUndoSwipe : undefined}
            showUndo={true}
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