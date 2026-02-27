# Plan de Implementación - CRM Ficha Cliente Completa

## Objetivo
Implementar una ficha de cliente interna, editable y robusta en `/admin/crm`, con historial de notas, trazabilidad y seguridad (RLS + auditoría), orientada a operación diaria del salón.

Este documento es propuesta de implementación. No aplica cambios por sí mismo.

## Decisión UX Cerrada
1. El detalle de cliente se mostrará en pantalla (layout maestro-detalle), no en modal como flujo principal.
2. Desktop: lista de clientes a la izquierda + detalle editable a la derecha.
3. Mobile: detalle en pantalla completa (navegación dentro de `/admin/crm`).
4. Modales solo para acciones rápidas y acotadas: por ejemplo, "Nueva nota rápida".

## Por qué esta decisión es más robusta
1. Evita pérdida de cambios por cierre accidental de modal.
2. Escala mejor con formularios largos y múltiples secciones.
3. Facilita guardado parcial por bloques y validación progresiva.
4. Permite estado URL (`?customer=<id>`) para continuidad de trabajo.
5. Es más mantenible cuando crezcan campos, notas y futuras automatizaciones.

## Alcance Funcional (v1)
1. Ficha cliente extendida:
   - `fecha_nacimiento`
   - `estado_civil`
   - `tiene_hijos`
   - `hobbies`
   - `ocupacion`
   - `canal_preferido_contacto`
   - `consentimiento_marketing`
   - `observaciones_internas`
2. Timeline de notas:
   - creación de notas internas con fecha/hora y autor
   - visualización ordenada por recencia
3. Edición segura:
   - solo `admin|employee`
   - validación servidor en updates

## Modelo de Datos Propuesto

### Tabla `customer_profiles`
- `id uuid pk` (o FK 1:1 al cliente base si ya existe tabla consolidada de clientes)
- `customer_phone text` (si no hay FK clara, usar referencia estable temporal)
- `birth_date date null`
- `marital_status text null`
- `has_children boolean null`
- `hobbies text null`
- `occupation text null`
- `preferred_contact_channel text null`
- `marketing_consent boolean not null default false`
- `internal_notes_summary text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `updated_by uuid null`

### Tabla `customer_notes`
- `id uuid pk default gen_random_uuid()`
- `customer_profile_id uuid not null references customer_profiles(id) on delete cascade`
- `note text not null`
- `note_type text not null default 'general'`
- `created_at timestamptz not null default now()`
- `created_by uuid not null`

## Reglas de Seguridad
1. RLS activada en `customer_profiles` y `customer_notes`.
2. Lectura/escritura solo para usuarios autenticados con rol `admin|employee`.
3. Sin acceso público ni anónimo.
4. Campos sensibles solo visibles en admin.
5. Auditoría básica: `updated_by`, `created_by`.

## API/Backend Propuesto
1. `GET /api/admin/crm/customers/:id/profile`
2. `PUT /api/admin/crm/customers/:id/profile`
3. `GET /api/admin/crm/customers/:id/notes`
4. `POST /api/admin/crm/customers/:id/notes`
5. Validación de payloads en servidor (tipos, longitud máxima, fechas válidas).

## UI Propuesta

### Desktop
1. Columna izquierda:
   - búsqueda
   - listado de clientes
   - metadatos rápidos (última visita, total reservas)
2. Panel derecho:
   - bloque "Datos personales"
   - bloque "Preferencias"
   - bloque "Notas internas"
   - acciones: Guardar, Nueva nota rápida

### Mobile
1. Lista de clientes.
2. Al seleccionar cliente: vista detalle completa (no modal pequeño).
3. Botón flotante o acción fija para "Nueva nota".

## Fases de Implementación

### Fase 1 - DB + Seguridad
1. Migración SQL de tablas `customer_profiles` y `customer_notes`.
2. Índices mínimos por `customer_profile_id`, `created_at`.
3. Policies RLS y grants por rol.

### Fase 2 - API Admin
1. Endpoints internos para perfil y notas.
2. Validaciones y control de errores tipados.
3. Registro básico de auditoría (`updated_by`, `created_by`).

### Fase 3 - UI CRM (Detalle en pantalla)
1. Refactor de `/admin/crm` a layout maestro-detalle.
2. Formulario editable por secciones con guardado.
3. Timeline de notas y creación rápida.

### Fase 4 - Pulido Operativo
1. Mensajes de guardado y errores por campo.
2. Prevención de pérdida de cambios no guardados.
3. Filtros y orden de notas.

## Criterios de Aceptación
1. Al clicar cliente en `/admin/crm`, se abre detalle en panel/pantalla, no modal principal.
2. Se pueden editar campos de ficha y guardar sin salir de pantalla.
3. Se pueden añadir notas con timestamp y autor.
4. RLS impide acceso a usuarios no autorizados.
5. Sin regresiones en búsqueda/listado de clientes.

## Riesgos y Mitigación
1. Riesgo: sobrecarga de campos desde día 1.
   - Mitigación: lanzar v1 con campos núcleo y expandir por fases.
2. Riesgo: datos sensibles mal gestionados.
   - Mitigación: minimización de datos + RLS estricta + auditoría.
3. Riesgo: UX compleja en móvil.
   - Mitigación: detalle full-screen con secciones plegables.
