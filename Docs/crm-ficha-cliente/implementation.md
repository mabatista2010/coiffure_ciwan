# Implementación CRM Ficha Cliente

## Resumen
Implementar una ficha de cliente interna completa en `/admin/crm`, con edición segura, timeline de notas y trazabilidad por usuario.

## Objetivo y alcance
Objetivo:
- Mejorar operación CRM diaria con información estructurada y notas históricas.

Alcance:
- Modelo de datos `customer_profiles` + `customer_notes`.
- Seguridad RLS para acceso solo `admin|employee`.
- APIs internas de lectura/edición.
- UI maestro-detalle (desktop) y detalle full-screen (mobile).

No-objetivos (esta implementación):
- Automatizaciones de marketing.
- Integraciones externas (email/WhatsApp).
- Segmentación avanzada y scoring.

## Decisiones tomadas en esta sesión
1. El detalle principal de cliente NO se abre en modal.
2. Desktop usa layout maestro-detalle (lista + panel derecho editable).
3. Mobile usa detalle en pantalla completa.
4. Modal solo para acciones rápidas (por ejemplo, nueva nota rápida).

## Arquitectura propuesta
1. BD:
- Tabla `customer_profiles` (perfil extendido del cliente).
- Tabla `customer_notes` (historial de notas con autor/fecha).

2. Seguridad:
- RLS activada en ambas tablas.
- Policies por rol interno (`admin|employee`).

3. Backend:
- Endpoints internos admin para perfil y notas.
- Validaciones de payload en servidor.

4. Frontend:
- `/admin/crm` refactorizado a maestro-detalle.
- Guardado de perfil por secciones.
- Timeline de notas con alta rápida.

## Plan por fases

### Fase 1 - DB + Seguridad
Entregables:
1. Migración SQL con tablas `customer_profiles` y `customer_notes`.
2. Índices mínimos (`customer_profile_id`, `created_at`, lookup por cliente).
3. RLS + policies + grants.

Criterios de aceptación:
1. Tablas creadas en Supabase sin errores.
2. Usuarios no autorizados no pueden leer/escribir.
3. `admin|employee` sí pueden operar.

### Fase 2 - API Admin
Entregables:
1. `GET/PUT` perfil de cliente.
2. `GET/POST` notas del cliente.
3. Errores tipados y validaciones.

Criterios de aceptación:
1. CRUD básico de perfil/notas operativo desde API.
2. Validaciones backend activas.

### Fase 3 - UI CRM (detalle en pantalla)
Entregables:
1. Refactor `/admin/crm` a layout maestro-detalle.
2. Formulario editable de ficha.
3. Timeline de notas y acción rápida de alta.

Criterios de aceptación:
1. Click en cliente abre panel de detalle editable (no modal principal).
2. Guardado y feedback visual correctos.

### Fase 4 - Hardening UX/operación
Entregables:
1. Protección frente a cambios no guardados.
2. Mensajes de error por campo y estados de carga.
3. Smoke tests funcionales finales.

Criterios de aceptación:
1. Flujo estable desktop/mobile.
2. Sin regresiones en búsqueda/listado CRM.

## Riesgos y mitigaciones
1. Sobrecarga de campos:
- Mitigación: priorizar campos núcleo en v1.
2. Datos sensibles:
- Mitigación: minimización + RLS estricta + auditoría.
3. Complejidad móvil:
- Mitigación: detalle full-screen por secciones.

## Plan de despliegue / rollout
1. Aplicar migración en entorno objetivo.
2. Desplegar endpoints API.
3. Desplegar UI CRM.
4. Ejecutar smoke tests y revisión manual con usuario admin.

## Definition of Done
1. Ficha extendida editable desde `/admin/crm`.
2. Notas internas con fecha/hora/autor.
3. Seguridad validada por RLS.
4. Flujo maestro-detalle operativo en desktop y full-screen en mobile.
5. Checklist y tests de fases en verde.

## Outcome summary

### Qué se implementó
1. Modelo CRM completo con `customer_profiles` + `customer_notes`, incluyendo seguridad con RLS y acceso para roles internos `admin|employee`.
2. Endpoints internos protegidos para perfil y notas:
   - `GET/PUT /api/admin/crm/customers/:id/profile`
   - `GET/POST /api/admin/crm/customers/:id/notes`
3. UI de `/admin/crm` con patrón maestro-detalle:
   - Lista de clientes como vista principal.
   - Detalle editable del cliente y timeline de notas.
   - Protección de cambios no guardados y feedback de guardado/error.
4. Robustez operativa:
   - Soporte de creación lazy del perfil cuando falta.
   - Reintento con refresco de sesión en llamadas protegidas para reducir fallos intermitentes de auth.
5. Validación funcional registrada en `Docs/qa-crm-playwright.md` (login por rol, lectura/edición, notas y hardening UX).

### Qué se cambió vs plan original
1. La decisión inicial “detalle en pantalla” evolucionó al patrón de panel lateral reutilizable para detalle/edición, manteniendo foco operativo y mejor escalabilidad de UI.
2. Se reforzó la capa de acceso con verificación práctica adicional de comportamiento por rol (`employee` con acceso a CRM y bloqueo de secciones restringidas).
3. Se incorporó hardening adicional de sesión (retry de auth) no explícito en el plan base, para mejorar estabilidad real en producción.

### Pendientes
1. QA manual final del usuario en entorno real para cierre funcional definitivo del pack.
2. Confirmación UX final de microdetalles visuales (densidad, spacing y copy) según feedback de operación diaria.

### Riesgos conocidos post-release
1. Dependencia de calidad de datos históricos (`bookings`) para construir/normalizar `customer_key`.
2. Posibles casos de duplicidad de cliente cuando cambian identificadores de contacto (email/teléfono) sin proceso de merge dedicado.
3. Riesgo de regresión visual en breakpoints tablet/mobile ante futuros cambios del layout CRM sin pruebas de regresión de interfaz.
