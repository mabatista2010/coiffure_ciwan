# Guía de Implementación: Adaptación de la Aplicación Coiffure Ciwan para Nuevos Clientes

Esta guía detalla el proceso para adaptar esta aplicación para un nuevo cliente de peluquería, manteniendo la funcionalidad administrativa mientras se personaliza la landing page.

## Índice

1. [Preparación Inicial](#1-preparación-inicial)
2. [Configuración de Supabase](#2-configuración-de-supabase)
3. [Configuración del Proyecto](#3-configuración-del-proyecto)
4. [Personalización de la Landing Page](#4-personalización-de-la-landing-page)
5. [Configuración de Datos Iniciales](#5-configuración-de-datos-iniciales)
6. [Pruebas](#6-pruebas)
7. [Despliegue](#7-despliegue)

## 1. Preparación Inicial

### Clonar el Repositorio
```bash
git clone https://github.com/username/coiffure-ciwan.git nuevo-cliente
cd nuevo-cliente
```

### Instalar Dependencias
```bash
npm install
```

## 2. Configuración de Supabase

### Crear un Nuevo Proyecto en Supabase
1. Accede a [Supabase](https://supabase.com/) y crea una nueva cuenta si aún no tienes una
2. Crea un nuevo proyecto para el cliente
3. Anota la URL y la clave anónima del proyecto

### Creación de Tablas
Ejecuta los siguientes scripts SQL en el editor SQL de Supabase:

#### Script Base de Datos
Ejecuta el archivo `supabase_reservation_system.sql` que contiene:
- Tabla locations (centros)
- Tabla stylists (estilistas)
- Tabla stylist_services (relación estilista-servicio)
- Tabla working_hours (horarios de trabajo)
- Tabla location_hours (horarios de centros)
- Tabla time_off (tiempo libre)
- Tabla bookings (reservas)
- Tabla servicios (servicios)
- Tabla imagenes_galeria (imágenes)
- Tabla configuracion (configuración)

#### Tablas Adicionales
Ejecuta los siguientes scripts:
- `location_hours_table.sql` - Para los horarios múltiples por día de cada centro
- `supabase-working-hours-fix.sql` - Para ajustes en la tabla de horarios

### Creación de Buckets de Almacenamiento
Crea los siguientes buckets de almacenamiento:
- `centros` - Para imágenes de los centros
- `estilistas` - Para imágenes de los estilistas
- `stylists` - Alias alternativo para imágenes de estilistas
- `fotos_peluqueria` - Para imágenes generales

### Configuración de Políticas de Seguridad
Ejecuta los scripts:
- `supabase_storage_policies.sql` - Políticas para los buckets de almacenamiento
- `storage_policies.sql` - Políticas adicionales para seguridad

## 3. Configuración del Proyecto

### Variables de Entorno
Crea un archivo `.env.local` con:
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima
```

### Personalizar Metadatos
Modifica `src/app/layout.tsx` para actualizar:
- Título del sitio
- Descripción
- Palabras clave
- Información OpenGraph

## 4. Personalización de la Landing Page

### Análisis del Diseño Requerido
Antes de comenzar la personalización, analiza el archivo `setup-guide/Design_Landing_Page.md` que contiene las especificaciones detalladas de cómo debe ser la landing page para este cliente específico. Este archivo incluye:
- Paleta de colores específica
- Estructura de secciones deseada
- Estilo y tono de contenido
- Referencias de diseño visual
- Cualquier requisito especial para la landing page

Prioriza las indicaciones de este archivo ya que contiene los requisitos específicos del cliente.

### Sistema de Estilos
Modifica `src/styles/theme.css` para actualizar:
- `--color-primary`: Color principal (actualmente #FFD700)
- `--color-secondary`: Color secundario (actualmente #212121)
- `--color-accent`: Color acentuado (actualmente #000000)
- `--color-coral`: Color coral para títulos (actualmente #E76F51)
- Fuentes y otras variables según sea necesario

### Componentes a Personalizar
Los siguientes componentes deben ser modificados para reflejar la marca y contenido del nuevo cliente:

- **src/components/Navbar.tsx** - Navegación principal
- **src/components/Hero.tsx** - Sección principal de la landing page
- **src/components/Services.tsx** - Servicios ofrecidos
- **src/components/Gallery.tsx** - Galería de imágenes
- **src/components/Location.tsx** - Información de ubicaciones
- **src/components/Footer.tsx** - Pie de página con información de contacto

### Recursos Estáticos
Reemplaza los recursos en `/public/` con las imágenes y archivos del nuevo cliente:
- Logo
- Favicon
- Imágenes hero
- Otras imágenes estáticas

## 5. Configuración de Datos Iniciales

### Configuración Inicial desde el Panel de Administración
Una vez que la aplicación esté en ejecución:

1. Inicia sesión en el panel de administración (configura un usuario admin en Supabase Auth)
2. Configura los servicios
3. Configura los centros con sus horarios
4. Configura los estilistas con sus servicios y horarios
5. Sube imágenes para la galería

## 6. Pruebas

### Ejecución Local
```bash
npm run dev
```

### Verificación de Funcionalidades
Prueba las siguientes funcionalidades:
- Visualización correcta de la landing page
- Sistema de reservas
- Panel administrativo:
  - Gestión de reservas
  - Gestión de estilistas
  - Gestión de centros
  - CRM
  - Estadísticas

## 7. Despliegue

### Vercel (Recomendado)
1. Crea una cuenta en [Vercel](https://vercel.com/)
2. Conecta tu repositorio
3. Configura las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Despliega

### Otras Opciones de Despliegue
Consulta el archivo `DEPLOY.md` para instrucciones sobre otros proveedores.

## Consideraciones Adicionales

### Mantenimiento
- Mantén actualizado el código base con los últimos cambios del repositorio original
- Realiza copias de seguridad regulares de la base de datos

### Usuarios Administrativos
Para crear usuarios administrativos:
1. Ve a la sección de autenticación en Supabase
2. Crea usuarios manualmente o configura proveedores de autenticación

### Soporte Técnico
Para preguntas o problemas:
- Revisa la documentación del repositorio original
- Contacta al equipo de desarrollo

---

## Referencia Técnica

### Estructura de la Base de Datos

#### Tabla: locations (centros)
- `id` (UUID, PK): Identificador único
- `name` (text): Nombre del centro
- `address` (text): Dirección física
- `phone` (text): Número de teléfono
- `email` (text): Correo electrónico
- `description` (text, opcional): Descripción
- `image` (text, opcional): URL de la imagen
- `created_at` (timestamp): Fecha de creación
- `active` (boolean): Estado activo

#### Tabla: location_hours (horarios de centros)
- `id` (UUID, PK): Identificador único
- `location_id` (UUID, FK): Referencia a locations
- `day_of_week` (integer): Día de la semana (0-6)
- `slot_number` (integer): Número de franja horaria
- `start_time` (time): Hora de inicio
- `end_time` (time): Hora de finalización
- `created_at` (timestamp): Fecha de creación

#### Tabla: stylists (estilistas)
- `id` (UUID, PK): Identificador único
- `name` (text): Nombre del estilista
- `bio` (text, opcional): Biografía
- `specialties` (text[]): Especialidades
- `profile_img` (text, opcional): URL de la imagen de perfil
- `created_at` (timestamp): Fecha de creación
- `active` (boolean): Estado activo
- `location_ids` (UUID[]): Centros donde trabaja

#### Tabla: working_hours (horarios de trabajo)
- `id` (UUID, PK): Identificador único
- `stylist_id` (UUID, FK): Referencia a stylists
- `location_id` (UUID, FK): Referencia a locations
- `day_of_week` (integer): Día de la semana (0-6)
- `start_time` (time): Hora de inicio
- `end_time` (time): Hora de finalización
- `created_at` (timestamp): Fecha de creación

#### Tabla: servicios (servicios de peluquería)
- `id` (bigint, PK): Identificador único
- `nombre` (text): Nombre del servicio
- `descripcion` (text): Descripción detallada
- `precio` (numeric): Precio del servicio
- `imagen_url` (text): URL de la imagen
- `created_at` (timestamp): Fecha de creación
- `duration` (integer): Duración en minutos
- `active` (boolean): Indica si el servicio está activo

#### Tabla: stylist_services (relación estilista-servicio)
- `id` (UUID, PK): Identificador único
- `stylist_id` (UUID, FK): Referencia a stylists
- `service_id` (bigint, FK): Referencia a servicios
- `created_at` (timestamp): Fecha de creación

#### Tabla: bookings (reservas)
- `id` (UUID, PK): Identificador único
- `customer_name` (text): Nombre del cliente
- `customer_email` (text): Email del cliente
- `customer_phone` (text): Teléfono del cliente
- `stylist_id` (UUID, FK): Referencia al estilista
- `service_id` (bigint, FK): Referencia al servicio
- `location_id` (UUID, FK): Referencia al centro
- `booking_date` (date): Fecha de la reserva
- `start_time` (time): Hora de inicio
- `end_time` (time): Hora de finalización
- `status` (text): Estado ('pending', 'confirmed', 'cancelled', 'completed')
- `notes` (text, opcional): Notas adicionales
- `created_at` (timestamp): Fecha de creación

#### Tabla: time_off (tiempo libre)
- `id` (UUID, PK): Identificador único
- `stylist_id` (UUID, FK): Referencia al estilista
- `location_id` (UUID, FK): Referencia al centro
- `start_datetime` (timestamp): Inicio del período libre
- `end_datetime` (timestamp): Fin del período libre
- `reason` (text, opcional): Motivo del tiempo libre
- `created_at` (timestamp): Fecha de creación

#### Tabla: imagenes_galeria (imágenes de la galería)
- `id` (bigint, PK): Identificador único
- `descripcion` (text): Descripción de la imagen
- `imagen_url` (text): URL de la imagen
- `fecha` (date): Fecha de la imagen
- `created_at` (timestamp): Fecha de creación

#### Tabla: configuracion (configuración general)
- `id` (bigint, PK): Identificador único
- `clave` (text): Clave de configuración
- `valor` (text): Valor de configuración
- `descripcion` (text, opcional): Descripción
- `created_at` (timestamp): Fecha de creación
- `updated_at` (timestamp): Fecha de última actualización

### Buckets de Almacenamiento
- `centros`: Imágenes de los centros
- `estilistas`: Imágenes de los estilistas
- `stylists`: Alias alternativo para imágenes de estilistas
- `fotos_peluqueria`: Imágenes generales del sitio

### Relaciones Importantes
- Un centro puede tener múltiples horarios por día (mañana/tarde)
- Un estilista puede trabajar en múltiples centros
- Un estilista puede ofrecer múltiples servicios
- Un estilista tiene horarios de trabajo específicos por centro y día
- Las reservas están vinculadas a un estilista, servicio y centro específicos

### Inicialización de Datos Importantes

Para el correcto funcionamiento de la aplicación, se requiere configurar:

1. **Servicios básicos**: Crear al menos 3-5 servicios comunes para peluquería
2. **Al menos un centro**: Con sus horarios de apertura para cada día
3. **Al menos un estilista**: Con sus servicios asignados y horarios de trabajo
4. **Configuración general**: Valores clave en la tabla configuracion:
   - `hero_title`: Título principal del hero
   - `hero_subtitle`: Subtítulo del hero
   - `hero_image`: URL de la imagen del hero
   - `contact_phone`: Teléfono de contacto
   - `contact_email`: Email de contacto
   - `social_instagram`: URL de Instagram (opcional)
   - `social_facebook`: URL de Facebook (opcional) 