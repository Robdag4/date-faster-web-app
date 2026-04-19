'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';

interface Msg { id: string; role: 'bot' | 'user'; text: string }

type Step = 'name' | 'age' | 'gender' | 'sexuality' | 'job' | 'interests' | 'ideal_date' | 'tagline' | 'relationship_goal' | 'photos' | 'location' | 'done';

const INTEREST_OPTIONS = [
  '💪 Fitness', '✈️ Travel', '🍽️ Food', '🎵 Music', '🎨 Art',
  '🎮 Gaming', '📚 Reading', '🌲 Outdoors', '🌙 Nightlife', '🐾 Pets',
  '🎬 Movies', '📸 Photography', '🧘 Wellness', '⚽ Sports', '👩‍🍳 Cooking',
];

function buildBio(profile: { tagline: string; job_title: string; interests: string[]; ideal_date: string; relationship_goal: string }): string {
  const parts: string[] = [];
  if (profile.tagline) parts.push(profile.tagline);
  if (profile.job_title) parts.push(profile.job_title);
  if (profile.interests.length) parts.push('Into ' + profile.interests.slice(0, 4).join(', '));
  if (profile.ideal_date) parts.push('Ideal date: ' + profile.ideal_date);
  const goalMap: Record<string, string> = { casual: 'Looking for something casual', serious: 'Looking for something serious', open: 'Open to anything' };
  if (profile.relationship_goal && goalMap[profile.relationship_goal]) parts.push(goalMap[profile.relationship_goal]);
  return parts.join(' • ');
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, session, refreshUser } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([
    { id: '1', role: 'bot', text: "Hey! 👋 I'm your Date Faster assistant. Let's build your profile. What's your first name?" },
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState<Step>('name');
  const [profile, setProfile] = useState({
    first_name: '', age: 0, date_of_birth: '', gender: '', preference: '', sexuality: '',
    job_title: '', interests: [] as string[], ideal_date: '', tagline: '', relationship_goal: '',
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showEventCode, setShowEventCode] = useState(false);
  const [eventCodeInput, setEventCodeInput] = useState('');
  const [eventCodeError, setEventCodeError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Redirect if user is not authenticated or already completed onboarding
    if (!user && !session) {
      router.push('/');
      return;
    }
    if (user?.onboarding_complete) {
      router.push('/discover');
      return;
    }
  }, [user, session, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const add = (role: 'bot' | 'user', text: string) => {
    setMessages(prev => [...prev, { id: String(Date.now() + Math.random()), role, text }]);
  };

  const handleSend = async (override?: string) => {
    const text = override || input.trim();
    if (!text) return;
    setInput('');
    add('user', text);
    await new Promise(r => setTimeout(r, 400));

    switch (step) {
      case 'name':
        setProfile(p => ({ ...p, first_name: text }));
        add('bot', `Nice to meet you, ${text}! 💫 What's your date of birth? (MM/DD/YYYY)`);
        setStep('age');
        break;
      case 'age': {
        // Parse MM/DD/YYYY or YYYY-MM-DD
        let dob: Date | null = null;
        const slashMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (slashMatch) {
          dob = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
        } else {
          const d = new Date(text);
          if (!isNaN(d.getTime())) dob = d;
        }
        if (!dob || isNaN(dob.getTime())) { add('bot', 'Please enter your birthday as MM/DD/YYYY 🎂'); return; }
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) {
          add('bot', 'Sorry, you must be 18 or older to use Date Faster. 🚫');
          // Still save to lock account server-side
          const dobStr = dob.toISOString().split('T')[0];
          setProfile(p => ({ ...p, age, date_of_birth: dobStr }));
          try { 
            await supabase.from('users').update({ 
              date_of_birth: dobStr, 
              age,
              locked: true,
              locked_reason: 'underage'
            }).eq('id', user?.id);
          } catch {}
          return;
        }
        if (age > 120) { add('bot', 'Please enter a valid birthday 🎂'); return; }
        const dobStr = dob.toISOString().split('T')[0];
        setProfile(p => ({ ...p, age, date_of_birth: dobStr }));
        add('bot', "Got it! What's your gender?");
        setStep('gender');
        break;
      }
      case 'gender': {
        const map: Record<string, string> = { man: 'male', woman: 'female', 'non-binary': 'non-binary', male: 'male', female: 'female' };
        const g = map[text.toLowerCase()];
        if (!g) { add('bot', 'Please pick: Man, Woman, or Non-binary'); return; }
        setProfile(p => ({ ...p, gender: g }));
        add('bot', 'What\'s your sexual orientation?');
        setStep('sexuality');
        break;
      }
      case 'sexuality': {
        const map: Record<string, { sexuality: string; preference: string }> = {
          straight: { sexuality: 'straight', preference: '' },
          gay: { sexuality: 'gay', preference: '' },
          bisexual: { sexuality: 'bisexual', preference: 'both' },
        };
        const s = map[text.toLowerCase()];
        if (!s) { add('bot', 'Please pick: Straight, Gay, or Bisexual'); return; }
        // Auto-set preference based on gender + sexuality
        let pref = s.preference;
        if (s.sexuality === 'straight') {
          pref = profile.gender === 'male' ? 'women' : 'men';
        } else if (s.sexuality === 'gay') {
          pref = profile.gender === 'male' ? 'men' : 'women';
        }
        setProfile(prev => ({ ...prev, preference: pref, sexuality: s.sexuality }));
        add('bot', "Now let's build your bio! 📝 What do you do for work?");
        setStep('job');
        break;
      }
      case 'job':
        setProfile(p => ({ ...p, job_title: text }));
        add('bot', "Nice! Now pick what you're passionate about 👇 (select at least 2, then tap Continue)");
        setStep('interests');
        break;
      case 'ideal_date':
        if (text.length > 200) { add('bot', 'Keep it under 200 characters! ✂️'); return; }
        setProfile(p => ({ ...p, ideal_date: text }));
        add('bot', 'Describe yourself in a few words — your personal tagline ✨');
        setStep('tagline');
        break;
      case 'tagline':
        if (text.length > 150) { add('bot', 'Keep it under 150 characters! ✂️'); return; }
        setProfile(p => ({ ...p, tagline: text }));
        add('bot', "Last question! What are you looking for?");
        setStep('relationship_goal');
        break;
    }
  };

  const handleInterestsDone = () => {
    if (selectedInterests.length < 2) { add('bot', 'Please select at least 2 interests!'); return; }
    const clean = selectedInterests.map(i => i.replace(/^.+\s/, ''));
    setProfile(p => ({ ...p, interests: clean }));
    add('user', selectedInterests.join(', '));
    add('bot', "Great picks! 🎯 What's your ideal first date?");
    setStep('ideal_date');
  };

  const handleGoalSelect = (goal: string) => {
    const map: Record<string, string> = { 'Something casual': 'casual', 'Something serious': 'serious', 'Open to anything': 'open' };
    const g = map[goal] || 'open';
    add('user', goal);
    setProfile(p => ({ ...p, relationship_goal: g }));
    setTimeout(() => {
      add('bot', "Profile looking great! 🔥 Now upload at least 3 photos 📸 (max 6). Your first photo will be your main pic!");
      setStep('photos');
    }, 400);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);

      const newPhotos = [...photos, urlData.publicUrl];
      setPhotos(newPhotos);
      
      // Update user's photos array in database
      await supabase.from('users')
        .update({ photos: newPhotos })
        .eq('id', user.id);

      add('user', `📸 Photo uploaded (${newPhotos.length}/6)`);
      if (newPhotos.length === 3) {
        add('bot', 'Looking great! You have the minimum 3. Add more or tap Continue →');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      add('bot', 'Upload failed. Try again!');
    } finally { 
      setUploading(false); 
      if (fileRef.current) fileRef.current.value = ''; 
    }
  };

  const handlePhotoDone = () => {
    if (photos.length < 3) { add('bot', 'You need at least 3 photos! 📸'); return; }
    add('bot', "Last thing — I need your location to find matches nearby 📍");
    setStep('location');
  };

  const handleEventCodeBypass = async () => {
    const code = eventCodeInput.trim().toUpperCase();
    if (!code) { setEventCodeError('Enter your event code'); return; }
    setEventCodeError('');
    
    // For now, just validate format and proceed (you'd implement actual event validation later)
    if (code.length < 3) {
      setEventCodeError('Invalid event code');
      return;
    }

    add('user', `🎟️ Event code: ${code}`);
    add('bot', "Event code verified! ✅ Setting up your profile...");

    // Save profile and complete onboarding
    try {
      const bio = buildBio(profile);
      await supabase.from('users').update({
        first_name: profile.first_name,
        age: profile.age,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        preference: profile.preference,
        sexuality: profile.sexuality,
        bio,
        job_title: profile.job_title,
        tagline: profile.tagline,
        interests: profile.interests,
        ideal_date: profile.ideal_date,
        relationship_goal: profile.relationship_goal,
        onboarding_complete: true,
      }).eq('id', user?.id);
      
      await refreshUser();
    } catch (err: any) {
      add('bot', `Something went wrong saving your profile: ${err.message}. Try again! 🔄`);
      return;
    }

    add('bot', "You're all set! 🎉 Taking you to the event...");
    setStep('done');
    setTimeout(() => {
      router.replace('/discover');
    }, 1000);
  };

  const handleLocation = async () => {
    add('user', '📍 Sharing location...');
    let lat = 40.7128; // default NYC
    let lng = -74.0060;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      add('bot', "Couldn't get exact location — using a default for now. You can update it in Settings later! 📍");
    }
    try {
      const bio = buildBio(profile);
      await supabase.from('users').update({
        first_name: profile.first_name,
        age: profile.age,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        preference: profile.preference,
        sexuality: profile.sexuality,
        bio,
        job_title: profile.job_title,
        tagline: profile.tagline,
        interests: profile.interests,
        ideal_date: profile.ideal_date,
        relationship_goal: profile.relationship_goal,
        latitude: lat,
        longitude: lng,
        onboarding_complete: true,
      }).eq('id', user?.id);
      
      add('bot', "You're all set! 🎉 Let's find you some dates!");
      setStep('done');
      await refreshUser();
      setTimeout(() => router.replace('/discover'), 1500);
    } catch (error) {
      console.error('Profile save error:', error);
      add('bot', "Something went wrong saving your profile. Try again! 🔄");
    }
  };

  const quickReplies = () => {
    if (step === 'gender') return ['Man', 'Woman', 'Non-binary'];
    if (step === 'sexuality') return ['Straight', 'Gay', 'Bisexual'];
    if (step === 'relationship_goal') return ['Something casual', 'Something serious', 'Open to anything'];
    return null;
  };

  const replies = quickReplies();

  if (!user) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <div className="px-4 py-3 text-center bg-white border-b border-slate-200">
        <h2 className="font-bold text-lg text-slate-900">🤖 Date Faster Setup</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(m => (
          <div key={m.id} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-[15px] leading-6 ${
                m.role === 'user'
                  ? 'bg-rose-500 text-white rounded-br-sm'
                  : 'bg-white text-slate-900 border border-slate-200 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {replies && (
        <div className="flex justify-center gap-2 px-4 py-2 flex-wrap">
          {replies.map(opt => (
            <button
              key={opt}
              onClick={() => step === 'relationship_goal' ? handleGoalSelect(opt) : handleSend(opt)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition shadow-sm bg-white border border-rose-500 text-rose-500 hover:bg-rose-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Interests picker */}
      {step === 'interests' && (
        <div className="px-4 py-3 space-y-3 bg-white border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(interest => {
              const selected = selectedInterests.includes(interest);
              return (
                <button
                  key={interest}
                  onClick={() => setSelectedInterests(prev => selected ? prev.filter(i => i !== interest) : [...prev, interest])}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    selected
                      ? 'bg-rose-500 text-white'
                      : 'bg-cream-50 border border-slate-200 text-slate-900'
                  }`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleInterestsDone}
            disabled={selectedInterests.length < 2}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-40 gradient-bg"
          >
            Continue ({selectedInterests.length} selected)
          </button>
        </div>
      )}

      {/* Photo upload */}
      {step === 'photos' && (
        <div className="px-4 py-3 space-y-2 bg-white border-t border-slate-200">
          {!showEventCode ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || photos.length >= 6}
                  className="flex-1 py-3 rounded-xl text-white font-semibold disabled:opacity-40 bg-slate-600 hover:bg-slate-700"
                >
                  {uploading ? 'Uploading...' : `📸 Upload Photo (${photos.length}/6)`}
                </button>
                {photos.length >= 3 && (
                  <button onClick={handlePhotoDone} className="py-3 px-5 rounded-xl text-white font-semibold gradient-bg">
                    Continue →
                  </button>
                )}
              </div>
              {photos.length < 3 && (
                <p className="text-xs text-center text-slate-600">
                  Minimum 3 photos required ({3 - photos.length} more needed)
                </p>
              )}
              <button
                onClick={() => setShowEventCode(true)}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-white border-2 border-rose-500 text-rose-500 hover:bg-rose-50"
              >
                🎟️ Have an event code? Skip photos
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-center text-slate-600">Enter your event code to skip photos</p>
              <input
                value={eventCodeInput}
                onChange={e => setEventCodeInput(e.target.value.toUpperCase())}
                placeholder="EVENT CODE"
                className="w-full px-4 py-3 rounded-xl text-center text-lg font-bold tracking-widest outline-none bg-cream-50 border border-slate-200 text-slate-900 focus:border-rose-500"
                onKeyDown={e => e.key === 'Enter' && handleEventCodeBypass()}
              />
              {eventCodeError && <p className="text-xs text-red-500 text-center">{eventCodeError}</p>}
              <div className="flex gap-2">
                <button onClick={() => setShowEventCode(false)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-cream-50 border border-slate-200 text-slate-900 hover:bg-slate-100">
                  ← Back
                </button>
                <button onClick={handleEventCodeBypass}
                  className="flex-1 py-3 rounded-xl text-white font-semibold text-sm gradient-bg">
                  Verify & Skip →
                </button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
      )}

      {/* Location */}
      {step === 'location' && (
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <button onClick={handleLocation} className="w-full py-3 rounded-xl text-white font-semibold text-lg gradient-bg">
            📍 Enable Location
          </button>
        </div>
      )}

      {/* Text input */}
      {!['location', 'done', 'photos', 'interests', 'relationship_goal', 'gender', 'sexuality'].includes(step) && (
        <div className="flex items-end gap-2 px-4 py-3 bg-white border-t border-slate-200">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type your answer..."
            className="flex-1 rounded-full px-4 py-2.5 outline-none text-[15px] bg-cream-50 border border-slate-200 text-slate-900 focus:border-rose-500"
          />
          <button onClick={() => handleSend()}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold gradient-bg">
            →
          </button>
        </div>
      )}
    </div>
  );
}