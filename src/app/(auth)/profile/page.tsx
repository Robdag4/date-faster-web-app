'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { Edit, Camera, Settings, Heart, MapPin, Briefcase, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [imageError, setImageError] = useState(false);

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-4 h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  const calculateAge = () => {
    if (!user.date_of_birth) return user.age;
    
    const dob = new Date(user.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Cover Photo & Profile Picture */}
      <div className="relative h-64 bg-gradient-to-br from-rose-400 to-pink-500">
        {/* Edit button */}
        <Link
          href="/profile/edit"
          className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <Edit className="w-5 h-5" />
        </Link>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2">
          <div className="relative w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg">
            {user.photos?.[0] && !imageError ? (
              <Image
                src={user.photos[0]}
                alt="Profile"
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-20 pb-4 space-y-6">
        {/* Basic Info */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-1">
            {user.first_name}
          </h1>
          <p className="text-xl text-slate-600 mb-2">
            {calculateAge()} years old
          </p>
          {user.tagline && (
            <p className="text-slate-600 italic">"{user.tagline}"</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Link href="/premium" className="text-center block">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Premium</p>
            <p className="text-xs text-slate-600">
              {user.is_premium ? '⭐ Active' : 'Upgrade →'}
            </p>
          </Link>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <MapPin className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Radius</p>
            <p className="text-xs text-slate-600">{user.discovery_radius} miles</p>
          </div>
          
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-sm font-medium text-slate-900">Joined</p>
            <p className="text-xs text-slate-600">
              {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Profile Details */}
        <div className="space-y-4">
          {user.bio && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">About Me</h3>
              <p className="text-slate-700 leading-relaxed">{user.bio}</p>
            </div>
          )}

          {user.job_title && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <div className="flex items-center space-x-3">
                <Briefcase className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium text-slate-900">{user.job_title}</p>
                  <p className="text-sm text-slate-600">Professional</p>
                </div>
              </div>
            </div>
          )}

          {user.interests && user.interests.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {user.interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.ideal_date && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-2">Ideal Date</h3>
              <p className="text-slate-700 leading-relaxed">{user.ideal_date}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/profile/edit"
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <Edit className="w-5 h-5" />
            <span>Edit Profile</span>
          </Link>
          
          <Link
            href="/settings"
            className="btn-secondary w-full flex items-center justify-center space-x-2"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>

          <button
            onClick={signOut}
            className="btn-ghost w-full"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}