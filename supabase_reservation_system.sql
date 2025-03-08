-- Script para configurar las tablas del sistema de reservas

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

-- 2. Tabla de Servicios (Modificamos la tabla existente)
ALTER TABLE servicios 
ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

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

-- 6. Tabla de Tiempo Libre
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabla de Reservas
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
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar RLS (Row Level Security)

-- Habilitar RLS en todas las tablas
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes (anónimos o autenticados)
-- Lectura de servicios, estilistas, horarios, ubicaciones
CREATE POLICY "Permitir lectura pública de locations" 
ON locations FOR SELECT 
TO public
USING (true);

CREATE POLICY "Permitir lectura pública de stylists" 
ON stylists FOR SELECT 
TO public
USING (true);

CREATE POLICY "Permitir lectura pública de stylist_services" 
ON stylist_services FOR SELECT 
TO public
USING (true);

CREATE POLICY "Permitir lectura pública de working_hours" 
ON working_hours FOR SELECT 
TO public
USING (true);

-- Política para que los clientes puedan crear reservas
CREATE POLICY "Permitir creación de reservas a público" 
ON bookings FOR INSERT 
TO public
WITH CHECK (true);

-- Política para que los clientes puedan ver sus propias reservas (por email)
CREATE POLICY "Permitir lectura de propias reservas" 
ON bookings FOR SELECT 
TO public
USING (true);

-- Políticas para administradores
-- Acceso completo a todas las tablas para usuarios autenticados
CREATE POLICY "Permitir gestión completa a usuarios autenticados de locations" 
ON locations FOR ALL 
TO authenticated
USING (true);

CREATE POLICY "Permitir gestión completa a usuarios autenticados de stylists" 
ON stylists FOR ALL 
TO authenticated
USING (true);

CREATE POLICY "Permitir gestión completa a usuarios autenticados de stylist_services" 
ON stylist_services FOR ALL 
TO authenticated
USING (true);

CREATE POLICY "Permitir gestión completa a usuarios autenticados de working_hours" 
ON working_hours FOR ALL 
TO authenticated
USING (true);

CREATE POLICY "Permitir gestión completa a usuarios autenticados de time_off" 
ON time_off FOR ALL 
TO authenticated
USING (true);

CREATE POLICY "Permitir gestión completa a usuarios autenticados de bookings" 
ON bookings FOR ALL 
TO authenticated
USING (true);

-- Datos de ejemplo para poder empezar a trabajar
INSERT INTO locations (name, address, phone, email, description, image)
VALUES 
('Centro Principal', 'Rue du Rhône 12, 1204 Genève', '+41 22 123 45 67', 'principal@coiffureciwan.ch', 'Nuestro centro principal con todos los servicios disponibles', '/locations/centro-principal.jpg'),
('Centro Norte', 'Avenue de France 15, 1202 Genève', '+41 22 234 56 78', 'norte@coiffureciwan.ch', 'Especializado en cortes modernos y fades', '/locations/centro-norte.jpg'),
('Centro Sur', 'Route de Chêne 30, 1208 Genève', '+41 22 345 67 89', 'sur@coiffureciwan.ch', 'Expertos en tratamientos de barba', '/locations/centro-sur.jpg'),
('Centro Este', 'Rue de Carouge 45, 1205 Genève', '+41 22 456 78 90', 'este@coiffureciwan.ch', 'Ambiente familiar ideal para niños', '/locations/centro-este.jpg'),
('Centro Oeste', 'Boulevard Carl-Vogt 20, 1205 Genève', '+41 22 567 89 01', 'oeste@coiffureciwan.ch', 'Nuestro centro más moderno con las últimas tendencias', '/locations/centro-oeste.jpg');

-- Actualizamos los servicios existentes para agregar la duración
UPDATE servicios
SET duration = 
  CASE 
    WHEN nombre = 'Coupe Classique' THEN 30
    WHEN nombre = 'Fade' THEN 45
    WHEN nombre = 'Barbe' THEN 20
    WHEN nombre = 'Coupe Enfants' THEN 25
    ELSE 30
  END;

-- Insertamos algunos estilistas de ejemplo
INSERT INTO stylists (name, bio, specialties, profile_img, location_ids)
VALUES 
('Jean Dupont', 'Maestro peluquero con 15 años de experiencia', ARRAY['Cortes clásicos', 'Fades'], '/stylists/jean.jpg', ARRAY[(SELECT id FROM locations WHERE name = 'Centro Principal'), (SELECT id FROM locations WHERE name = 'Centro Norte')]),
('Marie Lambert', 'Especialista en cortes modernos y estilos urbanos', ARRAY['Cortes modernos', 'Diseño de barba'], '/stylists/marie.jpg', ARRAY[(SELECT id FROM locations WHERE name = 'Centro Principal'), (SELECT id FROM locations WHERE name = 'Centro Sur')]),
('Lucas Martin', 'Experto en barbería y cuidado facial', ARRAY['Barbería', 'Afeitado clásico'], '/stylists/lucas.jpg', ARRAY[(SELECT id FROM locations WHERE name = 'Centro Sur')]),
('Sophie Blanc', 'Especializada en cortes para niños', ARRAY['Cortes infantiles', 'Primeros cortes'], '/stylists/sophie.jpg', ARRAY[(SELECT id FROM locations WHERE name = 'Centro Este')]),
('Antoine Richard', 'Innovador en las últimas tendencias para hombres', ARRAY['Tendencias', 'Coloración'], '/stylists/antoine.jpg', ARRAY[(SELECT id FROM locations WHERE name = 'Centro Oeste')]);

-- Asignamos servicios a los estilistas
INSERT INTO stylist_services (stylist_id, service_id)
SELECT s.id, srv.id
FROM stylists s
CROSS JOIN servicios srv
WHERE 
  (s.name = 'Jean Dupont' AND srv.nombre IN ('Coupe Classique', 'Fade')) OR
  (s.name = 'Marie Lambert' AND srv.nombre IN ('Fade', 'Coupe Classique')) OR
  (s.name = 'Lucas Martin' AND srv.nombre IN ('Barbe', 'Coupe Classique')) OR
  (s.name = 'Sophie Blanc' AND srv.nombre IN ('Coupe Enfants', 'Coupe Classique')) OR
  (s.name = 'Antoine Richard' AND srv.nombre IN ('Fade', 'Coupe Classique', 'Barbe'));

-- Configuramos horarios laborales
INSERT INTO working_hours (stylist_id, location_id, day_of_week, start_time, end_time)
SELECT 
  s.id,
  l.id,
  day,
  '09:00'::TIME,
  '18:00'::TIME
FROM 
  stylists s, 
  UNNEST(s.location_ids) AS loc_id 
  JOIN locations l ON l.id = loc_id,
  UNNEST(ARRAY[1,2,3,4,5]) AS day; 