-- Configurar políticas para el bucket "fotos peluqueria"

-- Política para permitir lectura pública (SELECT)
CREATE POLICY "Permitir lectura pública de imágenes" 
ON storage.objects FOR SELECT 
TO public
USING (bucket_id = 'fotos peluqueria');

-- Política para permitir inserción a usuarios autenticados (INSERT)
CREATE POLICY "Permitir subida de imágenes a usuarios autenticados" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'fotos peluqueria');

-- Política para permitir actualización a usuarios autenticados (UPDATE)
CREATE POLICY "Permitir actualización de imágenes a usuarios autenticados" 
ON storage.objects FOR UPDATE 
TO authenticated
USING (bucket_id = 'fotos peluqueria');

-- Política para permitir eliminación a usuarios autenticados (DELETE)
CREATE POLICY "Permitir eliminación de imágenes a usuarios autenticados" 
ON storage.objects FOR DELETE 
TO authenticated
USING (bucket_id = 'fotos peluqueria'); 