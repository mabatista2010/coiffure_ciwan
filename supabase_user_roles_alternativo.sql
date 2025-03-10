-- PASO 1: Crear la tabla y asignar el administrador inicial
-- Ejecutar esta parte primero

-- Crear la tabla de roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Añadir un índice para búsquedas rápidas por role
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Insertar el usuario existente como admin
-- Reemplaza 'peluqueria@test.com' con el correo del dueño del negocio
INSERT INTO user_roles (id, role)
SELECT id, 'admin' FROM auth.users
WHERE email = 'peluqueria@test.com'
ON CONFLICT (id) DO NOTHING;

-- Verificar que el administrador se haya creado correctamente
SELECT * FROM user_roles;

-- PASO 2: Configurar las políticas RLS y el trigger
-- Ejecutar esta parte después de verificar que el administrador existe

-- Configurar políticas de seguridad RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Los usuarios autenticados pueden leer user_roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción solo a administradores
CREATE POLICY "Solo los administradores pueden insertar en user_roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para permitir actualización solo a administradores
CREATE POLICY "Solo los administradores pueden actualizar user_roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para permitir eliminación solo a administradores
CREATE POLICY "Solo los administradores pueden eliminar de user_roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Función para manejar la creación automática de roles para nuevos usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Por defecto, los nuevos usuarios se crean como empleados
  INSERT INTO public.user_roles (id, role)
  VALUES (NEW.id, 'employee');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para ejecutar la función cuando se crea un nuevo usuario
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 