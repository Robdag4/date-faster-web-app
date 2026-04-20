'use client';

import { supabase as supabaseClient } from './supabase';
import type { 
  User, 
  DiscoveryProfile, 
  Match, 
  DatePackage, 
  DateRequest, 
  ChatMessage,
  UserSettings,
  SpeedEvent,
  MixerStatement
} from '@/types';

const supabase = supabaseClient;

// Custom error class for API errors
export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  
  constructor(message: string, status: number = 500, body: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = 'ApiError';
  }
}

// Helper function to handle Supabase errors
const handleSupabaseError = (error: any, defaultMessage: string = 'An error occurred') => {
  if (error) {
    throw new ApiError(error.message || defaultMessage, 400, error);
  }
};

// Auth API
export const auth = {
  // Send SMS verification code
  sendCode: async (phoneNumber: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    });
    
    handleSupabaseError(error);
    return { success: true };
  },

  // Verify SMS code and sign in
  verifyCode: async (
    phoneNumber: string, 
    token: string
  ): Promise<{ 
    token: string; 
    userId: string; 
    isNew: boolean; 
    onboardingComplete: boolean 
  }> => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
    });

    handleSupabaseError(error);

    if (!data.user) {
      throw new ApiError('Authentication failed', 401);
    }

    // Check if user exists in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let isNew = false;
    let onboardingComplete = false;

    if (userError && userError.code === 'PGRST116') {
      // User doesn't exist, create new user record
      const { error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            phone_number: phoneNumber,
            first_name: '',
            age: 0,
          },
        ]);

      handleSupabaseError(createError);
      isNew = true;
    } else {
      handleSupabaseError(userError);
      onboardingComplete = userData?.onboarding_complete || false;
    }

    return {
      token: data.session?.access_token || '',
      userId: data.user.id,
      isNew,
      onboardingComplete,
    };
  },

  // Get current user profile
  me: async (): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('deleted_at', null)
      .single();

    handleSupabaseError(error);
    
    if (!data) {
      throw new ApiError('User not found', 404);
    }

    return data as User;
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>): Promise<{ success: boolean }> => {
    // If completing onboarding, verify minimum photos
    if (updates.onboarding_complete) {
      const user = await auth.me();
      if (!user.photos || user.photos.length < 3) {
        throw new ApiError('Minimum 3 photos required to complete onboarding', 400);
      }
    }

    // If date_of_birth provided, compute age and check if under 18
    if (updates.date_of_birth) {
      const dob = new Date(updates.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      
      updates.age = age;
      
      if (age < 18) {
        updates.locked = true;
        updates.locked_reason = 'underage';
        updates.locked_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', (await supabase.auth.getUser()).data.user?.id);

    handleSupabaseError(error);

    if (updates.locked) {
      throw new ApiError('You must be 18 or older to use Date Faster.', 403);
    }

    return { success: true };
  },

  // Delete account
  deleteAccount: async (): Promise<{ success: boolean }> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const { error } = await supabase
      .from('users')
      .update({ 
        deleted_at: new Date().toISOString(),
        phone_number: `deleted-${userId}`,
      })
      .eq('id', userId);

    handleSupabaseError(error);

    await supabase.auth.signOut();
    return { success: true };
  },
};

// Discovery API
export const discovery = {
  // Get discovery feed
  feed: async (distance?: number): Promise<DiscoveryProfile[]> => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return [];

    // Get current user's profile + preferences
    const { data: me } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    if (!me) return [];

    // Get users already swiped on
    const { data: swipes } = await supabase
      .from('swipes')
      .select('target_id')
      .eq('user_id', authUser.id);
    const swipedIds = (swipes || []).map((s: any) => s.target_id);
    swipedIds.push(authUser.id); // exclude self

    // Build query for potential matches
    let query = supabase
      .from('users')
      .select('id, first_name, age, gender, bio, job_title, tagline, interests, ideal_date, relationship_goal, photos, is_premium, latitude, longitude')
      .eq('onboarding_complete', true)
      .is('deleted_at', null)
      .eq('locked', false)
      .not('id', 'in', `(${swipedIds.map(id => `"${id}"`).join(',')})`)
      .gte('age', me.age_min || 18)
      .lte('age', me.age_max || 99);

    // Gender preference filtering
    if (me.preference === 'women') {
      query = query.eq('gender', 'female');
    } else if (me.preference === 'men') {
      query = query.eq('gender', 'male');
    }
    // 'both' = no gender filter

    // Skip incognito users (unless premium with incognito_plus)
    if (!me.incognito_plus) {
      query = query.eq('incognito', false);
    }

    const { data: profiles, error } = await query.limit(50);
    if (error || !profiles) return [];

    // Calculate distance and filter
    const maxDist = distance || me.discovery_radius || 25;
    const myLat = me.custom_latitude || me.latitude || 40.7128;
    const myLng = me.custom_longitude || me.longitude || -74.006;

    const withDistance = profiles.map((p: any) => {
      // If user has no real location, show them with null distance (skip radius filter)
      if (!p.latitude && !p.longitude) {
        return { ...p, distance: null };
      }
      const pLat = p.latitude;
      const pLng = p.longitude;
      const R = 3959; // miles
      const dLat = (pLat - myLat) * Math.PI / 180;
      const dLon = (pLng - myLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(myLat * Math.PI / 180) * Math.cos(pLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...p, distance: Math.round(dist) };
    }).filter((p: any) => p.distance === null || p.distance <= maxDist);

    // Premium users first, then randomize
    withDistance.sort((a: any, b: any) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return Math.random() - 0.5;
    });

    return withDistance;
  },

  // Swipe on a user
  swipe: async (
    targetId: string, 
    direction: 'like' | 'pass'
  ): Promise<{ success: boolean; matched: boolean; matchId: string | null }> => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) throw new ApiError('Not authenticated', 401);

    const res = await fetch('/api/swipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ targetId, direction }),
    });

    const data = await res.json();
    if (!res.ok) throw new ApiError(data.error || 'Swipe failed', res.status);

    const { matched, matchId } = data;

    return { success: true, matched, matchId };
  },

  // Get user's matches
  matches: async (): Promise<Match[]> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      throw new ApiError('Not authenticated', 401);
    }

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        user1:users!matches_user1_id_fkey(id, first_name, photos, age, bio, gender, job_title, tagline),
        user2:users!matches_user2_id_fkey(id, first_name, photos, age, bio, gender, job_title, tagline)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    handleSupabaseError(error);

    return (data || []).map((match: any) => {
      const otherUser = match.user1_id === userId ? match.user2 : match.user1;
      
      return {
        ...match,
        other_id: otherUser.id,
        other_name: otherUser.first_name,
        other_photos: otherUser.photos || [],
        other_age: otherUser.age,
        other_bio: otherUser.bio,
        other_gender: otherUser.gender,
        other_job_title: otherUser.job_title,
        other_tagline: otherUser.tagline,
      } as Match;
    });
  },
};

