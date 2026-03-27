import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para las tablas de Supabase
export type Service = {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen_url: string;
  duration: number;
  active?: boolean;
  slug?: string;
  group_id?: number;
  subgroup_id?: number | null;
  sort_order?: number;
  landing_featured?: boolean;
  landing_sort_order?: number | null;
  updated_at?: string;
};

export type GalleryImage = {
  id: number;
  descripcion: string;
  imagen_url: string;
  fecha: string;
};

// Nuevos tipos para el sistema de reservas
export type Location = {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description?: string;
  image?: string;
  created_at?: string;
  active?: boolean;
};

export type Stylist = {
  id: string;
  name: string;
  bio?: string;
  specialties?: string[];
  profile_img?: string;
  created_at?: string;
  active?: boolean;
  location_ids?: string[];
};

export type StylistService = {
  id: string;
  stylist_id: string;
  service_id: number;
  created_at?: string;
};

export type WorkingHour = {
  id: string;
  stylist_id: string;
  location_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at?: string;
};

export type LocationDailySchedule = {
  id: string;
  location_id: string;
  day_of_week: number;
  is_closed: boolean;
  created_at?: string;
  updated_at?: string;
};

export type TimeOff = {
  id: string;
  stylist_id: string;
  location_id: string;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
  created_at?: string;
};

export type Booking = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  stylist_id: string;
  service_id: number;
  location_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'needs_replan' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
};

// Tipo para la disponibilidad (usado en la API)
export type AvailabilitySlot = {
  time: string;
  available: boolean;
  reasonCode?: string | null;
};

// Tipo para el CRM de clientes
export type ClientCRM = {
  customer_key: string;
  email: string;
  name: string;
  phone: string;
  total_visits: number;
  last_visit_date: string;
  first_visit_date: string;
  total_spent: number;
  favorite_location?: Location;
  favorite_stylist?: Stylist;
  favorite_service?: Service;
  visits_by_location: Record<string, number>;
  visits_by_stylist: Record<string, number>;
  visits_by_service: Record<string, number>;
  bookings: Booking[];
};

export type CustomerProfile = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  birth_date: string | null;
  marital_status: string | null;
  has_children: boolean | null;
  hobbies: string | null;
  occupation: string | null;
  preferred_contact_channel: string | null;
  marketing_consent: boolean;
  internal_notes_summary: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

export type CustomerNote = {
  id: string;
  customer_profile_id: string;
  note: string;
  note_type: 'general' | 'follow_up' | 'incident' | 'preference';
  created_at: string;
  created_by: string;
};
