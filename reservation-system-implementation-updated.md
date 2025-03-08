# Implementación de Sistema de Reservas para Peluquería Multicéntrica

## Descripción General

Este documento detalla la implementación de un sistema de reservas para un sitio web de peluquería con cinco centros diferentes, construido con Next.js y Supabase. El sistema permitirá a los clientes realizar reservas online seleccionando el centro de su preferencia, y al personal de la peluquería gestionar estas reservas desde un panel de administración.

## Estructura de Base de Datos (Supabase)

### Tablas Necesarias

1. **locations**
   - `id`: uuid (primary key)
   - `name`: text (nombre del centro)
   - `address`: text (dirección completa)
   - `phone`: text (teléfono de contacto)
   - `email`: text (email del centro)
   - `description`: text (descripción opcional)
   - `image`: text (URL a imagen del centro)
   - `created_at`: timestamp
   - `active`: boolean (para centros activos/inactivos)

2. **services**
   - `id`: uuid (primary key)
   - `name`: text (nombre del servicio)
   - `description`: text (descripción opcional)
   - `duration`: integer (duración en minutos)
   - `price`: decimal (precio del servicio)
   - `created_at`: timestamp
   - `active`: boolean (para desactivar servicios temporalmente)

3. **stylists**
   - `id`: uuid (primary key)
   - `name`: text (nombre del estilista)
   - `bio`: text (biografía corta)
   - `specialties`: text[] (array de especialidades)
   - `profile_img`: text (URL a imagen de perfil)
   - `created_at`: timestamp
   - `active`: boolean (para estilistas activos/inactivos)
   - `location_ids`: uuid[] (array de IDs de centros donde trabaja el estilista)

4. **stylist_services**
   - `id`: uuid (primary key)
   - `stylist_id`: uuid (foreign key a stylists)
   - `service_id`: uuid (foreign key a services)
   - `created_at`: timestamp

5. **working_hours**
   - `id`: uuid (primary key)
   - `stylist_id`: uuid (foreign key a stylists)
   - `location_id`: uuid (foreign key a locations)
   - `day_of_week`: integer (0-6, donde 0 es domingo)
   - `start_time`: time
   - `end_time`: time
   - `created_at`: timestamp

6. **time_off**
   - `id`: uuid (primary key)
   - `stylist_id`: uuid (foreign key a stylists)
   - `location_id`: uuid (foreign key a locations)
   - `start_datetime`: timestamp
   - `end_datetime`: timestamp
   - `reason`: text
   - `created_at`: timestamp

7. **bookings**
   - `id`: uuid (primary key)
   - `customer_name`: text
   - `customer_email`: text
   - `customer_phone`: text
   - `stylist_id`: uuid (foreign key a stylists)
   - `service_id`: uuid (foreign key a services)
   - `location_id`: uuid (foreign key a locations)
   - `booking_date`: date
   - `start_time`: time
   - `end_time`: time
   - `status`: text (enum: 'pending', 'confirmed', 'cancelled', 'completed')
   - `notes`: text
   - `created_at`: timestamp

### Políticas de Seguridad

1. **Para clientes (anónimos o autenticados)**:
   - Lectura de `services`, `stylists`, `stylist_services`, `working_hours`, `locations`
   - Creación de registros en `bookings`
   - Lectura de sus propias reservas (mediante email o teléfono)

2. **Para administradores**:
   - Acceso completo a todas las tablas
   - Modificación de cualquier reserva

## Componentes de la Interfaz

### 1. Módulo de Reserva para Clientes

#### Interfaz de Reserva (`/reserva`)

Crear un flujo en pasos:

1. **Paso 1: Selección de Servicio**
   - Lista de servicios disponibles con duración y precio
   - Cada servicio es seleccionable

2. **Paso 2: Selección de Centro**
   - Mostrar los cinco centros disponibles
   - Incluir información relevante (dirección, foto)
   - Opcionalmente, mostrar un mapa para facilitar la ubicación
   - Filtrar solo centros que ofrecen el servicio seleccionado

3. **Paso 3: Selección de Estilista**
   - Mostrar solo estilistas que:
     - Ofrecen el servicio seleccionado
     - Trabajan en el centro seleccionado
   - Incluir foto y breve bio

4. **Paso 4: Selección de Fecha y Hora**
   - Calendario para selección de fecha
   - Mostrar solo horarios disponibles según:
     - Horario laboral del estilista en el centro seleccionado
     - Reservas existentes
     - Tiempo libre programado
     - Duración del servicio

5. **Paso 5: Información del Cliente**
   - Formulario con:
     - Nombre
     - Email
     - Teléfono (formato para WhatsApp)
     - Campo opcional de notas

6. **Paso 6: Resumen y Confirmación**
   - Mostrar detalles completos de la reserva (incluir centro seleccionado)
   - Botón de confirmación
   - Mensaje de éxito y opción de añadir al calendario

### 2. Panel de Administración (`/admin/reservas`)

#### Vista de Calendario

1. **Calendario principal**
   - Vista diaria, semanal y mensual
   - Visualización por estilista, centro o vista general
   - Codificación por colores según estado de la reserva y centro
   - Filtrado por centro

2. **Funcionalidades de gestión**
   - Añadir reserva manualmente
   - Editar reserva existente (cambiar hora, estilista, centro, etc.)
   - Cancelar reserva
   - Marcar como completada
   - Bloquear horarios (tiempo libre)

#### Vista de Configuración

1. **Gestión de Centros**
   - CRUD completo para centros
   - Activación/desactivación temporal

