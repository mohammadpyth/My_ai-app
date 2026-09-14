import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  address: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  client_id: string;
  case_number: string;
  title: string;
  court: string | null;
  case_type: string | null;
  opponent: string | null;
  description: string | null;
  status: 'open' | 'closed' | 'adjourned';
  filed_date: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
}

export interface Session {
  id: string;
  case_id: string;
  session_date: string;
  session_time: string | null;
  location: string | null;
  notes: string | null;
  attended: boolean;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  case?: Case;
}

export interface Payment {
  id: string;
  case_id: string;
  total_fee: number;
  paid_amount: number;
  payment_date: string | null;
  payment_method: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  case?: Case;
}
