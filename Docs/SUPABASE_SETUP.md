# Guía de Configuración de Supabase para Coiffure Ciwan

Esta guía te ayudará a configurar correctamente Supabase para la landing page de Coiffure Ciwan.

## 1. Crear una cuenta en Supabase

1. Ve a [Supabase](https://supabase.com/) y regístrate o inicia sesión.
2. Haz clic en "New Project" y asigna un nombre (ej. "coiffure-ciwan").
3. Establece una contraseña segura para la base de datos.
4. Selecciona una región cercana a tus usuarios.
5. Haz clic en "Create new project".

## 2. Configurar las tablas de la base de datos

### Tabla de Servicios

1. En el panel de Supabase, ve a "Table editor".
2. Haz clic en "Create a new table".
3. Configura la tabla `servicios` con las siguientes columnas:
   - `id`: int8 (primary key, identity)
   - `nombre`: text (not null)
   - `descripcion`: text (not null)
   - `precio`: numeric (not null)
   - `imagen_url`: text (not null)
4. Haz clic en "Save" para crear la tabla.

### Tabla de Imágenes de Galería

1. Haz clic en "Create a new table" nuevamente.
2. Configura la tabla `imagenes_galeria` con las siguientes columnas:
   - `id`: int8 (primary key, identity)
   - `descripcion`: text (not null)
   - `imagen_url`: text (not null)
   - `fecha`: date (not null)
3. Haz clic en "Save" para crear la tabla.

## 3. Configurar el Storage para imágenes

1. Ve a "Storage" en el menú lateral.
2. Haz clic en "Create a new bucket".
3. Nombra el bucket como `coiffure-ciwan`.
4. En "RLS Policies", configura una política pública para que los usuarios puedan ver las imágenes:
   - Haz clic en "Add policies".
   - Selecciona la política predefinida "Give anon users access to all files".
   - Confirma la creación de la política.

## 4. Configurar la autenticación para el panel de administración

1. Ve a "Authentication" > "Providers".
2. Asegúrate de que "Email" esté habilitado.
3. Para desarrollo local, puedes desactivar la confirmación por correo electrónico.
4. Ve a "Users" y haz clic en "Add User".
5. Agrega un usuario administrador con correo electrónico y contraseña.

## 5. Obtener las credenciales de API

1. Ve a "Project Settings" > "API".
2. Copia el "Project URL" y el "anon public" key.
3. Pega estas credenciales en el archivo `.env.local` de tu proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=tu-url-del-proyecto
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
```

## 6. Poblar las tablas con datos iniciales

### Servicios de ejemplo

Agrega algunos servicios de ejemplo ejecutando las siguientes consultas SQL en "SQL Editor":

```sql
INSERT INTO servicios (nombre, descripcion, precio, imagen_url)
VALUES 
('Corte Clásico', 'Corte tradicional con tijeras y detallado con navaja', 15, '/services/corte-clasico.jpg'),
('Fade', 'Degradado perfecto con diferentes niveles de longitud', 18, '/services/fade.jpg'),
('Barba', 'Recorte y perfilado de barba con toalla caliente', 12, '/services/barba.jpg'),
('Corte Niños', 'Cortes especiales para los más pequeños', 13, '/services/corte-ninos.jpg');
```

### Imágenes de galería de ejemplo

```sql
INSERT INTO imagenes_galeria (descripcion, imagen_url, fecha)
VALUES 
('Fade moderno con líneas', '/gallery/corte1.jpg', '2023-11-05'),
('Corte texturizado', '/gallery/corte2.jpg', '2023-10-28'),
('Degradado con peinado', '/gallery/corte3.jpg', '2023-10-15'),
('Corte con barba perfilada', '/gallery/corte4.jpg', '2023-10-08'),
('Estilo clásico con raya lateral', '/gallery/corte5.jpg', '2023-09-30');
```

## 7. Probar la conexión

Una vez configurado, inicia tu aplicación Next.js y verifica que los datos se estén cargando correctamente desde Supabase. Si hay problemas, revisa la consola del navegador para ver errores específicos.

## Recursos adicionales

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Guía de autenticación de Supabase](https://supabase.com/docs/guides/auth)
- [Guía de almacenamiento de Supabase](https://supabase.com/docs/guides/storage) 