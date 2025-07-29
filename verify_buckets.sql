-- Script para verificar y crear buckets en Supabase
-- Ejecutar este script en el Editor SQL de Supabase

-- Verificar y crear los buckets necesarios
DO $$
BEGIN
  -- Bucket fotos_peluqueria
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'fotos_peluqueria') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('fotos_peluqueria', 'fotos_peluqueria', false);
    RAISE NOTICE 'Bucket fotos_peluqueria creado';
  ELSE
    RAISE NOTICE 'Bucket fotos_peluqueria ya existe';
  END IF;

  -- Bucket estilistas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'estilistas') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('estilistas', 'estilistas', false);
    RAISE NOTICE 'Bucket estilistas creado';
  ELSE
    RAISE NOTICE 'Bucket estilistas ya existe';
  END IF;

  -- Bucket stylists (alias para estilistas)
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'stylists') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('stylists', 'stylists', false);
    RAISE NOTICE 'Bucket stylists creado';
  ELSE
    RAISE NOTICE 'Bucket stylists ya existe';
  END IF;

  -- Bucket centros
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'centros') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('centros', 'centros', false);
    RAISE NOTICE 'Bucket centros creado';
  ELSE
    RAISE NOTICE 'Bucket centros ya existe';
  END IF;

  -- Bucket hero_images
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'hero_images') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('hero_images', 'hero_images', false);
    RAISE NOTICE 'Bucket hero_images creado';
  ELSE
    RAISE NOTICE 'Bucket hero_images ya existe';
  END IF;
END
$$;

-- Políticas para bucket fotos_peluqueria
-- Eliminar políticas existentes si es necesario
DROP POLICY IF EXISTS "Permitir acceso de lectura a todos para fotos_peluqueria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos para usuarios autenticados en fotos_peluqueria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización para usuarios autenticados en fotos_peluqueria" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación para usuarios autenticados en fotos_peluqueria" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Permitir acceso de lectura a todos para fotos_peluqueria" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'fotos_peluqueria');

-- Políticas para bucket hero_images
-- Eliminar políticas existentes si es necesario
DROP POLICY IF EXISTS "Permitir acceso de lectura a todos para hero_images" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos para usuarios autenticados en hero_images" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización para usuarios autenticados en hero_images" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación para usuarios autenticados en hero_images" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Permitir acceso de lectura a todos para hero_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en hero_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en hero_images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en hero_images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hero_images');

-- Políticas para bucket estilistas
-- Eliminar políticas existentes si es necesario
DROP POLICY IF EXISTS "Permitir acceso de lectura a todos para estilistas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos para usuarios autenticados en estilistas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización para usuarios autenticados en estilistas" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación para usuarios autenticados en estilistas" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Permitir acceso de lectura a todos para estilistas" ON storage.objects
  FOR SELECT USING (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en estilistas" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en estilistas" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en estilistas" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'estilistas');

-- Políticas para bucket stylists
-- Eliminar políticas existentes si es necesario
DROP POLICY IF EXISTS "Permitir acceso de lectura a todos para stylists" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos para usuarios autenticados en stylists" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización para usuarios autenticados en stylists" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación para usuarios autenticados en stylists" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Permitir acceso de lectura a todos para stylists" ON storage.objects
  FOR SELECT USING (bucket_id = 'stylists');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en stylists" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stylists');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en stylists" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'stylists');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en stylists" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'stylists');

-- Políticas para bucket centros
-- Eliminar políticas existentes si es necesario
DROP POLICY IF EXISTS "Permitir acceso de lectura a todos para centros" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos para usuarios autenticados en centros" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización para usuarios autenticados en centros" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación para usuarios autenticados en centros" ON storage.objects;

-- Crear nuevas políticas
CREATE POLICY "Permitir acceso de lectura a todos para centros" ON storage.objects
  FOR SELECT USING (bucket_id = 'centros');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en centros" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'centros');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en centros" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'centros');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en centros" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'centros');

-- Verificar que los buckets existan
SELECT id, name, owner, created_at, updated_at, public
FROM storage.buckets
WHERE name IN ('fotos_peluqueria', 'estilistas', 'stylists', 'centros', 'hero_images'); 