-- Insertar el registro de services_background en la tabla configuracion
INSERT INTO configuracion (clave, valor, descripcion)
VALUES ('services_background', 'https://tvdwepumtrrjpkvnitpw.supabase.co/storage/v1/object/public/hero_images/d3acd0b1-8306-45b7-85d', 'Imagen de fondo para la sección de servicios con efecto parallax')
ON CONFLICT (clave) 
DO UPDATE SET 
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW();

-- Verificar que el registro se ha insertado correctamente
SELECT * FROM configuracion WHERE clave = 'services_background'; 