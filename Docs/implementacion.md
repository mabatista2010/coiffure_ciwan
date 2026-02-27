# Implementación del Sistema de Invitación para Empleados

## Descripción General

Este documento detalla la implementación de un sistema de invitación por email para empleados en la aplicación Coiffure Ciwan. El sistema permitirá que únicamente los administradores puedan añadir nuevos empleados, enviando invitaciones por correo electrónico que permitirán a los empleados establecer sus propias contraseñas y acceder al sistema con permisos predefinidos.

## Arquitectura del Sistema

El sistema se basa en tres componentes principales:

1. **Interfaz de Administración**: Formulario para invitar empleados y asociarlos con estilistas.
2. **API Serverless**: Endpoints que manejan la invitación y gestión de usuarios.
3. **Supabase Auth**: Sistema de autenticación que maneja los emails de invitación.

## Requisitos Técnicos

- Next.js 15 (ya implementado)
- Supabase (ya configurado)
- Acceso a la Service Role Key de Supabase
- Variables de entorno configuradas correctamente

## Componentes a Implementar

### 1. Tablas en la Base de Datos

Ya tenemos implementadas:
- `user_roles`: Almacena los roles de los usuarios (admin/employee)
- `stylist_users`: Relaciona usuarios con estilistas

### 2. Página de Invitación de Empleados

Crear una nueva página en el panel administrativo:
- Ruta: `/admin/invite-employee`
- Acceso: Solo para administradores
- Funcionalidad: Formulario para enviar invitaciones

### 3. API Serverless

Crear un nuevo endpoint API:
- Ruta: `/api/invite-employee`
- Funcionalidad: Procesar invitaciones y manejar autenticación
- Seguridad: Solo accesible para administradores

### 4. Componentes Frontend

Desarrollar:
- Formulario de invitación
- Lista de invitaciones pendientes
- Estado de invitaciones

## Proceso Detallado

### Desde la Perspectiva del Administrador:

1. **Envío de Invitación**:
   - El administrador navega a la página de invitación
   - Ingresa el email del empleado
   - Selecciona el estilista asociado
   - Elige el rol (normalmente "employee")
   - Envía la invitación

2. **Seguimiento**:
   - El administrador puede ver las invitaciones pendientes
   - Puede reenviar invitaciones si es necesario
   - Puede revocar invitaciones no utilizadas

### Desde la Perspectiva del Empleado:

1. **Recepción de Invitación**:
   - El empleado recibe un email con un enlace seguro
   - El email explica que ha sido invitado a la plataforma

2. **Configuración de Cuenta**:
   - Hace clic en el enlace del email
   - Establece su contraseña
   - Es redirigido al panel con sus permisos ya configurados

## Pasos de Implementación

### 1. Configuración de Supabase Auth

1. Verificar las plantillas de email en Supabase para personalizarlas
2. Asegurar que la configuración de SMTP está correcta
3. Probar la funcionalidad de invitación mediante la API

### 2. Desarrollo de API Serverless

1. Crear endpoint con las siguientes funciones:
   - Verificar que el solicitante es administrador
   - Crear usuario en Supabase Auth
   - Asignar rol en la tabla `user_roles`
   - Asociar con estilista en la tabla `stylist_users`
   - Enviar email de invitación

### 3. Desarrollo de Interfaz de Usuario

1. Crear la página de invitación con:
   - Formulario para email y selección de estilista
   - Mensajes de éxito/error
   - Lista de invitaciones pendientes

### 4. Personalización de Emails

1. Configurar las plantillas de email en Supabase para que incluyan:
   - Logo y colores de Coiffure Ciwan
   - Instrucciones claras en español
   - Información de contacto en caso de problemas

## Consideraciones de Seguridad

- La Service Role Key debe estar protegida como variable de entorno
- Implementar rate limiting en la API para prevenir abusos
- Asegurar que los enlaces de invitación tienen tiempo de expiración
- Verificar que solo los administradores pueden enviar invitaciones
- Implementar auditoría de todas las acciones de creación de usuarios

## Integración con el Sistema Existente

El sistema de invitación se integrará con:

1. **Sistema de Roles**: Utilizará el sistema ya implementado en `userRoles.ts`
2. **Panel de Administración**: Añadirá una nueva opción en el menú de navegación
3. **Gestión de Estilistas**: Permitirá seleccionar estilistas de la lista existente

## Pruebas y Validación

Antes de la implementación final, se recomienda:

1. Probar el flujo completo en ambiente de desarrollo
2. Verificar que los emails llegan correctamente
3. Comprobar la correcta asignación de roles
4. Validar la experiencia del usuario en diferentes dispositivos

## Siguiente Paso

Comenzar con la implementación del endpoint API serverless para manejar las invitaciones, ya que es el componente central del sistema. 