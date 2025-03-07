-- Crear tabla para configuraciones
CREATE TABLE IF NOT EXISTS configuracion (
  id BIGSERIAL PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en la tabla
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Crear políticas para permitir lectura pública
CREATE POLICY "Permitir lectura pública de configuración" 
ON configuracion FOR SELECT 
TO anon
USING (true);

-- Crear políticas para permitir gestión solo a usuarios autenticados
CREATE POLICY "Permitir gestión de configuración a usuarios autenticados" 
ON configuracion FOR ALL 
TO authenticated
USING (true);

-- Insertar configuraciones iniciales para las imágenes del hero
INSERT INTO configuracion (clave, valor, descripcion)
VALUES 
('hero_image_desktop', '/hero-background-desktop.jpg', 'Imagen de fondo para el hero en versión escritorio'),
('hero_image_mobile', '/hero-background-mobile.jpg', 'Imagen de fondo para el hero en versión móvil')
ON CONFLICT (clave) 
DO UPDATE SET 
  valor = EXCLUDED.valor,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW(); 