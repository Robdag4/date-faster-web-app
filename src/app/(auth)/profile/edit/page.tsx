'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, X, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

const INTEREST_OPTIONS = [
  '💪 Fitness', '✈️ Travel', '🍽️ Food', '🎵 Music', '🎨 Art',
  '🎮 Gaming', '📚 Reading', '🌲 Outdoors', '🌙 Nightlife', '🐾 Pets',
  '🎬 Movies', '📸 Photography', '🧘 Wellness', '⚽ Sports', '👩‍🍳 Cooking',
];

export default function EditProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [jobTitle, setJobTitle] = useState(user?.job_title || '');
  const [tagline, setTagline] = useState(user?.tagline || '');
  const [idealDate, setIdealDate] = useState(user?.ideal_date || '');
  const [relationshipGoal, setRelationshipGoal] = useState(user?.relationship_goal || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [photos, setPhotos] = useState<string[]>(user?.photos || []);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const toggleInterest = (interest: string) => {
    const clean = interest.replace(/^.+\s/, '');
    setInterests(prev => 
      prev.includes(clean) ? prev.filter(i => i !== clean) : [...prev, clean]
    );
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
      video.onerror = () => reject(new Error('Could not read video'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || photos.length >= 6) return;
    
    const isVideo = file.type.startsWith('video/');
    if (isVideo) {
      try {
        const duration = await getVideoDuration(file);
        if (duration > 5) { toast.error(`Video is ${Math.round(duration)}s — max 5 seconds`); if (fileRef.current) fileRef.current.value = ''; return; }
      } catch { toast.error('Could not read video'); if (fileRef.current) fileRef.current.value = ''; return; }
    }
    const maxSize = isVideo ? 20 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { toast.error(`File too large! Max ${isVideo ? '20MB' : '10MB'}`); if (fileRef.current) fileRef.current.value = ''; return; }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      setPhotos(prev => [...prev, urlData.publicUrl]);
      toast.success(isVideo ? 'Video uploaded!' : 'Photo uploaded!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(true);
      if (fileRef.current) fileRef.current.value = '';
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const bio = [
        tagline,
        jobTitle,
        interests.length ? 'Into ' + interests.slice(0, 4).join(', ') : '',
        idealDate ? 'Ideal date: ' + idealDate : '',
      ].filter(Boolean).join(' • ');

      const { error } = await supabase.from('users').update({
        first_name: firstName,
        job_title: jobTitle,
        tagline,
        ideal_date: idealDate,
        relationship_goal: relationshipGoal,
        interests,
        photos,
        bio,
      }).eq('id', user.id);

      if (error) throw error;
      await refreshUser();
      toast.success('Profile updated!');
      router.push('/profile');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-24">
      <div className="flex items-center space-x-3 mb-6">
        <Link href="/profile" className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Profile</h1>
      </div>

      <div className="space-y-6">
        {/* Photos */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Photos</h3>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, i) => {
              const isVid = /\.(mp4|mov|webm)(\?|$)/i.test(photo);
              return (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                {isVid ? (
                  <video src={photo} muted loop playsInline autoPlay className="w-full h-full object-cover" />
                ) : !imageErrors.has(i) ? (
                  <Image src={photo} alt="" fill className="object-cover" onError={() => setImageErrors(prev => new Set(prev).add(i))} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-slate-300" />
                  </div>
                )}
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full">
                    MAIN
                  </div>
                )}
              </div>
            );
            })}
            {photos.length < 6 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-rose-400 hover:text-rose-400 transition"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs mt-1">{uploading ? '...' : 'Add'}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-4">
          <h3 className="font-semibold text-slate-900">Basic Info</h3>
          <div>
            <label className="label">First Name</label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Job Title</label>
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)} className="input" placeholder="What do you do?" />
          </div>
          <div>
            <label className="label">Tagline</label>
            <input value={tagline} onChange={e => setTagline(e.target.value)} className="input" placeholder="Describe yourself in a few words" maxLength={150} />
          </div>
          <div>
            <label className="label">Ideal First Date</label>
            <input value={idealDate} onChange={e => setIdealDate(e.target.value)} className="input" placeholder="What's your perfect date?" maxLength={200} />
          </div>
          <div>
            <label className="label">Looking For</label>
            <div className="flex gap-2 flex-wrap">
              {['casual', 'serious', 'open'].map(goal => (
                <button
                  key={goal}
                  onClick={() => setRelationshipGoal(goal)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    relationshipGoal === goal ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {goal === 'casual' ? 'Something casual' : goal === 'serious' ? 'Something serious' : 'Open to anything'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Interests */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-3">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(option => {
              const clean = option.replace(/^.+\s/, '');
              const selected = interests.includes(clean);
              return (
                <button
                  key={option}
                  onClick={() => toggleInterest(option)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
