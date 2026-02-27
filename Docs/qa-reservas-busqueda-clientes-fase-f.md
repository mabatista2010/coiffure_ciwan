# QA Fase F - Búsqueda de clientes en Nueva Reserva

Fecha: 2026-02-27
Entorno: `http://localhost:3000`
Ruta principal: `/admin/reservations/nueva`

## Checklist funcional

- [x] Seleccionar `styliste + centre + service + date + horaire` y abrir modal `Informations du client`.
- [x] En modal cliente aparece bloque `Recherche client existant`.
- [x] El input inline acepta búsqueda libre por `nom/email/téléphone`.
- [x] Al escribir `2+` caracteres aparecen sugerencias debajo del input.
- [x] Al seleccionar una sugerencia se autocompletan `Nom`, `Email`, `Téléphone`.
- [x] Se muestra estado visual `Client existant sélectionné`.
- [x] Botón `Annuaire` abre panel lateral `Annuaire clients`.
- [x] El panel lateral muestra buscador + resultados + botón `Sélectionner`.
- [x] Cerrar el panel lateral devuelve al modal cliente con estado preservado.

## Checklist técnico

- [x] Nuevo endpoint staff-only disponible: `GET /api/admin/crm/customers/search`.
- [x] El endpoint limita resultados (`limit`) y requiere query mínima.
- [x] Ranking de resultados por relevancia (email/teléfono/nombre + visitas).
- [x] Nuevo componente reutilizable creado: `AdminSidePanel`.
- [x] Integración del panel de annuaire en `nueva reserva` completada.
- [x] Lint de archivos modificados OK (`npx eslint ...`).

## Pendientes manuales recomendados

- [ ] Verificar búsqueda con dataset grande (>5k clientes) para validar rendimiento real.
- [ ] Verificar comportamiento con sesión expirada y refresco de token en flujo completo.
- [ ] Validar UX mobile en dispositivos reales (iOS/Android) para dropdown/panel.

## Observaciones

- `npm run lint` global del repo actualmente falla por errores preexistentes en `src/app/admin/home/page.tsx` no relacionados con este alcance.
