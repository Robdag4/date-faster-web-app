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
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-15, 0, 15]);
  const likeOpacity = useTransform(x, [0, 80], [0, 1]);
  const passOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (!isInteractive || !onSwipe) return;

    if (info.offset.x > 100 || info.velocity.x > 500) {
      onSwipe('like');
    } else if (info.offset.x < -100 || info.velocity.x < -500) {
      onSwipe('pass');
    }
  };

  const handlePhotoTap = (e: React.MouseEvent) => {
    if (!isInteractive) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const tapX = e.clientX - rect.left;
    if (tapX < rect.width / 2) {
      setCurrentPhotoIndex((prev) => Math.max(0, prev - 1));
    } else {
      setCurrentPhotoIndex((prev) => Math.min(profile.photos.length - 1, prev + 1));
    }
  };

  const validPhotos = profile.photos?.filter(Boolean) || [];

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-0 bg-white rounded-3xl shadow-xl overflow-hidden touch-none"
      drag={isInteractive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
    >
      {/* Photo Section — fills top portion */}
      <div className="relative w-full" style={{ height: '65%' }} onClick={handlePhotoTap}>
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
        
        {/* Photo dots */}
        {validPhotos.length > 1 && (
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

        {/* LIKE indicator */}
        <motion.div
          className="absolute top-8 left-6 border-4 border-green-500 rounded-lg px-4 py-1 pointer-events-none"
          style={{ opacity: likeOpacity, rotate: -20 }}
        >
          <span className="text-green-500 font-black text-3xl tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE indicator */}
        <motion.div
          className="absolute top-8 right-6 border-4 border-red-500 rounded-lg px-4 py-1 pointer-events-none"
          style={{ opacity: passOpacity, rotate: 20 }}
        >
          <span className="text-red-500 font-black text-3xl tracking-wider">NOPE</span>
        </motion.div>
      </div>

      {/* Info Section */}
      <div className="p-5 flex flex-col" style={{ height: '35%' }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-2xl font-bold text-slate-900">
            {profile.first_name}, {profile.age}
          </h2>
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <Info className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {profile.job_title && (
          <div className="flex items-center text-slate-500 mb-1">
            <Briefcase className="w-4 h-4 mr-2 shrink-0" />
            <span className="text-sm truncate">{profile.job_title}</span>
          </div>
        )}

        <div className="flex items-center text-slate-500 mb-2">
          <MapPin className="w-4 h-4 mr-2 shrink-0" />
          <span className="text-sm">
            {profile.distance != null ? `${profile.distance} miles away` : 'Distance unknown'}
          </span>
        </div>

        {showDetails ? (
          <div className="flex-1 overflow-y-auto space-y-2">
            {profile.bio && <p className="text-sm text-slate-600">{profile.bio}</p>}
            {profile.interests?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {profile.interests.slice(0, 6).map((interest, i) => (
                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-600 text-xs rounded-full">
                    {interest}
                  </span>
                ))}
              </div>
            )}
            {profile.ideal_date && (
              <p className="text-sm text-slate-600">💡 {profile.ideal_date}</p>
            )}
          </div>
        ) : (
          profile.tagline && (
            <p className="text-slate-500 text-sm line-clamp-2">{profile.tagline}</p>
          )
        )}
      </div>
    </motion.div>
  );
};