2. **Gestión de Servicios**
   - CRUD completo para servicios
   - Asignación de servicios a centros (opcional si todos los centros ofrecen los mismos servicios)

3. **Gestión de Estilistas**
   - CRUD completo para estilistas
   - Asignación de estilistas a centros
   - Configuración de horarios laborales por centro
   - Registro de tiempo libre

## Implementación Técnica

### API Routes

1. **Endpoints para Cliente**

   - `GET /api/locations` - Listado de centros
   - `GET /api/services` - Listado de servicios
   - `GET /api/locations?serviceId={id}` - Centros que ofrecen un servicio específico
   - `GET /api/stylists?serviceId={id}&locationId={id}` - Estilistas por servicio y centro
   - `GET /api/availability?stylistId={id}&serviceId={id}&locationId={id}&date={date}` - Verificar disponibilidad
   - `POST /api/bookings` - Crear una reserva

2. **Endpoints para Administración**

   - `GET /api/admin/bookings?date={date}&stylistId={id}&locationId={id}` - Obtener reservas filtradas
   - `POST /api/admin/bookings` - Crear reserva desde admin
   - `PUT /api/admin/bookings/{id}` - Actualizar reserva
   - `DELETE /api/admin/bookings/{id}` - Cancelar reserva
   - `POST /api/admin/time-off` - Registrar tiempo libre para estilista
   - CRUD completo para centros, servicios y estilistas

### Lógica de Negocio

#### Verificación de Disponibilidad

```
Para verificar horarios disponibles:

1. Obtener horario laboral del estilista para la fecha en el centro específico
2. Obtener todas las reservas del estilista para la fecha en ese centro
3. Obtener tiempo libre programado
4. Calcular slots disponibles:
   - Dividir horario laboral en slots según duración del servicio
   - Eliminar slots que se solapan con reservas existentes
   - Eliminar slots que se solapan con tiempo libre
5. Devolver lista de horarios disponibles
```

#### Creación de Reserva

```
Para crear una reserva:

1. Verificar nuevamente disponibilidad en tiempo real
2. Si disponible, crear registro en tabla bookings
3. Calcular hora de finalización (hora inicio + duración)
4. Enviar email de confirmación con detalles del centro
5. Devolver confirmación con ID de reserva
```

### Componentes React Recomendados

1. **Selector de Centro**
   - Componente tipo card con imagen y detalles del centro
   - Opcionalmente usar integración con Google Maps

2. **Selector de Fecha**
   - Usar `react-datepicker` o `@mui/x-date-pickers`

3. **Selector de Hora**
   - Componente personalizado que muestre solo horas disponibles

4. **Calendario de Administración**
   - Usar `react-big-calendar` o `@devexpress/dx-react-scheduler`
   - Incorporar filtrado por centro

## Integraciones Futuras (Fase 2)

### Notificaciones por WhatsApp

1. **Configuración**
   - Cuenta en Meta Developers
   - Configuración de WhatsApp Business API

2. **Tipos de Notificaciones**
   - Confirmación de reserva (incluir centro seleccionado)
   - Recordatorio 24h antes
   - Notificación de cambios
   - Seguimiento post-servicio

3. **Implementación**
   - Crear plantillas de mensajes en Meta Developers
   - Implementar endpoints para envío de mensajes
   - Configurar triggers para envío automático

### Sistema de Valoraciones por Centro

1. **Funcionalidad**
   - Permitir a clientes valorar su experiencia después del servicio
   - Diferenciar valoraciones por centro
   - Mostrar promedio de valoraciones en la página de cada centro

2. **Implementación**
   - Nueva tabla `ratings` en la base de datos
   - Componente de valoración con estrellas
   - Envío de solicitud de valoración post-servicio

## Consideraciones para la Integración con el Sitio Existente

1. **Estilo y Diseño**
   - Adaptar componentes al diseño actual del sitio
   - Usar el mismo sistema de colores y tipografía
   - Mantener consistencia visual entre centros

2. **Navegación**
   - Integrar el botón de "Reservar Ahora" en el menú principal
   - Añadir enlace en footer y call-to-actions
   - Considerar páginas específicas para cada centro

3. **Autenticación**
   - Utilizar el sistema de autenticación existente para el panel admin
   - Verificar políticas de RLS en Supabase
   - Implementar roles específicos por centro si es necesario

## Plan de Implementación

1. **Fase 1: Configuración de Base de Datos**
   - Creación de tablas en Supabase (incluir tabla de centros)
   - Definición de políticas de seguridad
   - Datos iniciales (servicios, estilistas, centros)

2. **Fase 2: API y Lógica de Negocio**
   - Implementación de endpoints
   - Lógica de verificación de disponibilidad por centro
   - Sistema de reservas multicéntrico

3. **Fase 3: UI Cliente**
   - Componentes de selección (incluir selector de centro)
   - Flujo de reserva
   - Validación de formularios

4. **Fase 4: UI Administración**
   - Panel de calendario con filtrado por centro
   - Gestión de reservas
   - Configuración de servicios, estilistas y centros

5. **Fase 5: Pruebas y Refinamiento**
   - Pruebas de usabilidad
   - Optimización de rendimiento
   - Corrección de errores
   - Pruebas específicas para cada centro

6. **Fase 6 (Futuro): Integración WhatsApp**
   - Configuración de API
   - Implementación de notificaciones personalizadas por centro
   - Gestión de respuestas

7. **Fase 7 (Futuro): Sistema de Valoraciones**
   - Implementación de sistema de valoraciones por centro
   - Análisis de satisfacción de clientes
