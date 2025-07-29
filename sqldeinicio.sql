-- Script de creación de estructura para Coiffure Ciwan
-- Este script recrea toda la estructura de la base de datos incluyendo tablas, relaciones,
-- políticas de seguridad, buckets de almacenamiento y triggers

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Secuencias
CREATE SEQUENCE IF NOT EXISTS configuracion_id_seq;
CREATE SEQUENCE IF NOT EXISTS imagenes_galeria_id_seq;
CREATE SEQUENCE IF NOT EXISTS servicios_id_seq;

-- Tablas sin dependencias
-- Tabla locations
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  description TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

-- Tabla servicios
CREATE TABLE IF NOT EXISTS servicios (
  id BIGINT PRIMARY KEY DEFAULT nextval('servicios_id_seq'),
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio NUMERIC NOT NULL,
  imagen_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  duration INTEGER DEFAULT 30,
  active BOOLEAN DEFAULT true
);

-- Tabla stylists
CREATE TABLE IF NOT EXISTS stylists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  bio TEXT,
  specialties TEXT[],
  profile_img TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true,
  location_ids UUID[]
);

-- Tabla configuracion
CREATE TABLE IF NOT EXISTS configuracion (
  id BIGINT PRIMARY KEY DEFAULT nextval('configuracion_id_seq'),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla imagenes_galeria
CREATE TABLE IF NOT EXISTS imagenes_galeria (
  id BIGINT PRIMARY KEY DEFAULT nextval('imagenes_galeria_id_seq'),
  descripcion TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tablas con dependencias de primer nivel
-- Tabla location_hours
CREATE TABLE IF NOT EXISTS location_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID REFERENCES locations(id),
  day_of_week INTEGER NOT NULL,
  slot_number INTEGER NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, day_of_week, slot_number)
);

-- Tabla stylist_services
CREATE TABLE IF NOT EXISTS stylist_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id),
  service_id BIGINT REFERENCES servicios(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla working_hours
CREATE TABLE IF NOT EXISTS working_hours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id),
  location_id UUID REFERENCES locations(id),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla time_off
CREATE TABLE IF NOT EXISTS time_off (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stylist_id UUID REFERENCES stylists(id),
  location_id UUID REFERENCES locations(id),
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  role VARCHAR NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tablas con múltiples dependencias
-- Tabla bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  stylist_id UUID REFERENCES stylists(id),
  service_id BIGINT REFERENCES servicios(id),
  location_id UUID REFERENCES locations(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla stylist_users
CREATE TABLE IF NOT EXISTS stylist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stylist_id UUID NOT NULL REFERENCES stylists(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stylist_id, user_id)
);

-- Función para manejar nuevos usuarios
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Por defecto, los nuevos usuarios se crean como empleados
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Habilitar Row Level Security en todas las tablas
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagenes_galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE working_hours ENABLE ROW LEVEL SECURITY;

-- Políticas para bookings
CREATE POLICY "Permitir creación de reservas a público" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir gestión completa a usuarios autenticados de bookings" ON bookings FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura de propias reservas" ON bookings FOR SELECT USING (true);

-- Políticas para configuracion
CREATE POLICY "Permitir gestión de configuración a usuarios autenticados" ON configuracion FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de configuración" ON configuracion FOR SELECT USING (true);

-- Políticas para imagenes_galeria
CREATE POLICY "Permitir gestión de imágenes a usuarios autenticados" ON imagenes_galeria FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de imágenes" ON imagenes_galeria FOR SELECT USING (true);

-- Políticas para locations
CREATE POLICY "Permitir gestión completa a usuarios autenticados de locations" ON locations FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de locations" ON locations FOR SELECT USING (true);

-- Políticas para servicios
CREATE POLICY "Permitir gestión de servicios a usuarios autenticados" ON servicios FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de servicios" ON servicios FOR SELECT USING (true);

-- Políticas para stylist_services
CREATE POLICY "Permitir gestión completa a usuarios autenticados de stylist_s" ON stylist_services FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de stylist_services" ON stylist_services FOR SELECT USING (true);

-- Políticas para stylist_users
CREATE POLICY "Los usuarios autenticados pueden leer stylist_users" ON stylist_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo los administradores pueden actualizar stylist_users" ON stylist_users FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
));
CREATE POLICY "Solo los administradores pueden eliminar de stylist_users" ON stylist_users FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
));
CREATE POLICY "Solo los administradores pueden insertar en stylist_users" ON stylist_users FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.id = auth.uid() AND user_roles.role = 'admin'
));

