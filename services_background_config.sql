-- Insertar o actualizar la configuración del fondo de servicios
INSERT INTO configuracion (clave, valor, descripcion)
VALUES 
('services_background', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop', 'Imagen de fondo para la sección de servicios con efecto parallax')
ON CONFLICT (clave) 
DO UPDATE SET 
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW(); 