// Photos API
export const photos = {
  // Upload photo
  upload: async (file: File): Promise<{ photos: string[]; photoUrl: string }> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      throw new ApiError('Not authenticated', 401);
    }

    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, file);

    handleSupabaseError(uploadError);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    const photoUrl = urlData.publicUrl;

    // Add to user's photos array
    const user = await auth.me();
    const photos = [...(user.photos || []), photoUrl];
    
    const { error: updateError } = await supabase
      .from('users')
      .update({ photos })
      .eq('id', userId);

    handleSupabaseError(updateError);

    return { photos, photoUrl };
  },

  // Delete photo
  delete: async (index: number): Promise<{ photos: string[] }> => {
    const user = await auth.me();
    const photos = [...(user.photos || [])];
    
    if (index >= 0 && index < photos.length) {
      // Remove from storage
      const photoUrl = photos[index];
      const fileName = photoUrl.split('/').pop();
      
      if (fileName) {
        await supabase.storage
          .from('photos')
          .remove([`${user.id}/${fileName}`]);
      }
      
      photos.splice(index, 1);
      
      // Update user's photos
      const { error } = await supabase
        .from('users')
        .update({ photos })
        .eq('id', user.id);

      handleSupabaseError(error);
    }

    return { photos };
  },

  // Get photo status
  status: async (): Promise<{ 
    count: number; 
    minimum: number; 
    maximum: number; 
    ready: boolean; 
    photos: string[] 
  }> => {
    const user = await auth.me();
    const photos = user.photos || [];
    
    return {
      count: photos.length,
      minimum: 3,
      maximum: 6,
      ready: photos.length >= 3,
      photos,
    };
  },
};

// Chat API
export const chat = {
  // Send message
  send: async (matchId: string, content: string): Promise<{ id: string }> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    if (!userId) {
      throw new ApiError('Not authenticated', 401);
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          match_id: matchId,
          sender_id: userId,
          content,
        },
      ])
      .select()
      .single();

    handleSupabaseError(error);

    return { id: data.id };
  },

  // Get messages for a match
  messages: async (matchId: string, after?: string): Promise<ChatMessage[]> => {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (after) {
      query = query.gt('created_at', after);
    }

    const { data, error } = await query;

    handleSupabaseError(error);

    return (data || []) as ChatMessage[];
  },
};

// Settings API
export const settings = {
  // Get user settings
  get: async (): Promise<UserSettings> => {
    const user = await auth.me();
    
    return {
      discovery_radius: user.discovery_radius,
      age_min: user.age_min,
      age_max: user.age_max,
      incognito: user.incognito,
      incognito_plus: user.incognito_plus,
      is_premium: user.is_premium,
      custom_latitude: user.custom_latitude,
      custom_longitude: user.custom_longitude,
    };
  },

  // Update user settings
  update: async (settings: Partial<UserSettings>): Promise<{ success: boolean }> => {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const { error } = await supabase
      .from('users')
      .update(settings)
      .eq('id', userId);

    handleSupabaseError(error);

    return { success: true };
  },
};

// Export all APIs
export const api = {
  auth,
  discovery,
  photos,
  chat,
  settings,
};