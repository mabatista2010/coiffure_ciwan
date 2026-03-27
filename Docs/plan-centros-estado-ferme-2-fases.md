# Plan de Implementacion: Estado "Ferme" por Dia en Centros (2 Fases)

Fecha: 2026-03-02  
Proyecto: Steel & Blade 
Ambito: Admin de centros, reserva, disponibilidad y consistencia de horarios

## 1. Objetivo

Implementar un estado explicito de apertura/cierre por dia para cada centro (`Ouvert` / `Ferme`) sin romper el sistema actual, y evolucionarlo a una arquitectura robusta y transaccional.

## 2. Diagnostico Actual (resumen)

Hoy el sistema funciona con una regla implicita:
- Dia cerrado = no existen franjas en `location_hours` para ese dia.

Problemas detectados:
1. En la UI de admin de centros no existe toggle explicito `Ferme` por dia.
2. El formulario obliga horas por inputs `required`, aunque negocio necesite dias cerrados.
3. Guardado de horarios no transaccional (delete + insert), con riesgo de dejar el centro sin horarios si falla el insert.
4. Validaciones debiles en cliente para franjas (orden/solapes).
5. Escritura directa desde cliente en Supabase (logica distribuida, menor control).

## 3. Principio de Escalabilidad (clave)

Desde la Fase 1, el frontend debe adoptar un contrato estable por dia:

```ts
type DaySchedule = {
  dayOfWeek: number;      // 0..6
  isClosed: boolean;      // true => Ferme
  slots: Array<{ start: string; end: string }>;
};
```

Con este contrato, la migracion a Fase 2 (modelo robusto) no obliga a rehacer UI.

---

## 4. Fase 1 (MVP Escalable)

Objetivo: habilitar `Ferme` por dia, mejorar UX/validacion y mantener compatibilidad con el modelo actual.

### 4.1 Cambios funcionales

1. En admin de centros, cada dia tendra:
- Toggle `Ouvert` / `Ferme`.
- Si `Ferme`, no se exigen horas y no se muestran/usan slots activos.
- Si `Ouvert`, al menos una franja valida.

2. Persistencia compatible (sin migracion de esquema):
- `isClosed = true` => no escribir filas en `location_hours` para ese dia.
- `isClosed = false` => escribir las franjas del dia.

3. Mensajeria en panel:
- Errores y confirmaciones visibles dentro del panel lateral (no solo consola).

### 4.2 Endurecimiento tecnico minimo

1. Validaciones en cliente:
- Formato `HH:mm`.
- `start < end`.
- No solape entre franjas del mismo dia.

2. Recomendado en Fase 1:
- Crear endpoint server para guardar horarios de centro (aunque internamente mantenga modelo actual).
- Evitar escritura directa desde cliente para centralizar reglas.

### 4.3 Archivos objetivo (orientativo)

- `src/app/admin/location-management.tsx`
- `src/app/api/admin/...` (nuevo endpoint de horarios de centros, recomendado)
- `src/components/Location.tsx` (sin cambios funcionales grandes; opcional solo limpieza)

### 4.4 Criterios de aceptacion Fase 1

1. Un admin puede marcar cualquier dia como `Ferme`.
2. Guardar centro con varios dias cerrados funciona sin hacks.
3. No se puede guardar un dia abierto con franjas invalidas o solapadas.
4. Reserva no ofrece slots en dias cerrados (comportamiento actual se mantiene).
5. Mensajes de error aparecen dentro del panel de edicion.

### 4.5 Riesgo residual Fase 1

Aunque sea funcional, el modelo sigue implicito en BD (cerrado = ausencia de filas), y el guardado puede seguir siendo fragil si no se implementa endpoint transaccional.

---

## 5. Fase 2 (Robusta)

Objetivo: pasar a modelo explicito, transaccional y auditable, reduciendo riesgo operativo y deuda tecnica.

### 5.1 Modelo de datos robusto

Crear tabla explicita de estado diario por centro (nombre sugerido):

`location_daily_schedule`
- `id` uuid pk
- `location_id` uuid fk
- `day_of_week` int (0..6)
- `is_closed` boolean not null
- `notes` text null
- `updated_at`, `updated_by`
- unique `(location_id, day_of_week)`

Mantener `location_hours` para franjas horarias (solo cuando `is_closed = false`).

