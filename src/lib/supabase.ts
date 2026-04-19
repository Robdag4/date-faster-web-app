import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client for browser usage
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Simple client for API routes (uses anon key with auth headers)
export const createClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Client for server components
export const createServerClient = () => {
  return createServerComponentClient({ cookies });
};

// Client for client components
export const createClientClient = () => {
  return createClientComponentClient();
};

// Service role client (for admin operations)
export const supabaseAdmin = createSupabaseClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Database types (generated from Supabase)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string | null;
          first_name: string;
          age: number;
          date_of_birth: string | null;
          gender: string;
          preference: string;
          sexuality: string;
          bio: string;
          job_title: string;
          tagline: string;
          interests: string[];
          ideal_date: string;
          relationship_goal: string;
          latitude: number | null;
          longitude: number | null;
          custom_latitude: number | null;
          custom_longitude: number | null;
          photos: string[];
          onboarding_complete: boolean;
          is_premium: boolean;
          incognito: boolean;
          incognito_plus: boolean;
          discovery_radius: number;
          age_min: number;
          age_max: number;
          credits_balance: number;
          locked: boolean;
          locked_reason: string | null;
          locked_at: string | null;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          premium_cancel_at: string | null;
          last_ip: string | null;
          last_device_fingerprint: string | null;
          last_login_at: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phone_number?: string | null;
          first_name?: string;
          age?: number;
          date_of_birth?: string | null;
          gender?: string;
          preference?: string;
          sexuality?: string;
          bio?: string;
          job_title?: string;
          tagline?: string;
          interests?: string[];
          ideal_date?: string;
          relationship_goal?: string;
          latitude?: number | null;
          longitude?: number | null;
          custom_latitude?: number | null;
          custom_longitude?: number | null;
          photos?: string[];
          onboarding_complete?: boolean;
          is_premium?: boolean;
          incognito?: boolean;
          incognito_plus?: boolean;
          discovery_radius?: number;
          age_min?: number;
          age_max?: number;
          credits_balance?: number;
          locked?: boolean;
          locked_reason?: string | null;
          locked_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          premium_cancel_at?: string | null;
          last_ip?: string | null;
          last_device_fingerprint?: string | null;
          last_login_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone_number?: string | null;
          first_name?: string;
          age?: number;
          date_of_birth?: string | null;
          gender?: string;
          preference?: string;
          sexuality?: string;
          bio?: string;
          job_title?: string;
          tagline?: string;
          interests?: string[];
          ideal_date?: string;
          relationship_goal?: string;
          latitude?: number | null;
          longitude?: number | null;
          custom_latitude?: number | null;
          custom_longitude?: number | null;
          photos?: string[];
          onboarding_complete?: boolean;
          is_premium?: boolean;
          incognito?: boolean;
          incognito_plus?: boolean;
          discovery_radius?: number;
          age_min?: number;
          age_max?: number;
          credits_balance?: number;
          locked?: boolean;
          locked_reason?: string | null;
          locked_at?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          premium_cancel_at?: string | null;
          last_ip?: string | null;
          last_device_fingerprint?: string | null;
          last_login_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Add other table types here as we build them
    };
  };
};