# Implementación por Agente - Plantilla Reutilizable + Sistema de Instrucciones

## Propósito
Este documento define **exactamente** lo que debe hacer el agente para:

1. Construir el repo plantilla final.
2. Publicarlo en GitHub.
3. Dejar un sistema de carpetas/archivos con instrucciones para que otro agente pueda crear una instancia cliente desde cero.

---

## Inputs obligatorios

## Proyecto base
- `SOURCE_REPO_PATH` (ruta repo base actual)
- `TARGET_BASE_PATH` (ruta donde crear repo plantilla local)
- `TEMPLATE_REPO_NAME` (nombre del repo plantilla)

## Supabase (proyecto de destino para validar bootstrap)
- `NEW_SUPABASE_PROJECT_ID`
- `NEW_SUPABASE_URL`
- `NEW_SUPABASE_ANON_KEY`
- `NEW_ADMIN_EMAIL`

## GitHub
- Acceso git configurado en máquina (SSH o token).
- Nombre del repo remoto final.

---

## Fase 0 - Precondiciones
1. Confirmar que la versión base está en estado **v1.0** (o freeze aprobado).
2. Confirmar alcance de la plantilla (si incluye o excluye boutique/Stripe).
3. Confirmar que MCP Supabase está operativo para `NEW_SUPABASE_PROJECT_ID`.

Si falla cualquiera de los 3 puntos, detener ejecución y pedir confirmación.

---

## Fase 1 - Auditoría de BD real (obligatoria)
Ejecutar por MCP en el proyecto Supabase real/base:

1. Inventario de tablas/columnas/constraints.
2. Políticas RLS actuales.
3. Triggers y funciones (`handle_new_user` y relacionados).
4. Buckets y policies de `storage.objects`.
5. Índices activos.

Salida esperada:
- Un snapshot técnico usado como fuente de verdad para migraciones.
- Registro de diferencias respecto a SQL local histórico.

Regla:
- No generar migraciones desde archivos SQL antiguos sin validar contra esta auditoría.

---

## Fase 2 - Crear repo plantilla local
1. Crear carpeta nueva en `TARGET_BASE_PATH/TEMPLATE_REPO_NAME`.
2. Copiar código del repo base excluyendo `.git`, `node_modules`, `.next`, `.env.local`.
3. Inicializar git y primer commit local.

---

## Fase 3 - Ajustar código plantilla según alcance

## Si el alcance es "sin boutique/Stripe" (default actual)
1. Eliminar rutas/components/apis de boutique.
2. Quitar dependencia `stripe` de `package.json`.
3. Quitar referencias de carrito y navegación boutique.
4. Limpiar `env.example` para dejar solo variables necesarias.
5. Revisar textos/metadata para no dejar referencias inconsistentes.

## Si el alcance cambia
- Documentar explícitamente qué módulos adicionales se mantienen.

---

## Fase 4 - Crear migraciones canónicas
En el repo plantilla crear carpeta:

- `supabase/migrations/`

Generar migraciones por bloques (ordenadas):
1. `001_core_schema.sql`
2. `002_core_rls.sql`
3. `003_auth_roles_trigger.sql`
4. `004_storage_buckets_policies.sql`
5. `005_seed_base.sql`

Reglas:
1. Deben reflejar el estado real auditado.
2. Deben ser idempotentes (usar `if not exists` y `on conflict` cuando aplique).
3. Deben excluir todo lo fuera de alcance definido.

---

## Fase 5 - Probar bootstrap en Supabase de destino
Con `NEW_SUPABASE_PROJECT_ID` por MCP:

1. Aplicar migraciones en orden.
2. Crear/asignar admin inicial (`NEW_ADMIN_EMAIL`).
3. Verificar tablas, policies, trigger y buckets.
4. Ejecutar seed base.

Validaciones mínimas:
1. Login admin funcional.
2. Flujo reservas funcional.
3. CRUD base de admin operativo.
4. Sin errores críticos de permisos/RLS.

---

## Fase 6 - Validación de app
En el repo plantilla:

1. Crear `.env.local` con `NEW_SUPABASE_URL` y `NEW_SUPABASE_ANON_KEY`.
2. Ejecutar:
   - `npm install`
   - `npm run lint`
   - `npm run build`
   - `npm run dev`
3. Ejecutar smoke tests manuales de rutas clave.

---

## Fase 7 - Publicar plantilla en GitHub
1. Crear repo remoto (vacío).
2. Añadir remote `origin`.
3. Push de rama principal.
4. Crear tag inicial `v1.0.0-template`.

---

## Fase 8 - Crear sistema interno de instrucciones (para agente 2)
Dentro del repo plantilla crear:

- `template-ops/README.md`
- `template-ops/inputs.required.md`
- `template-ops/checklists/preflight.md`
- `template-ops/checklists/postflight.md`
- `template-ops/playbooks/01_repo_local.md`
- `template-ops/playbooks/02_supabase_bootstrap.md`
- `template-ops/playbooks/03_env_build_run.md`
- `template-ops/playbooks/04_smoke_tests.md`
- `template-ops/prompts/agente-ejecutor.md`

Contenido mínimo exigido:
1. Inputs exactos requeridos al usuario.
2. Orden exacto de pasos.
3. Comandos ejecutables.
4. Criterios de aceptación.
5. Plan de rollback básico.

---

## Entregables finales del agente
1. Repo plantilla local creado y funcional.
2. Repo plantilla publicado en GitHub.
3. Migraciones canónicas dentro del repo.
4. Carpeta `template-ops` completa para ejecución por segundo agente.
5. Informe final con:
   - cambios aplicados,
   - evidencias de validación,
   - riesgos pendientes,
   - siguientes pasos recomendados.
