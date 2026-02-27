# QA Playwright - CRM Admin

Fecha: 2026-02-27  
Entorno: `http://localhost:3000`  
Ejecutor: Codex + Playwright MCP

## Credenciales usadas
- Admin: `peluqueria@test.com`
- Employee: `empleado@test.com`

## Cambios previos para habilitar pruebas
- [x] Empleado con acceso a `/admin/crm` en `AdminLayout`.
- [x] Enlace `Clients` visible también para empleado en `AdminNav`.

## Checklist ejecución

### A. Login y navegación
- [x] Admin puede iniciar sesión en `/admin`.
- [x] Admin puede abrir `/admin/crm`.
- [x] Employee puede iniciar sesión en `/admin`.
- [x] Employee puede abrir `/admin/crm`.
- [x] Employee sigue sin acceso a rutas admin restringidas (ej: `/admin/user-management`).

### B. CRM - carga de detalle
- [x] Seleccionar cliente desde la lista carga el detalle sin error.
- [x] No aparece error `Impossible de créer le profil client` al abrir detalle.
- [x] Cambiar de cliente y volver no rompe la carga.

### C. CRM - edición de perfil
- [x] Guardar un cambio simple de perfil muestra éxito.
- [x] El cambio persiste tras recarga.

### D. CRM - notas
- [x] Crear nota válida funciona y aparece en timeline.
- [x] Nota nueva queda en primer lugar (orden desc por fecha).
- [x] Nota vacía es rechazada con mensaje.

### E. Hardening UX
- [x] Con cambios sin guardar, al cambiar cliente se muestra confirmación.
- [x] Con cambios sin guardar, al intentar salir/recargar existe protección de pérdida.

## Hallazgos
- Fix aplicado: reintento automático con `refreshSession()` en llamadas CRM protegidas cuando llega `401` (evita fallo intermitente en detalle de cliente).
- Verificado: empleado accede a CRM y sigue bloqueado en `/admin/user-management` (redirección a reservas).
- Corregido: el mensaje de éxito de guardado de perfil se mantiene visible de forma estable (sin perderse por refetch del mismo cliente).

## Resultado final
- Estado: `Completado`
