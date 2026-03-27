# Estrategia de Tests - Stylists Excepciones UI

## Enfoque
1. Validar por fases con gates.
2. Priorizar robustez de disponibilidad real (motor SQL) sobre heurísticas de frontend.
3. Probar caso límite de cierre regular del centro (`location_hours`).

## Casos obligatorios
1. Varias `plages` personalizadas en un mismo día (sin solape).
2. CRUD de `time_off` con categorías.
3. CRUD de `location_closures` (día completo y parcial).
4. Caso borde: centro cierra 12:00, servicio 30 min, slot 11:45 no debe estar disponible.
5. Paridad create/availability para slots cerca del cierre.
6. Regresión en `/admin/reservations/nueva` y `/admin?section=stylists`.

## Evidencias (ejecución completada 2026-02-27)
1. Build & lint:
   - `npm run lint`: PASS.
   - `npm run build`: PASS.
2. Migración de guard de `location_hours`:
   - `migrations/20260227_reservas_v2_location_hours_guard.sql` presente en código.
   - Aplicada en Supabase objetivo `tvdwepumtrrjpkvnitpw` como versión `20260227210129` (`reservas_v2_location_hours_guard_20260227`).
3. Smoke `/admin?section=stylists`:
   - Panel lateral abre/cierra correctamente en desktop y móvil.
   - Edición de horario base estable sin regresiones visibles.
4. Fase B (plages múltiples):
   - Guardado de múltiples franjas por día/centro: PASS.
   - Solapes bloqueados con validación visible: `Les plages personnalisées ne doivent pas se chevaucher`.
5. Fase C (`time_off`) desde stylists:
   - `POST /api/admin/schedule/time-off`: `201`.
   - `PUT /api/admin/schedule/time-off/:id`: `200`.
   - `DELETE /api/admin/schedule/time-off/:id`: `200`.
6. Fase D (`location_closures`) desde stylists:
   - `POST /api/admin/schedule/location-closures`: `201`.
   - `PUT /api/admin/schedule/location-closures/:id`: `200`.
   - `DELETE /api/admin/schedule/location-closures/:id`: `200`.
7. Fase E (robustez de motor + caso borde):
   - `/admin/reservations/nueva` no ofrece `11:45` para servicio de 30 min cuando el cierre efectivo deja fuera ese rango.
   - `GET /api/reservation/availability` y `POST /api/reservation/create` se mantienen coherentes ante slots límite fuera de reglas (rechazo de creación con código de negocio).
8. Hardening UI detectado durante QA:
   - Ajuste de z-index en `src/components/ui/dialog.tsx` para permitir modales anidados sobre `AdminSidePanel` (evita bloqueo de clic en CRUD de excepciones/cierres).

## Actualización de cierre (2026-03-03)
1. Validaciones ejecutadas durante el cierre documental:
   - `npm run lint -- --file src/app/admin/home/page.tsx --file src/components/admin/ui/SectionHeader.tsx`: PASS.
2. Qué queda por ejecutar:
   - QA/UAT manual final del usuario en flujo completo de negocio.
   - Confirmación del usuario para limpieza de puntero activo.