-- Políticas para stylists
CREATE POLICY "Permitir gestión completa a usuarios autenticados de stylists" ON stylists FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de stylists" ON stylists FOR SELECT USING (true);

-- Políticas para time_off
CREATE POLICY "Permitir gestión completa a usuarios autenticados de time_off" ON time_off FOR ALL TO authenticated USING (true);

-- Políticas para user_roles
CREATE POLICY "Los usuarios autenticados pueden leer user_roles" ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Solo los administradores pueden actualizar user_roles" ON user_roles FOR UPDATE TO authenticated USING (EXISTS (
  SELECT 1 FROM user_roles user_roles_1 WHERE user_roles_1.id = auth.uid() AND user_roles_1.role = 'admin'
)) WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles user_roles_1 WHERE user_roles_1.id = auth.uid() AND user_roles_1.role = 'admin'
));
CREATE POLICY "Solo los administradores pueden eliminar de user_roles" ON user_roles FOR DELETE TO authenticated USING (EXISTS (
  SELECT 1 FROM user_roles user_roles_1 WHERE user_roles_1.id = auth.uid() AND user_roles_1.role = 'admin'
));
CREATE POLICY "Solo los administradores pueden insertar en user_roles" ON user_roles FOR INSERT TO authenticated WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles user_roles_1 WHERE user_roles_1.id = auth.uid() AND user_roles_1.role = 'admin'
));

-- Políticas para working_hours
CREATE POLICY "Permitir gestión completa a usuarios autenticados de working_h" ON working_hours FOR ALL TO authenticated USING (true);
CREATE POLICY "Permitir lectura pública de working_hours" ON working_hours FOR SELECT USING (true);

-- Crear buckets de almacenamiento
INSERT INTO storage.buckets (id, name, public) VALUES ('centros', 'centros', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('estilistas', 'estilistas', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos_peluqueria', 'fotos_peluqueria', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('hero_images', 'hero_images', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stylists', 'stylists', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para buckets de almacenamiento
-- Políticas para bucket 'centros'
CREATE POLICY "Permitir acceso de lectura a todos para centros" ON storage.objects
  FOR SELECT USING (bucket_id = 'centros');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en centros" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'centros');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en centros" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'centros');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en centros" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'centros');

-- Políticas para bucket 'estilistas'
CREATE POLICY "Permitir acceso de lectura a todos para estilistas" ON storage.objects
  FOR SELECT USING (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en estilistas" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en estilistas" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'estilistas');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en estilistas" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'estilistas');

-- Políticas para bucket 'fotos_peluqueria'
CREATE POLICY "Permitir acceso de lectura a todos para fotos_peluqueria" ON storage.objects
  FOR SELECT USING (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'fotos_peluqueria');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en fotos_peluqueria" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'fotos_peluqueria');

-- Políticas para bucket 'hero_images'
CREATE POLICY "Permitir acceso de lectura a todos para hero_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en hero_images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en hero_images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'hero_images');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en hero_images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'hero_images');

-- Políticas para bucket 'stylists'
CREATE POLICY "Permitir acceso de lectura a todos para stylists" ON storage.objects
  FOR SELECT USING (bucket_id = 'stylists');
  
CREATE POLICY "Permitir subida de archivos para usuarios autenticados en stylists" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stylists');
  
CREATE POLICY "Permitir actualización para usuarios autenticados en stylists" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'stylists');
  
CREATE POLICY "Permitir eliminación para usuarios autenticados en stylists" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'stylists');

-- Configuración del trigger para nuevos usuarios
DO $$
BEGIN
  -- Verificamos si el trigger ya existe antes de crearlo
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;

-- Nota: El trigger update_objects_updated_at en storage.objects 
-- viene configurado por defecto en Supabase y no es necesario crearlo manualmente.