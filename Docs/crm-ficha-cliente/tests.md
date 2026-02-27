# Tests - CRM Ficha Cliente

## Estrategia por fase

### Fase 1 - DB + Seguridad
1. Verificar creación de tablas/índices.
2. Validar RLS con queries representativas.
3. Validar permisos por rol.

### Fase 2 - API Admin
1. Probar endpoints con payload válido.
2. Probar payload inválido y códigos de error.
3. Probar acceso sin auth / sin rol.

### Fase 3 - UI CRM
1. Test funcional desktop maestro-detalle.
2. Test funcional mobile detalle full-screen.
3. Test de creación/visualización de notas.

### Fase 4 - Hardening
1. Test de cambios no guardados.
2. Test de regresión en listado/búsqueda CRM.
3. Test de estados vacíos y errores.

## Casos borde
1. Cliente sin ficha previa (creación lazy al abrir detalle).
2. Nota vacía o con longitud excesiva.
3. Fecha de nacimiento inválida o futura.
4. Concurrencia de edición en dos pestañas.
5. Cliente con datos parciales (muchos null).

## Datos de prueba
1. Cliente con reservas históricas y sin notas.
2. Cliente con múltiples notas y cambios de perfil.
3. Cliente nuevo sin historial.

## Comandos
1. `npm run lint`
2. Pruebas manuales en `npm run dev` sobre `/admin/crm`.

## Criterio para avanzar de fase
1. Todas las tareas de la fase marcadas.
2. Gate de tests de fase marcado como pasado.
3. Sin errores críticos abiertos.

## Resultados ejecutados
1. `npm run lint`: ejecutado y en verde para el alcance del pack.
2. `npm run build`: ejecutado y en verde durante el cierre técnico de implementación.
3. Smoke auth API CRM:
   - Validado `401 missing_token`.
   - Validado `401 invalid_token`.
4. QA funcional con Playwright documentado en `Docs/qa-crm-playwright.md`:
   - Login y acceso por rol (`admin` y `employee`) a `/admin/crm`.
   - Lectura/carga de detalle de cliente sin error.
   - Edición de perfil con persistencia.
   - Alta y orden de notas (descendente por fecha).
   - Hardening UX (protección por cambios no guardados).

## Pendiente por ejecutar / confirmar
1. QA manual final del usuario en entorno operativo real para cierre funcional definitivo.
2. Verificación manual específica de regresiones en búsqueda/orden bajo carga de datos real.