### 5.2 Reglas de integridad

1. Constraints/checks:
- `day_of_week` valido.
- En `location_hours`, validar `start_time < end_time`.

2. Reglas de consistencia:
- Si `is_closed = true`, no debe haber slots en `location_hours` para ese dia.
- Si `is_closed = false`, puede haber 1..N slots no solapados.

3. Validacion central:
- Todas las reglas se validan en servidor antes de persistir.

### 5.3 API robusta transaccional

Implementar endpoint(s) server para upsert de horario semanal de centro:
- Recibe `DaySchedule[]`.
- Aplica en transaccion:
  - upsert estado diario
  - replace/merge de slots
  - rollback ante cualquier error

### 5.4 Motor de disponibilidad

Actualizar SQL/RPC de disponibilidad para usar estado explicito:
1. Si dia `is_closed = true` => rechazar con codigo equivalente a `outside_location_hours` o nuevo codigo semantico.
2. Si abierto => validar contra franjas de `location_hours`.

### 5.5 Migracion de datos (sin corte)

1. Migracion aditiva:
- Crear nueva tabla `location_daily_schedule`.
- Backfill:
  - Si un dia tiene slots en `location_hours` => `is_closed=false`.
  - Si no tiene => `is_closed=true`.

2. Etapa de doble lectura/escritura (temporal):
- API escribe y lee ambos modelos.

3. Conmutacion:
- Motor y UI leen modelo nuevo.

4. Limpieza:
- Retirar logica implicita antigua cuando sea estable.

### 5.6 Criterios de aceptacion Fase 2

1. Estado diario explicito persistido y consultable.
2. Guardado semanal de centro es atomico (sin estados intermedios corruptos).
3. Disponibilidad respeta estado diario + franjas sin regresiones.
4. Errores de validacion son claros (dia, franja y motivo).
5. Sin degradacion perceptible de rendimiento.

---

## 6. Plan de Pruebas

### 6.1 QA funcional (manual)

1. Marcar Domingo `Ferme` y guardar:
- Reabrir panel, estado persiste.
- No aparecen slots ese lunes en reserva.

2. Dia abierto con 2 franjas validas:
- Guardado OK.
- Slots disponibles solo dentro de esas franjas.

3. Franja invalida (`start >= end`) o solape:
- Guardado bloqueado con mensaje claro.

4. Cambios mixtos (abrir/cerrar varios dias):
- Persistencia correcta en todos los dias.

5. Edicion consecutiva:
- Sin perdidas de datos, sin errores de concurrencia visibles.

### 6.2 QA tecnico

1. Lint y type-check.
2. Pruebas API de validacion (casos invalidos y validos).
3. Verificacion de transaccion (forzar error intermedio y comprobar rollback) en Fase 2.

---

## 7. Riesgos y Mitigaciones

1. Riesgo: romper disponibilidad al migrar reglas.
- Mitigacion: migracion aditiva + doble lectura/escritura + smoke tests diarios.

2. Riesgo: inconsistencias entre estado diario y slots.
- Mitigacion: validacion server + constraints + transaccion.

3. Riesgo: errores UX por mensajes fuera de panel.
- Mitigacion: estandarizar alerts dentro del footer del panel.

---

## 8. Estimacion (orientativa)

Fase 1 (MVP escalable): 2-4 dias
- UI toggle `Ferme`
- Validaciones cliente
- Mensajeria panel
- Endpoint server basico (recomendado)

Fase 2 (robusta): 4-8 dias
- Migraciones BD
- API transaccional robusta
- Adaptacion de motor de disponibilidad
- Migracion de datos + rollout

---

## 9. Orden de Ejecucion Recomendado

1. Implementar Fase 1 completa y estabilizar en entorno de pruebas.
2. Medir incidencias reales en uso admin (1 semana operativa).
3. Ejecutar Fase 2 con migracion aditiva y feature flag de lectura nueva.
4. Conmutar progresivamente y retirar compatibilidad antigua.

---

## 10. Decision Arquitectonica

Si se quiere minimizar retrabajo, la decision correcta es:
- Adoptar desde Fase 1 el contrato UI `isClosed + slots`.
- Mover guardado a API server cuanto antes.
- En Fase 2, cambiar solo persistencia/motor, no el flujo de pantalla.

