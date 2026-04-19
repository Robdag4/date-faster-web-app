import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

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

// Service role client (for admin operations) - only works server-side at runtime
export const createAdminClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set — admin client will not work');
  }
  return createSupabaseClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    serviceKey || 'placeholder-key',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Re-export type
export type { SupabaseClient };

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
        Insert: Partial<Database['public']['Tables']['users']['Row']>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
    };
  };
};
