'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, Briefcase, Heart, X, Info } from 'lucide-react';
import { DiscoveryProfile } from '@/types';
import Image from 'next/image';

interface DiscoveryCardProps {
  profile: DiscoveryProfile;
  onSwipe?: (direction: 'like' | 'pass') => void;
  isInteractive?: boolean;
}

export const DiscoveryCard: React.FC<DiscoveryCardProps> = ({
  profile,
  onSwipe,
  isInteractive = true,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for swipe animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 0.5, 1, 0.5, 0]);

  const handlePanEnd = (_: any, info: PanInfo) => {
    if (!isInteractive || !onSwipe) return;

    const swipeThreshold = 100;
    const swipeVelocityThreshold = 500;

    if (
      info.offset.x > swipeThreshold || 
      info.velocity.x > swipeVelocityThreshold
    ) {
      onSwipe('like');
    } else if (
      info.offset.x < -swipeThreshold || 
      info.velocity.x < -swipeVelocityThreshold
    ) {
      onSwipe('pass');
    } else {
      // Snap back to center
      x.set(0);
    }
  };

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (!isInteractive) return;
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const tapX = e.clientX - rect.left;
    const cardWidth = rect.width;
    
    // Left half - previous photo, right half - next photo
    if (tapX < cardWidth / 2) {
      setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentPhotoIndex((prev) => 
        Math.min(profile.photos.length - 1, prev + 1)
      );
    }
  };

  const calculateAge = (age: number): string => {
    return age.toString();
  };

  return (
    <motion.div
      ref={cardRef}
      className="relative w-full h-full bg-white rounded-3xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing"
      drag={isInteractive ? 'x' : false}
      dragConstraints={{ left: -200, right: 200 }}
      dragElastic={0.2}
      onPanEnd={handlePanEnd}
      style={{ x, rotate }}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
    >
      {/* Photo Section */}
      <div className="relative h-3/5 overflow-hidden" onClick={handlePhotoTap}>
        <Image
          src={profile.photos[currentPhotoIndex] || '/placeholder-avatar.jpg'}
          alt={profile.first_name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 400px"
        />
        
        {/* Photo dots indicator */}
        {profile.photos.length > 1 && (
          <div className="absolute top-4 left-4 flex space-x-1">
            {profile.photos.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPhotoIndex 
                    ? 'bg-white' 
                    : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Swipe indicators */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ opacity }}
        >
          <motion.div
            className="text-white font-bold text-6xl"
            style={{
              opacity: useTransform(x, [-200, -50], [1, 0]),
            }}
          >
            <div className="bg-red-500 p-4 rounded-full">
              <X className="w-12 h-12" />
            </div>
          </motion.div>
          <motion.div
            className="text-white font-bold text-6xl"
            style={{
              opacity: useTransform(x, [50, 200], [0, 1]),
            }}
          >
            <div className="bg-green-500 p-4 rounded-full">
              <Heart className="w-12 h-12 fill-current" />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Profile Info Section */}
      <div className="h-2/5 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-slate-900">
              {profile.first_name}, {calculateAge(profile.age)}
            </h2>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            >
              <Info className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {profile.job_title && (
            <div className="flex items-center text-slate-600 mb-2">
              <Briefcase className="w-4 h-4 mr-2" />
              <span className="text-sm">{profile.job_title}</span>
            </div>
          )}

          <div className="flex items-center text-slate-600 mb-3">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="text-sm">{profile.distance} miles away</span>
          </div>

          {showDetails ? (
            <div className="space-y-3">
              {profile.bio && (
                <div>
                  <p className="text-sm text-slate-700">{profile.bio}</p>
                </div>
              )}
              
              {profile.interests.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-1">Interests</h4>
                  <div className="flex flex-wrap gap-1">
                    {profile.interests.slice(0, 6).map((interest, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                      >
                        {interest}
                      </span>
                    ))}
                    {profile.interests.length > 6 && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 text-xs rounded-full">
                        +{profile.interests.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {profile.ideal_date && (
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-1">Ideal Date</h4>
                  <p className="text-sm text-slate-700">{profile.ideal_date}</p>
                </div>
              )}
            </div>
          ) : (
            profile.tagline && (
              <p className="text-slate-600 text-sm leading-relaxed line-clamp-2">
                {profile.tagline}
              </p>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
};