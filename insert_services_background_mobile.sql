-- Insertar o actualizar la configuración del fondo de servicios para móvil
INSERT INTO configuracion (clave, valor, descripcion)
VALUES 
('services_background_mobile', 'https://tvdwepumtrrjpkvnitpw.supabase.co/storage/v1/object/public/hero_images/d3acd0b1-8306-45b7-85d', 'Imagen de fondo para la sección de servicios con efecto parallax (versión móvil)')
ON CONFLICT (clave) 
DO UPDATE SET 
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW();

-- Verificar que el registro se ha insertado correctamente
SELECT * FROM configuracion WHERE clave = 'services_background_mobile'; 