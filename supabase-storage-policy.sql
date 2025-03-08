-- Políticas para el bucket "stylists"
-- Eliminar políticas existentes si es necesario
BEGIN;

-- Política para permitir lectura pública (cualquiera puede ver las imágenes)
CREATE POLICY "Imágenes de Estilistas - Lectura Pública" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'stylists');

-- Política para permitir que solo los usuarios autenticados suban archivos
CREATE POLICY "Imágenes de Estilistas - Solo Administradores Pueden Insertar" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'stylists');

-- Política para permitir que solo los usuarios autenticados actualicen archivos
CREATE POLICY "Imágenes de Estilistas - Solo Administradores Pueden Actualizar" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'stylists');

-- Política para permitir que solo los usuarios autenticados eliminen archivos
CREATE POLICY "Imágenes de Estilistas - Solo Administradores Pueden Eliminar" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'stylists');

COMMIT;

-- Nota: Estas políticas deben ejecutarse en la consola SQL de Supabase
-- 1. Inicia sesión en tu proyecto de Supabase
-- 2. Ve a SQL Editor
-- 3. Pega este script y ejecútalo
