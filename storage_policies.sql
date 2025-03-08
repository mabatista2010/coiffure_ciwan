-- Asegurarse de que el bucket centros existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM storage.buckets
        WHERE name = 'centros'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('centros', 'centros', true);
    ELSE
        UPDATE storage.buckets
        SET public = true
        WHERE name = 'centros';
    END IF;
END $$;

-- Eliminar políticas existentes para el bucket centros si existen
DROP POLICY IF EXISTS "Permitir acceso público de lectura al bucket centros" ON storage.objects;
DROP POLICY IF EXISTS "Permitir inserción de imágenes en centros para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de imágenes en centros para usuarios autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de imágenes en centros para usuarios autenticados" ON storage.objects;

-- Política de acceso público para lectura
CREATE POLICY "Permitir acceso público de lectura al bucket centros"
ON storage.objects FOR SELECT
USING (bucket_id = 'centros');

-- Política para permitir que usuarios autenticados suban imágenes
CREATE POLICY "Permitir inserción de imágenes en centros para usuarios autenticados"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'centros'
    AND auth.role() = 'authenticated'
);

-- Política para permitir que usuarios autenticados actualicen imágenes
CREATE POLICY "Permitir actualización de imágenes en centros para usuarios autenticados"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'centros'
    AND auth.role() = 'authenticated'
);

-- Política para permitir que usuarios autenticados eliminen imágenes
CREATE POLICY "Permitir eliminación de imágenes en centros para usuarios autenticados"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'centros'
    AND auth.role() = 'authenticated'
);

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Las políticas para el bucket centros han sido configuradas correctamente.';
END $$; 