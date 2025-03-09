-- Script de configuración para nuevo proyecto Coiffure Ciwan
-- Este script debe ejecutarse en el editor SQL de Supabase para configurar la base de datos inicial

-- Habilitar la extensión UUID si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Ubicaciones (Centros)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  description TEXT,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

-- 2. Tabla de Servicios
CREATE TABLE IF NOT EXISTS servicios (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  imagen_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT TRUE
);

-- 3. Tabla de Estilistas
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[],
  profile_img TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  location_ids UUID[]
);

-- 4. Tabla de relación Estilista-Servicio
CREATE TABLE IF NOT EXISTS stylist_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  service_id BIGINT REFERENCES servicios(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabla de Horarios Laborales
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabla de Horarios de Centros
CREATE TABLE IF NOT EXISTS location_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Tiempo Libre
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabla de Reservas
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  stylist_id UUID REFERENCES stylists(id) ON DELETE SET NULL,
  service_id BIGINT REFERENCES servicios(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabla de Imágenes de Galería
CREATE TABLE IF NOT EXISTS imagenes_galeria (
  id BIGSERIAL PRIMARY KEY,
  descripcion TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Tabla de Configuración
CREATE TABLE IF NOT EXISTS configuracion (
  id BIGSERIAL PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear buckets de almacenamiento
-- NOTA: Los buckets deben crearse manualmente desde la interfaz de Supabase o con la API
-- Los buckets necesarios son:
-- - centros
-- - estilistas
-- - stylists
-- - fotos_peluqueria

-- Políticas de seguridad recomendadas (RLS) - Estas deben adaptarse según necesidades específicas

-- Permitir selección pública para servicios, centros, estilistas, horarios y galería
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para servicios" ON servicios FOR SELECT USING (true);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para centros" ON locations FOR SELECT USING (true);

ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para estilistas" ON stylists FOR SELECT USING (true);

ALTER TABLE location_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para horarios de centros" ON location_hours FOR SELECT USING (true);

ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para horarios laborales" ON working_hours FOR SELECT USING (true);

ALTER TABLE imagenes_galeria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir selección pública para galería" ON imagenes_galeria FOR SELECT USING (true);

-- Permitir inserción de reservas para todos
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir inserción de reservas" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir selección pública para reservas" ON bookings FOR SELECT USING (true);

-- Datos iniciales necesarios
-- Insertar algunos valores de configuración básicos
INSERT INTO configuracion (clave, valor, descripcion) VALUES
('hero_title', 'Nom du Salon de Coiffure', 'Titre principal sur la page d''accueil'),
('hero_subtitle', 'Le meilleur salon de coiffure pour hommes et enfants', 'Sous-titre sur la page d''accueil'),
('contact_phone', '+33 1 23 45 67 89', 'Numéro de téléphone principal'),
('contact_email', 'contact@example.com', 'Email de contact principal');

-- IMPORTANTE: Después de ejecutar este script, crear un usuario administrativo en Supabase Authentication 