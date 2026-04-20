'use client';

import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { motion, useMotionValue, useTransform, animate, PanInfo } from 'framer-motion';
import { MapPin, Briefcase, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { DiscoveryProfile } from '@/types';
import Image from 'next/image';

interface DiscoveryCardProps {
  profile: DiscoveryProfile;
  onSwipe?: (direction: 'like' | 'pass') => void;
  isInteractive?: boolean;
}

export interface DiscoveryCardHandle {
  flyOut: (direction: 'like' | 'pass') => void;
}

export const DiscoveryCard = forwardRef<DiscoveryCardHandle, DiscoveryCardProps>(({
  profile,
  onSwipe,
  isInteractive = true,
}, ref) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, 0], [1, 0]);

  useImperativeHandle(ref, () => ({ flyOut }));

  const validPhotos = profile.photos?.filter(Boolean) || [];
  const hasMultiplePhotos = validPhotos.length > 1;

  const flyOut = (direction: 'like' | 'pass') => {
    if (swiping) return;
    setSwiping(true);
    const target = direction === 'like' ? 500 : -500;
    animate(x, target, {
      type: 'tween',
      duration: 0.3,
      ease: 'easeOut',
      onComplete: () => {
        onSwipe?.(direction);
      },
    });
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isInteractive || !onSwipe || swiping) return;

    if (info.offset.x > 80 || info.velocity.x > 400) {
      flyOut('like');
    } else if (info.offset.x < -80 || info.velocity.x < -400) {
      flyOut('pass');
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
    }
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => Math.min(validPhotos.length - 1, prev + 1));
  };

  const hasAbout = profile.bio || profile.tagline || (profile.interests?.length > 0) || profile.ideal_date || profile.relationship_goal;

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-0 bg-white rounded-3xl shadow-xl overflow-hidden touch-none"
      drag={isInteractive && !swiping ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
    >
      {/* Photo Section */}
      <div className="relative w-full" style={{ height: expanded ? '45%' : '65%', transition: 'height 0.3s ease' }}>
        {validPhotos.length > 0 ? (
          <Image
            src={validPhotos[currentPhotoIndex] || '/placeholder-avatar.jpg'}
            alt={profile.first_name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
            <span className="text-4xl">👤</span>
          </div>
        )}
        
        {/* Photo progress bars */}
        {hasMultiplePhotos && (
          <div className="absolute top-3 inset-x-3 flex gap-1">
            {validPhotos.map((_, index) => (
              <div
                key={index}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  index === currentPhotoIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Left/Right photo nav arrows */}
        {hasMultiplePhotos && currentPhotoIndex > 0 && (
          <button
            onClick={prevPhoto}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/50"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {hasMultiplePhotos && currentPhotoIndex < validPhotos.length - 1 && (
          <button
            onClick={nextPhoto}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white active:bg-black/50"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Photo counter */}
        {hasMultiplePhotos && (
          <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-0.5">
            <span className="text-white text-xs font-medium">{currentPhotoIndex + 1}/{validPhotos.length}</span>
          </div>
        )}

        {/* LIKE indicator */}
        <motion.div
          className="absolute top-12 left-6 border-4 border-green-500 rounded-lg px-4 py-1 pointer-events-none"
          style={{ opacity: likeOpacity, rotate: -20 }}
        >
          <span className="text-green-500 font-black text-3xl tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE indicator */}
        <motion.div
          className="absolute top-12 right-6 border-4 border-red-500 rounded-lg px-4 py-1 pointer-events-none"
          style={{ opacity: passOpacity, rotate: 20 }}
        >
          <span className="text-red-500 font-black text-3xl tracking-wider">NOPE</span>
        </motion.div>
      </div>

      {/* Info Section */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ height: expanded ? '55%' : '35%', transition: 'height 0.3s ease' }}
      >
        <div
          className="px-5 pt-4 pb-2 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); if (hasAbout) setExpanded(!expanded); }}
        >
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold text-slate-900">
              {profile.first_name}, {profile.age}
            </h2>
            {hasAbout && (
              <div className="p-1 rounded-full bg-slate-100">
                {expanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-sm">
            {profile.job_title && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" />
                {profile.job_title}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {profile.distance != null ? `${profile.distance} mi` : '? mi'}
            </span>
          </div>
        </div>

        {!expanded && profile.tagline && (
          <div className="px-5 pb-3">
            <p className="text-slate-500 text-sm line-clamp-2">{profile.tagline}</p>
          </div>
        )}

        {expanded && (
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
            {profile.tagline && (
              <p className="text-slate-700 text-sm italic">&ldquo;{profile.tagline}&rdquo;</p>
            )}
            {profile.bio && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">About</h4>
                <p className="text-sm text-slate-600">{profile.bio}</p>
              </div>
            )}
            {profile.interests?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">Interests</h4>
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest, i) => (
                    <span key={i} className="px-2.5 py-1 bg-rose-50 text-rose-600 text-xs rounded-full font-medium">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.ideal_date && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">Ideal Date</h4>
                <p className="text-sm text-slate-600">{profile.ideal_date}</p>
              </div>
            )}
            {profile.relationship_goal && (
              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-1">Looking For</h4>
                <p className="text-sm text-slate-600">{profile.relationship_goal}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});

DiscoveryCard.displayName = 'DiscoveryCard';
