-- Script para verificar y solucionar problemas con horarios de trabajo de estilistas
-- Este script solucionará el problema de disponibilidad de estilistas

-- 1. Primero, verificamos si hay estilistas sin horarios configurados
WITH stylist_locations AS (
  SELECT 
    s.id AS stylist_id, 
    s.name AS stylist_name,
    unnest(s.location_ids) AS location_id
  FROM stylists s
),
location_days AS (
  SELECT 
    sl.stylist_id,
    sl.stylist_name, 
    sl.location_id,
    generate_series(0, 6) AS day_of_week
  FROM stylist_locations sl
),
missing_schedules AS (
  SELECT 
    ld.stylist_id,
    ld.stylist_name,
    ld.location_id,
    l.name AS location_name,
    ld.day_of_week
  FROM location_days ld
  LEFT JOIN working_hours wh ON 
    wh.stylist_id = ld.stylist_id AND 
    wh.location_id = ld.location_id AND 
    wh.day_of_week = ld.day_of_week
  JOIN locations l ON l.id = ld.location_id
  WHERE wh.id IS NULL
)
SELECT * FROM missing_schedules;

-- 2. Insertar horarios de trabajo para las combinaciones faltantes
-- Ejecuta esta sentencia después de verificar las combinaciones faltantes
INSERT INTO working_hours (
  id, 
  stylist_id, 
  location_id, 
  day_of_week, 
  start_time, 
  end_time, 
  created_at
)
WITH stylist_locations AS (
  SELECT 
    s.id AS stylist_id,
    unnest(s.location_ids) AS location_id
  FROM stylists s
),
location_days AS (
  SELECT 
    sl.stylist_id, 
    sl.location_id,
    generate_series(0, 6) AS day_of_week
  FROM stylist_locations sl
),
missing_schedules AS (
  SELECT 
    ld.stylist_id,
    ld.location_id,
    ld.day_of_week
  FROM location_days ld
  LEFT JOIN working_hours wh ON 
    wh.stylist_id = ld.stylist_id AND 
    wh.location_id = ld.location_id AND 
    wh.day_of_week = ld.day_of_week
  WHERE wh.id IS NULL
)
SELECT 
  gen_random_uuid() as id,
  ms.stylist_id,
  ms.location_id,
  ms.day_of_week,
  -- Horario predeterminado: 9am - 6pm
  '09:00:00' as start_time,
  '18:00:00' as end_time,
  now() as created_at
FROM missing_schedules ms;

-- 3. Verifica que se hayan creado los horarios correctamente
SELECT 
  s.name AS stylist_name,
  l.name AS location_name,
  wh.day_of_week,
  wh.start_time,
  wh.end_time
FROM working_hours wh
JOIN stylists s ON s.id = wh.stylist_id
JOIN locations l ON l.id = wh.location_id
ORDER BY stylist_name, location_name, day_of_week;

-- Nota: Ejecuta este script en la consola SQL de Supabase para resolver el problema.
-- 1. Primero ejecuta solo la primera consulta para verificar qué registros faltan
-- 2. Si hay registros faltantes, ejecuta la segunda consulta para insertar los horarios predeterminados
-- 3. Finalmente, ejecuta la tercera consulta para verificar que todos los horarios estén correctamente configurados
