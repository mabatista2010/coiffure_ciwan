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
};

export type GalleryImage = {
  id: number;
  descripcion: string;
  imagen_url: string;
  fecha: string;
}; 