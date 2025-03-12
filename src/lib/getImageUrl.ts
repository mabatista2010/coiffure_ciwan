import { supabase } from './supabase';

/**
 * Obtiene la URL completa de una imagen, ya sea desde Supabase Storage o desde la carpeta pública
 * @param path Ruta de la imagen
 * @returns URL completa de la imagen
 */
export function getImageUrl(path: string): string {
  // Si la URL ya es completa (comienza con http o https), devolverla tal cual
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si la ruta comienza con una barra, es una imagen local en la carpeta pública
  if (path.startsWith('/')) {
    return path;
  }
  
  // De lo contrario, es una imagen en Supabase Storage
  // Determinar el bucket basado en la ruta
  let bucket = 'fotos_peluqueria';
  
  if (path.startsWith('estilistas/') || path.startsWith('stylists/')) {
    bucket = 'estilistas';
  } else if (path.startsWith('centros/')) {
    bucket = 'centros';
  } else {
    // Por defecto, asumimos que las imágenes de configuración están en hero_images
    bucket = 'hero_images';
  }
  
  // Obtener la URL pública de Supabase Storage
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
} 