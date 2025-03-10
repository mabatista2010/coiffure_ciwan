-- Script para crear tabla de relación entre usuarios y estilistas
-- Ejecutar este script en el Editor SQL de Supabase

-- Crear tabla de relación entre usuarios y estilistas
CREATE TABLE IF NOT EXISTS stylist_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES stylists(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, stylist_id)
);

-- Añadir índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_stylist_users_user_id ON stylist_users(user_id);
CREATE INDEX IF NOT EXISTS idx_stylist_users_stylist_id ON stylist_users(stylist_id);

-- Configurar políticas de seguridad RLS (Row Level Security)
ALTER TABLE stylist_users ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Los usuarios autenticados pueden leer stylist_users"
  ON stylist_users FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir inserción solo a administradores
CREATE POLICY "Solo los administradores pueden insertar en stylist_users"
  ON stylist_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Política para permitir actualización solo a administradores
CREATE POLICY "Solo los administradores pueden actualizar stylist_users"
  ON stylist_users FOR UPDATE
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
CREATE POLICY "Solo los administradores pueden eliminar de stylist_users"
  ON stylist_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  ); 