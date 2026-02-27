# Checklist de Release de Seguridad (Post-Robustez)

## Pre-release
- [ ] `npm run lint` sin errores.
- [ ] `npm run build` sin errores.
- [ ] Endpoints internos boutique devuelven `401/403` sin token o sin rol (`/api/boutique/pedidos*`, mutaciones `/api/boutique/productos*`, `/api/boutique/webhook-status`).
- [ ] Flujo público de checkout success funciona vía `POST /api/boutique/pedidos/create-from-session`.

## Base de datos
- [ ] Migraciones aplicadas:
  - `bookings_hardening_phase1_20260227`
  - `create_booking_atomic_phase1_20260227`
  - `bookings_rls_hardening_phase2_20260227`
  - `boutique_pii_rls_hardening_phase2_20260227`
  - `booking_requests_idempotency_phase3_20260227`
  - `security_postrobustez_phase_bcd_20260227`
- [ ] Ejecutar `scripts/security/postrobustez_security_checks.sql`.
- [ ] `supabase advisors (security)` sin errores `rls_disabled_in_public` ni `rls_policy_always_true`.

## Post-release
- [ ] Validar login admin y operación de `/admin/boutique`.
- [ ] Validar que reserva pública (`/reservation`) sigue operativa.
- [ ] Documentar excepciones abiertas:
  - leaked password protection (Auth)
  - upgrade de Postgres
  - extensión `btree_gist` en `public` (si no se migra)
