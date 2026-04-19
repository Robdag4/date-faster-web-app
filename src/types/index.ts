// User types
export interface User {
  id: string;
  phone_number: string;
  first_name: string;
  age: number;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'non-binary';
  preference: 'men' | 'women' | 'both';
  sexuality: 'straight' | 'gay' | 'bisexual' | '';
  bio: string;
  job_title: string;
  tagline: string;
  interests: string[];
  ideal_date: string;
  relationship_goal: 'casual' | 'serious' | 'open';
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
  created_at: string;
  updated_at: string;
}

// Discovery types
export interface DiscoveryProfile {
  id: string;
  first_name: string;
  age: number;
  gender: string;
  bio: string;
  job_title: string;
  tagline: string;
  interests: string[];
  ideal_date: string;
  relationship_goal: string;
  photos: string[];
  distance: number;
  is_premium: boolean;
}

// Match types
export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'matched' | 'date_pending' | 'date_accepted' | 'paid' | 'completed' | 'unmatched';
  source: 'swipe' | 'speed_dating' | 'mixer';
  other_id: string;
  other_name: string;
  other_photos: string[];
  other_age: number;
  other_bio: string;
  other_gender: string;
  other_job_title: string;
  other_tagline: string;
  created_at: string;
}

// Date package types
export interface DatePackage {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  image_url: string;
  venue_id: string | null;
  venue_name?: string;
  venue_address?: string;
  venue_lat?: number;
  venue_lng?: number;
  distance_miles?: number;
  active: boolean;
}

// Date request types
export interface DateRequest {
  id: string;
  match_id: string;
  sender_id: string;
  receiver_id: string;
  package_id: string;
  package_name: string;
  price_cents: number;
  package_description: string;
  note: string;
  status: 'pending' | 'accepted' | 'countered' | 'declined';
  counter_package_id: string | null;
  counter_package_name: string | null;
  counter_price_cents: number | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  redemption_code: string | null;
  redeemed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Chat types
export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// Payment types
export interface Payment {
  id: string;
  match_id: string;
  date_request_id: string;
  payer_id: string;
  amount_cents: number;
  status: 'pending' | 'completed' | 'refunded';
  payout_status: string;
  created_at: string;
}

// Speed dating types
export interface SpeedEvent {
  id: string;
  name: string;
  event_code: string;
  city: string;
  venue_name: string | null;
  venue_address: string | null;
  date: string;
  status: 'draft' | 'checkin' | 'active' | 'completed';
  event_type: 'speed_dating' | 'mixer';
  max_capacity: number;
  round_duration_seconds: number;
  host_username: string;
  host_pin: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SpeedCheckin {
  id: string;
  event_id: string;
  user_id: string;
  gender: string;
  seat_number: number | null;
  is_late_arrival: boolean;
  checked_in_at: string;
}

export interface SpeedRound {
  id: string;
  event_id: string;
  round_number: number;
  status: 'pending' | 'active' | 'voting' | 'completed';
  started_at: string | null;
  ended_at: string | null;
}

export interface SpeedPairing {
  id: string;
  round_id: string;
  event_id: string;
  user1_id: string;
  user2_id: string;
  table_number: number;
  icebreaker_id: string | null;
  icebreaker?: string;
  user1_name?: string;
  user2_name?: string;
}

export interface SpeedVote {
  id: string;
  round_id: string;
  voter_id: string;
  target_id: string;
  compatibility_rating: number;
  notes: string | null;
  wants_match: boolean;
  voted_at: string;
}

// Mixer types
export interface MixerStatement {
  id: string;
  event_id: string;
  user_id: string;
  statement1: string;
  statement2: string;
  statement3: string;
  lie_index: number;
  created_at: string;
}

export interface MixerGuess {
  id: string;
  event_id: string;
  guesser_id: string;
  target_id: string;
  guessed_index: number;
  is_correct: boolean;
  created_at: string;
}

export interface MixerStar {
  id: string;
  event_id: string;
  starrer_id: string;
  starred_id: string;
  created_at: string;
}

// Settings types
export interface UserSettings {
  discovery_radius: number;
  age_min: number;
  age_max: number;
  incognito: boolean;
  incognito_plus: boolean;
  is_premium: boolean;
  custom_latitude: number | null;
  custom_longitude: number | null;
}

// Report types
export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  match_id: string | null;
  reason: 'inappropriate_photos' | 'harassment' | 'fake_profile' | 'spam' | 'underage' | 'other';
  details: string;
  status: 'pending' | 'warned' | 'banned' | 'dismissed';
  admin_note: string;
  created_at: string;
  updated_at: string;
}

// Venue types
export interface Venue {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  latitude: number | null;
  longitude: number | null;
  pin: string | null;
  payout_method: string;
  payout_details: string | null;
  active: boolean;
  created_at: string;
}

// API response types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}