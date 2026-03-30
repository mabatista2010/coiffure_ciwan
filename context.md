# Steel & Blade - Contexte du Projet

## Résumé
Steel & Blade est l’application web de **Coiffure Ciwan**, un salon masculin moderne multi‑centres. Elle combine :
- Une **landing page** vitrine (services, galerie, localisation, contact).
- Un **système de réservation** multicentrique en 6 étapes.
- Un **panel administratif** complet (réservations, CRM, stats, contenus, boutique).
- Une **boutique e‑commerce** intégrée avec **Stripe** + **Supabase**.

> Projet Supabase actif : `tvdwepumtrrjpkvnitpw`.

## Objectifs
1. Fournir une présence en ligne professionnelle pour Coiffure Ciwan.
2. Permettre la réservation en ligne (centre, service, styliste, date, heure).
3. Offrir un tableau de bord admin pour gérer réservations, services, stylists, centres et contenus.
4. Proposer un CRM client (historique, habitudes, stats).
5. Vendre des produits capillaires via une boutique avec paiement sécurisé.

## Langue & Cohérence
- **Tous les textes visibles doivent rester en français** (UI, erreurs, emails, contenus dynamiques, documentation). 
- La base actuelle mélange FR/ES dans certains fichiers : toute nouvelle chaîne doit être **FR‑only**.
- Dates formatées en **fr‑FR** côté UI (ex: confirmations, stats, galerie).

## Stack & Versions (réel dans le code)
### Frontend
- **Next.js 15.2.1 (App Router)** + **React 19** + **TypeScript 5**.
- **Tailwind CSS 4** (via `@tailwindcss/postcss`) + variables CSS.
- **shadcn/ui** initialisé (CLI `shadcn@3.8.5`) avec `components.json` (style `new-york`, base `neutral`) ; aucun composant généré pour l’instant.
- **Framer Motion 12.4.10**.
- `lucide-react`, `react-icons`.

### Backend / Intégrations
- **Next.js Route Handlers** (`src/app/api`).
- **Supabase** (DB PostgreSQL, Auth, Storage, RLS) via `@supabase/supabase-js@2.93.3`.
- **Stripe** via `stripe@18.3.0` avec API `2025-06-30.basil`.
- **ChatGPT Apps SDK (MCP)** via `@modelcontextprotocol/sdk@1.25.3` + `zod@4.3.6` (endpoint `/mcp`).

### Outils
- **ESLint 9** + `eslint-config-next@15.2.1`.
- **Next/Image** pour optimisation d’images.
- **PostCSS + Autoprefixer**.

### Pré‑requis (docs)
- **Node.js >= 18**.
- Compte Supabase + compte Stripe.

## Variables d’environnement (utilisées dans le code)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement, requis pour admin + webhooks + CRUD boutique)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_BASE_URL` (redirections Stripe)

## Structure du projet
- `src/app/` : routes App Router (pages + API).
- `src/components/` : composants UI (landing, boutique, réservation, admin).
- `src/lib/` : utilitaires (Supabase, Stripe helpers, calendrier, roles, `utils.ts` avec helper `cn` pour shadcn).
- `src/styles/` : `theme.css`, `parallax.css`.
- `public/` : assets statiques.
- `components.json` (racine) : configuration shadcn/ui (aliases, Tailwind CSS, theming variables).
- `public/chatgpt-reserva-widget.html` : widget UI pour l’app ChatGPT (Apps SDK).
- `setup-guide/` : docs + script SQL de setup.
- `*.sql` à la racine : scripts Supabase (schémas, fixes, données).

## Routes (UI)
### Public
- `/` : landing page
- `/equipo` : équipe
- `/reservation` : réservation
- `/boutique` : catalogue boutique
- `/boutique/checkout` : checkout
- `/boutique/checkout/success` : confirmation paiement
- `/boutique/checkout/demo` : page démo (site vitrine)
- `/chatgpt-preview` : prévisualisation locale du widget ChatGPT (mock data)
- `/ui-test` : laboratoire interne pour tester rapidement les composants shadcn/ui

### Admin
- `/admin/home` : tableau de bord neutre (accueil admin/employé)
- `/admin` : configuration (services, galerie, stylists, centres, hero) via `?section=...` ; sans `section`, redirection vers `/admin/home`
- `/admin/reservations` : gestion réservations
- `/admin/reservations/nueva` : création manuelle de réservation
- `/admin/crm` : CRM clients
- `/admin/stylist-stats` : stats stylists
- `/admin/location-stats` : stats centres
- `/admin/user-management` : rôles & utilisateurs
- `/admin/boutique` : produits + commandes
- `/admin/webhook-diagnostics` : diagnostic Stripe

> Note : `src/app/admin/reservations/page.tsx.bak` est un backup.

### Admin - Gestion des centres
- `src/app/admin/location-management.tsx` gère désormais les horaires hebdomadaires avec un état explicite `Ouvert/Fermé` par jour.
- Contrat UI de Fase 1 : `daySchedules[]` avec `dayOfWeek`, `isClosed`, `slots[]`.
- Un jour `Fermé` n’insère aucune ligne dans `location_hours`, mais l’état autoritatif est désormais `location_daily_schedule.is_closed`.
- Le panneau latéral admin affiche les erreurs de validation et confirmations de sauvegarde directement dans le panneau.
- Fase 2 ajoute `public.location_daily_schedule` comme registre explicite de l’état quotidien (`is_closed`) avec 7 lignes par centre après backfill.
- Fase 2.5 retire la compatibilité legacy basée uniquement sur l’absence de lignes dans `location_hours` pour savoir si un jour est fermé.
- `DELETE /api/admin/locations/[id]` ne supprime plus physiquement un centre : l’action retire désormais le centre des parcours actifs via `locations.active = false`, avec conservation de l’historique et audit.

## Catalogue services hiérarchique
- Le catalogue n’est plus pensé comme une simple liste plate : il repose désormais sur **`service_groups` → `service_subgroups` (optionnel) → `servicios`**.
- `public.servicios` reste la table métier réservée par `service_id`, mais elle a été étendue avec :
  - `slug`
  - `group_id`
  - `subgroup_id`
  - `sort_order`
  - `landing_featured`
  - `landing_sort_order`
  - `updated_at`
- Nouvelles tables :
  - `public.service_groups`
  - `public.service_subgroups`
- Règles de domaine :
  - un groupe peut contenir **soit** des services directs **soit** des sous-groupes,
  - un service direct a `group_id` renseigné et `subgroup_id = null`,
  - un service dans un sous-groupe a `subgroup_id` renseigné et son groupe effectif dérive du sous-groupe,
  - visibilité configurée indépendante sur groupe / sous-groupe / service,
  - visibilité effective héritée vers le bas,
  - noms uniques entre frères,
  - slugs uniques par type,
  - maximum `6` services mis en avant sur la landing.
- La migration initiale a créé :
  - groupe `Services`
  - sous-groupe `General`
  - backfill automatique des services existants vers cette hiérarchie.

## Réservation publique - sélection de service
- `src/components/reservation/ServiceSelect.tsx` gère désormais un flux hiérarchique :
  - **groupe**
  - **sous-groupe** si applicable
  - **service**
- Les groupes affichent :
  - nom
  - image optionnelle
  - description
  - compteur visible effectif
- Les sous-groupes affichent :
  - nom
  - description optionnelle
  - compteur visible effectif
- Les services affichent :
  - nom
  - description
  - prix
  - durée
  - image optionnelle avec fallback
- Auto-avance :
  - sélection groupe → étape suivante
  - sélection sous-groupe → étape suivante
- Cas spéciaux :
  - si le salon n'a qu'un seul groupe visible effectif, le pas groupe est masqué publiquement et la réservation démarre directement sur le niveau utile (services directs ou sous-groupes)
  - dans ce mode groupe unique, la UI publique n'affiche pas de libellé explicite `groupe` / `sous-groupe`; le copy devient neutre (`option`, `services disponibles`)
  - groupe en mode services directs → accès direct à la liste des services
  - saut du sous-groupe uniquement si le groupe a exactement `1` sous-groupe visible et le flag `skip_subgroup_step_when_single_visible_child = true`
  - combinaison des deux règles : un salon avec un seul groupe visible + un seul sous-groupe visible arrive désormais directement à la liste des services, même sans activer explicitement le flag de saut
- La page `/reservation` accepte désormais `?service=<service-slug>` :
  - si le slug est valide et publiquement réservable, le service est préselectionné et le parcours continue vers le centre,
  - sinon, fallback vers le début du parcours avec message clair.
- La barre de progression de `/reservation` s’adapte au nombre réel d’étapes actives du flux service.

## Admin - services
- La section `/admin?section=services` a été refactorisée vers `src/components/admin/services/ServiceManagement.tsx`.
- Une action admin permet désormais de convertir un groupe avec un seul sous-groupe en **services directs** : tous les services du sous-groupe sont déplacés au niveau du groupe puis le sous-groupe est supprimé de manière atomique.
- UX admin :
  - arbre hiérarchique expand/collapse,
  - recherche globale,
  - badges de visibilité configurée / effective,
  - ordre manuel `haut/bas`,
  - panneau latéral unique pour groupe / sous-groupe / service,
  - actions contextuelles “créer ici”,
  - sélection landing (`landing_featured`, `landing_sort_order`),
  - retrait sûr des services individuels depuis le menu d’édition (`active = false` au lieu d’un hard delete),
  - action de suppression toujours visible sur groupes / sous-groupes, mais si l'élément n'est pas vide une modale stylée explique qu'il faut d'abord supprimer ou re-déplacer les services associés,
  - suppression définitive autorisée pour un groupe ou un sous-groupe uniquement s'il est vide,
  - suppression avec confirmation explicite stylée (plus d'alertes navigateur sur cette gestion),
  - le retrait d’un service conserve les affectations et l’historique ; le service reste archivé côté admin et sort seulement des parcours publics/actifs,
  - blocage explicite au 7e service mis en avant.
- Les slugs sont gérés côté formulaire avec mode auto/manuel cohérent avec le nom, puis validés définitivement en base via triggers.
- Support SQL ajouté : `public.convert_group_single_subgroup_to_direct_services(p_group_id bigint)` pour aplatir un groupe mono-sous-groupe sans casser les contraintes de mode exclusif.
- `public.ensure_service_write_permissions()` autorise maintenant explicitement la transition `active=true -> false` si l’utilisateur possède `services.delete`, tout en gardant `services.content.edit` pour réactiver un service ou modifier son contenu.

## Landing - section services
- `src/components/Services.tsx` n’affiche plus automatiquement tous les services actifs.
- La landing affiche uniquement les services :
  - `landing_featured = true`
  - visibles effectifs
  - publiquement réservables
- Limite d’affichage : `6` cartes maximum, triées par `landing_sort_order`.
- Chaque carte pointe vers `/reservation?service=<slug>` pour ouvrir directement la réservation du service sélectionné.

## Admin - affectation services aux stylistes
- `src/app/admin/stylist-management.tsx` affiche désormais l’affectation des services par hiérarchie groupe / sous-groupe.
- Les groupes et sous-groupes sont repliables.
- Les services masqués restent assignables en admin, avec badge explicite.

## APIs (Route Handlers)
### Réservation
- `GET /api/reservation/availability`
  - Paramètres: `date`, `stylistId`, `locationId`, `serviceId`.
  - Délègue à la RPC SQL `public.get_availability_slots_v2`.
  - Utilise les mêmes règles que la création (`check_booking_slot_v2`) : `working_hours`, `location_daily_schedule` (état ouvert/fermé autoritatif), `location_hours` (plages des jours ouverts), `time_off`, `location_closures`, `bookings` (`pending|confirmed|needs_replan`), `booking_buffer_minutes`, fenêtre `min/max` et timezone métier.
  - Retourne `availableSlots[]` avec `time`, `available`, `reasonCode`.
  - Lit les données via client Supabase `service_role` côté serveur (pas d’exposition directe de `bookings` en public).
- `POST /api/reservation/create`
  - Délègue la création à la RPC SQL `public.create_booking_atomic_v2` (service role server-only).
  - Validation atomique serveur via moteur centralisé (`check_booking_slot_v2`) + verrou transactionnel (`pg_advisory_xact_lock`) pour réduire les races.
  - Codes d’erreur normalisés : `invalid_payload` (400), `slot_conflict` (409), règles métier (422), `internal_error` (500).
  - Nouveaux codes métier: `outside_booking_window`, `outside_location_hours`, `location_closed`.
  - Idempotence supportée via header `Idempotency-Key` (replay de réponse pour la même clé+payload, blocage si clé réutilisée avec payload différent).
  - Logging structuré de création (`request_id`, `source`, `idempotency_key`, `error_code`, `latency_ms`).
  - `check_booking_slot_v2` considère désormais `location_daily_schedule` comme source unique de vérité pour savoir si un jour est fermé.

### CRM Admin
- `GET /api/admin/crm/customers/[id]/profile`
  - Endpoint interne protégé (`Authorization: Bearer <access_token>`) via `requireStaffAuth` (`admin|staff`) + permission `crm.customers.view`.
  - Retourne la fiche étendue du client.
  - Supporte lazy-create du profil quand absent (avec `customerName/customerEmail/customerPhone` passés en query), avec récupération sur conflit `unique` pour éviter les erreurs de concurrence.
- `PUT /api/admin/crm/customers/[id]/profile`
  - Endpoint interne protégé (`admin|staff`) + permission `crm.customers.edit`.
  - Crée/met à jour la fiche client (données étendues CRM) avec validations serveur.
- `GET /api/admin/crm/customers/[id]/notes`
  - Endpoint interne protégé (`admin|employee`).
  - Liste les notes CRM du client par date décroissante.
  - Lazy-create profil idempotent côté serveur (récupération du profil existant si conflit d’insertion).
- `POST /api/admin/crm/customers/[id]/notes`
  - Endpoint interne protégé (`admin|employee`).
  - Crée une note CRM (`general|follow_up|incident|preference`) avec `created_by`.
- `GET /api/admin/crm/customers/search`
  - Endpoint interne protégé (`admin|staff`) + permission `crm.customers.view` pour autocomplétion et annuaire client.

### Admin - retrait sûr / soft delete
- `DELETE /api/admin/stylists/[id]` effectue désormais une désactivation sûre (`stylists.active = false`) au lieu d’un hard delete ; associations, agenda et historique restent intacts.
- `DELETE /api/admin/locations/[id]` effectue une désactivation sûre (`locations.active = false`) au lieu de supprimer horaires/fermetures/assignations.
- `src/components/admin/services/ServiceManagement.tsx` retire désormais un service en mettant `servicios.active = false` ; l’action reste contrôlée par `services.delete`.
- `DELETE /api/boutique/productos/[id]` retire désormais le produit du catalogue via `productos.activo = false` sans suppression Stripe ni effacement des références panier/commande.
  - Recherche multi-critères (`nom`, `email`, `téléphone`) avec ranking de pertinence.
  - Réponse enrichie par client (`customer_key`, contact, `last_visit_date`, `total_visits`, `total_spent`, `source`) avec `limit` borné côté serveur.

### Réservations Admin
- `GET /api/admin/bookings/pending`
  - Endpoint interne protégé (`admin|employee`).
  - Retourne les réservations `pending` à venir (`booking_date >= aujourd’hui`) avec scope rôle:
    - `admin`: global.
    - `employee`: limité au styliste associé via `stylist_users`.
- `POST /api/admin/bookings/pending`
  - Endpoint interne protégé (`admin|employee`).
  - Valide des réservations en attente (`pending -> confirmed`) en mode individuel/sélection (`bookingIds[]`) ou en masse (`approveAll`).
  - Réponse détaillée (`updated_count`, `updated_ids`, `eligible_count`, `skipped_count`) pour gérer les cas de concurrence.
- `GET /api/admin/bookings/replan`
  - Endpoint interne protégé (`admin|employee`).
  - Liste les réservations `needs_replan` avec filtres (`fromDate`, `toDate`, `stylistId`, `locationId`) et scope employé.
- `POST /api/admin/bookings/replan`
  - Endpoint interne protégé (`admin|employee`).
  - Actions de triage: `confirm`, `cancel`, `move` (déplacement de créneau avec validation serveur via `check_booking_slot_v2`).
- `GET/POST /api/admin/schedule/time-off`
  - Endpoint interne protégé par `requireStaffAuth` (`admin|staff`) + permission `schedule.time_off.manage`.
  - `GET` et `POST` filtrent/valident désormais aussi le scope effectif (`own_stylist`, `assigned_location`, `specific_locations`, `all`, `none`).
- `PUT/DELETE /api/admin/schedule/time-off/[id]`
  - Endpoint interne protégé par permission `schedule.time_off.manage` avec validation de scope sur l’indisponibilité ciblée.
- `GET/POST /api/admin/schedule/location-closures`
  - Endpoint interne protégé par `requireStaffAuth` (`admin|staff`) + permission `schedule.location_closures.manage`.
  - `GET` et `POST` filtrent/valident aussi le scope location effectif.
- `PUT/DELETE /api/admin/schedule/location-closures/[id]`
  - Endpoint interne protégé par permission `schedule.location_closures.manage` avec validation de scope sur la fermeture ciblée.
- `POST /api/admin/schedule/working-hours`
  - Endpoint interne protégé par `requireStaffAuth` (`admin|staff`) + permission `schedule.working_hours.manage`.
  - Valide aussi le scope effectif sur le styliste ciblé et sur chaque `locationId` fourni.
  - Validation serveur: format des plages, ordre strict `start < end`, anti-solape interne, compatibilité stricte avec `location_hours`; en cas d’erreur, le message inclut désormais l’index/tranche invalide, et pour `outside_location_hours` le détail `locationId/dayOfWeek/start→end`.
  - Réponse avec compteurs (`updated_working_hours_count`, `needs_replan_detected_count`).
- `POST /api/admin/schedule/location-hours`
  - Endpoint interne protégé par `requireStaffAuth` (`admin|staff`).
  - Autorise désormais la sauvegarde des horaires centre si l'utilisateur possède soit `schedule.location_hours.manage`, soit `locations.operations.edit`, avec validation de scope sur le centre ciblé.
  - Valide aussi le scope effectif sur le centre ciblé avant d’appeler la RPC SQL.
  - Attend `locationId` + `daySchedules[]` (7 jours) et appelle la fonction SQL transactionnelle `public.save_location_weekly_schedule_v2`.
  - Persistance métier actuelle :
    - `location_daily_schedule` = source autoritative de l’état ouvert/fermé par jour,
    - `location_hours` = plages horaires des jours ouverts uniquement.
  - `isClosed=true` => `location_daily_schedule.is_closed=true` + aucune ligne `location_hours` pour ce jour.
  - Validation serveur : unicité `dayOfWeek`, jour ouvert avec au moins une plage valide, format `HH:mm`, ordre strict `start < end`, anti-solape intra-jour.
  - Réponse avec compteurs (`updated_location_hours_count`, `closed_days_count`).

### ChatGPT Apps SDK (MCP)
  - `GET|POST|DELETE /mcp`
  - Serveur MCP (Apps SDK) avec widget UI intégré (resource `ui://widget/reserva.html`).
  - Tools exposés : `get_welcome`, `list_services`, `list_locations`, `list_stylists`, `get_availability`, `create_booking`, `admin_bookings_day` (OAuth requis).
  - Réponses utilisent `structuredContent` pour synchroniser le widget (centres, stylistes, hero). `get_welcome` renvoie l’image hero configurée + `logo_url`, avec des URLs absolues et `view: "welcome"`. `list_locations` renvoie `view: "locations"` et `list_stylists` renvoie `view: "stylists"` avec des images en URLs absolues. Les tools `list_services`, `get_availability`, `create_booking` n’affichent plus de widget.
  - La liste des tools est personnalisée pour inclure `securitySchemes` (noauth vs oauth2) afin d’activer l’auth OAuth par tool dans ChatGPT (admin avec scope `email` pour eviter l’ID token HS256).
  - Le MCP ne propose pas la modification/annulation de réservation (non disponible pour l’instant).
  - Auth admin ChatGPT: metadata OAuth à `/.well-known/oauth-protected-resource` + consentement via `/oauth/consent` (Supabase OAuth Server).
  - `/.well-known/oauth-protected-resource` annonce `authorization_servers` sur l’issuer Supabase (`<supabaseUrl>/auth/v1`) et limite `scopes_supported` a `email` (pas d’`openid`).
  - La page `/oauth/consent` redirige automatiquement si l’autorisation est `auto_approved` (y compris via un appel d’approbation automatique quand aucun `redirect_url` n’est renvoye).
  - `create_booking` appelle `/api/reservation/create` (si l’écriture est bloquée côté plan ChatGPT, le tool renvoie un message d’échec).
  - `list_services` renvoie maintenant une structure **hiérarchique** (groupes, sous-groupes, services directs), avec compteurs visibles effectifs et slugs résolus.
- `GET /api/chatgpt-preview/locations`
  - Endpoint de preview pour charger les centres (avec images) dans `/chatgpt-preview`.

### Boutique / Stripe
- `POST /api/boutique/stripe`
  - Crée une session **Stripe Checkout**.
  - Refuse tout item sans `stripe_price_id`.
  - Ajoute les infos client + items dans `metadata` + `sync_token` anti-abus.
  - Pays autorisés : **ES, FR, DE, IT, PT, CH, AT, BE, NL, GB, US, CA**.
  - `success_url` / `cancel_url` basées sur `NEXT_PUBLIC_BASE_URL`; `success_url` inclut `sync_token`.
- `POST /api/boutique/stripe/webhook`
  - Traite `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`.
  - Crée/maj les `pedidos` + `items_pedido`.
- `GET /api/boutique/webhook-status`
  - Diagnostics Stripe (config + liste webhooks + événements récents).
  - Endpoint interne: auth requise (`Authorization: Bearer <access_token>`) + rôle `admin` (sinon `401/403`).
- `POST /api/boutique/pedidos/create-from-session`
  - Fallback public contrôlé: crée (ou récupère) un `pedido` depuis une `sessionId` Stripe payée.
  - Exige `sessionId` + `syncToken` et vérifie `syncToken === session.metadata.sync_token`.
  - Retourne un résumé sans PII (`id`, `total`, `estado`, `created_at`) pour la page de succès.
- `GET /api/boutique/pedidos/session/[sessionId]`
  - Récupère un `pedido` par `stripe_session_id` (endpoint interne admin, protégé par token + rôle `admin`).
- `GET /api/boutique/pedidos`
  - Liste commandes + items produits (endpoint interne admin, protégé par token + rôle `admin`).
- `PUT /api/boutique/pedidos/[id]`
  - Met à jour `estado` (valeurs autorisées côté API : `pendiente`, `en_traitement`, `traite`), endpoint interne `admin`.
- `GET/POST /api/boutique/productos`
  - `GET` public: liste produits actifs.
  - `POST` interne `admin`: crée produit + sync Stripe (`401/403` si no auth/rol).
- `GET/PUT/DELETE /api/boutique/productos/[id]`
  - `GET` lecture produit.
  - `PUT/DELETE` internes `admin` + sync Stripe (création de prix si prix change) avec contrôle auth/rol.
  - Les nouveaux prix Stripe sont créés en devise `chf`.
- `POST /api/boutique/checkout`
  - **API legacy**: désactivée par défaut (`410`) sauf si `ENABLE_LEGACY_BOUTIQUE_CHECKOUT_API=true`.

## Fonctionnalités (Client)
### Landing Page
- **Hero** : images desktop/mobile via `configuracion` (`hero_image_desktop`, `hero_image_mobile`) + animations séquentielles.
- **Services** : data depuis Supabase + parallax (desktop) + image mobile dédiée (`services_background_mobile`).
- **Galerie** : carrousel animé, swipe mobile, miniatures desktop, fallback local si Supabase down.
- **Localisation** : multi‑centres, maps Google embed, horaires groupés par jour, CTA “Réservez Maintenant”.
- **Contact** : infos + formulaire.

### Page Équipe
- Liste des stylists actifs avec photo, bio, spécialités (responsive 1/2/3 colonnes).

### Réservation (6 étapes)
1. Service
2. Centre
3. Styliste
4. Date & heure (slots 15 min)
5. Infos client
6. Confirmation (inclut **ajout au calendrier** Google/iCal)

> Barre de progression couvre étapes 1‑5. Confirmation montre ID + contact centre.

### Boutique
- Catalogue dynamique depuis `/api/boutique/productos` (fallback si API fail).
- **Filtrage par catégorie** + section produits vedettes (`destacado`).
- **Panier global** via React Context + `localStorage`.
- **Checkout Stripe** + page succès basée sur `session_id`.
- Affichage des prix unifié en **CHF** (frontend + admin + stats).
- Page `/boutique/checkout/demo` (mode démo explicite).

## Panel Admin (Sécurité & UX)
- Auth Supabase par email/password (`AdminLayout`).
- Écran de connexion admin harmonisé en français (titre, labels, CTA et messages d’accès refusé).
- Layout admin avec 3 états (chargement / non‑auth / auth) + formulaire login unifié.
- Après connexion, `admin` et `staff` sont redirigés vers la première section autorisée calculée depuis le contexte d’accès effectif (fallback `/admin/home`).
- Vérification de session Supabase sur toutes les routes `/admin/*`.
- Les pages admin boutique/webhook envoient le `access_token` Supabase en `Authorization: Bearer` vers les endpoints internes protégés.
- **Rôles globaux** : `admin` vs `staff`.
  - `staff` est désormais piloté par **profil de permissions + overrides + scopes** (plus de whitelist fixe par rôle).
  - `admin` reste superutilisateur total; `staff` est fail-closed si le contexte d’accès n’est pas valide.
- **AdminNav** unifiée :
  - Sidebar pliante, fermée par défaut, auto‑close clic externe, hamburger mobile.
  - Interaction adaptative: hover-to-open sur desktop (pointeur fin) et toggle au tap sur tablette/iPad (logo), avec fermeture en tapant à l’extérieur.
  - Navigation pilotée par permissions effectives (`dashboard`, `reservations`, `crm`, `services`, `stylists`, `locations`, `gallery`, `boutique`, `stats`) avec sections pliables.
  - Les catégories sont ouvertes par défaut et mémorisées par utilisateur/contexte en `localStorage` (plié/déplié persistant).
  - Chaque entrée se rend seulement si le contexte d’accès possède le droit `view` ou opérationnel correspondant.
  - Rendu unique via `AdminLayout` (pas de rendu direct dans les pages) pour éviter les doublons desktop.
  - `/admin` lit `?section=` de manière réactive (`services|gallery|stylists|locations|hero`) pour piloter la section active.
- Composant UI réutilisable `AdminSidePanel` ajouté (`src/components/admin/ui/AdminSidePanel.tsx`) pour unifier les panneaux latéraux admin (header, scroll, footer, fermeture, animations).

### Modèle d'autorisations V1 (2026-03-27)
- Nouveau rôle non-admin canonique: `staff` (migration complète depuis `employee`).
- Le système d'accès repose désormais sur :
  - `permission_profiles`
  - `profile_permissions`
  - `user_profiles`
  - `user_permission_overrides`
  - `user_location_assignments`
  - `stylist_users` (toujours utilisé comme scope `own_stylist`)
  - `admin_audit_log`
- Catégories de permissions V1 : `dashboard`, `reservations`, `crm`, `services`, `stylists`, `locations`, `gallery`, `boutique_orders`, `boutique_catalog`, `stats`.
- Scopes supportés : `all`, `none`, `own_stylist`, `assigned_location`, `specific_locations`.
- `src/lib/permissions/` centralise le catalogue, les types, le résolveur serveur, les helpers de scope et le routage admin.
- `src/app/api/admin/access-context/route.ts` expose le contexte d'accès effectif courant au frontend admin.
- `requireStaffAuth` supporte maintenant `requiredPermission` en plus de `allowedRoles`.
- Les mutations sensibles `stylists` / `locations` sont maintenant centralisées côté serveur avec `service_role`, contrôle explicite de scope et entrée d’audit `admin_audit_log`.
- `src/app/admin/reservations/page.tsx` applique désormais le scope effectif `reservations.view` aussi sur les listes de centres/stylistes et sur toutes les requêtes `bookings` (mois, semaine, jour) : un `staff` scoped ne voit plus de centres hors périmètre dans le filtre visuel.
- Le sous-panel CRM `/api/admin/crm/customers/[id]/profile` résout maintenant les fiches par `customer_key`, email normalisé **ou** téléphone normalisé, ce qui évite les faux `Impossible de créer le profil client` sur des profils déjà existants sous un identifiant alternatif.
- Le contrôle `stylists.profile.edit` sur `/api/admin/stylists/[id]` accepte désormais un styliste multi-centres si **au moins un** de ses `location_ids` est dans le scope effectif du `staff` (plus de dépendance fragile à `location_ids[0]`).
- Les guards SQL `ensure_service_write_permissions()` et `ensure_products_write_permissions()` autorisent désormais explicitement `auth.role() = 'service_role'` : les endpoints serveur `boutique`/futurs endpoints `services` peuvent écrire sans casser les permissions DB, tout en gardant le contrôle d’accès applicatif.
- La fonction SQL `audit_admin_change()` a été durcie pour lire dynamiquement `id` / `user_id` via `to_jsonb(old/new)` ; elle ne casse plus silencieusement sur des tables sans colonne `user_id` (`servicios`, `productos`, `time_off`, `location_hours`, etc.).

### Sections Admin
- **Accueil dashboard** (`/admin/home`)
  - Page d’entrée par défaut après login (admin + staff).
  - Affiche des données opérationnelles réelles (KPIs du jour, agenda, alertes, actions rapides).
  - Rafraîchissement manuel via bouton `Actualiser` basé sur `bookings` (aujourd’hui + 7 jours).
  - Contenu filtré par permissions effectives et scopes (quick actions, alertes et KPIs visibles selon le contexte).
  - Salutation personnalisée: priorité au nom du styliste associé (`stylist_users`), avec fallback sur le profil auth/email.
  - Les alertes de réservations en attente ouvrent un panneau latéral (slide-in) de triage rapide.
  - L’alerte “réservations en attente” utilise le total à venir (`booking_date >= today`) selon le scope effectif (`all`, `own_stylist`, `assigned_location`, `specific_locations`, `none`).
  - Le panneau latéral permet: approbation individuelle, sélection multiple et approbation de masse, avec synchronisation immédiate des KPIs.
  - Le bloc **Actions rapides** est personnalisable via un modal `Dialog` (shadcn/ui) avec persistance `localStorage` par `user_id + role`; affichage limité à **5 raccourcis max** sur le dashboard.
- **Configuration** (`/admin`)
  - Services, galerie, stylists, centres, hero/images.
  - Uploads Supabase Storage avec preview.
  - Les sous-sections `services`, `gallery`, `stylists`, `locations` lisent désormais le contexte d’accès effectif et passent en mode lecture seule si l’utilisateur n’a que le droit `view`, en désactivant création/édition/suppression selon les permissions fines.
  - Services : `ServiceManagement` sépare désormais clairement lecture, édition contenu, édition business (`prix`, `duration`) et suppression selon `services.*`.
  - Stylists : panneau latéral aligné sur `stylists.profile.*`, `stylists.operations.*`, `schedule.working_hours.manage`, `schedule.time_off.manage`, `schedule.location_closures.manage`; la liste est filtrée par scope effectif et les writes passent désormais par `/api/admin/stylists` + `/api/admin/stylists/[id]`.
  - Centres : panneau latéral aligné sur `locations.profile.*`, `locations.operations.*`, `schedule.location_hours.manage`; la liste est filtrée par scope effectif et les writes passent désormais par `/api/admin/locations` + `/api/admin/locations/[id]`.
- **Réservations**
  - Calendrier, filtres (date, centre, styliste), statuts.
  - Filtre global de statut (`all|pending|confirmed|completed|cancelled`) appliqué aux vues `Mois`, `Semaine` et `Jour`.
  - Préfiltrage via URL (`?status=...&view=...`) supporté et synchronisé avec l’état de la page.
  - Calendrier admin avec vues `Mois / Semaine / Jour` et navigation temporelle adaptative selon la vue active.
  - Vue `Semaine` enrichie en agenda colonnes (7 jours) avec détails des rendez-vous par jour, scroll horizontal (tablet/mobile) et accès rapide `Voir le jour`.
  - Création manuelle via `/admin/reservations/nueva`.
  - La création manuelle dans `/admin/reservations/nueva` passe par `POST /api/reservation/create` (plus d’insertion directe client sur `bookings`).
  - Dans `/admin/reservations/nueva`, les filtres `styliste/centre/service` sont relationnels et bidirectionnels en mode faceté (self-excluding): chaque liste se calcule avec les autres filtres actifs, en ignorant son propre filtre pour éviter l'effet "bloqué".
  - Lors d'un changement de filtre dans `/admin/reservations/nueva`, seuls les filtres devenus incompatibles sont nettoyés automatiquement; les autres sélections valides sont conservées.
  - Dans `/admin/reservations/nueva`, le choix d'un créneau horaire n'ouvre plus automatiquement le modal client: il alimente une card de résumé (service/date/heure) avec action explicite **"Données du client"**.
  - Le flux de création manuelle utilise désormais 2 modals consécutifs: d'abord **Données du client**, puis un modal final **Confirmer la réservation** avec récapitulatif visuel (centre + styliste + détails) et confirmation explicite.
  - Dans le modal **Données du client**, un champ de recherche inline permet d’autocompléter un client existant (nom/email/téléphone) avec suggestions en temps réel.
  - Un bouton **Annuaire** ouvre un panneau latéral de recherche avancée des clients (composant réutilisable `AdminSidePanel`) pour sélectionner un client et préremplir le formulaire.
  - Le champ de commentaires optionnels est synchronisé entre le modal client et le modal final de confirmation.
  - Après création réussie, le modal de succès ne se ferme plus automatiquement: il propose **Nouvelle réservation** (reset complet des filtres/formulaire sur place) et **Retour au calendrier**.
  - Le calendrier de `/admin/reservations/nueva` n'affiche plus les jours passés, bloque leur sélection côté UI et désactive la navigation vers des mois antérieurs au mois courant.
  - Le statut mensuel des jours dans `/admin/reservations/nueva` est calculé avec le moteur réel (`/api/reservation/availability`, cache par date+combinaison) uniquement quand les filtres aboutissent à une combinaison unique `styliste+centre+service`; sinon le calendrier n’effectue pas de préchargement massif. Les créneaux d’une date suivent la même règle (combinaison unique) pour éviter les rafales d’appels.
  - Les jours marqués `Complet/Fermé` dans ce calendrier sont non cliquables pour éviter d’ouvrir un sélecteur horaire vide.
  - Si une date choisie n'a aucun créneau disponible, les filtres sélectionnés (styliste/centre/service) ne se réinitialisent plus automatiquement.
  - Les modals de `/admin/reservations/nueva` utilisent `Dialog` + `ScrollArea` (shadcn) avec hauteur contrainte mobile, et les créneaux horaires sont groupés par périodes (`Matin`, `Après-midi`, `Soir`) pour éviter les listes infinies.
- **CRM**
  - Vue CRM en grille complète (desktop/tablette/mobile) : la liste clients reste toujours visible.
  - Le détail client s’ouvre dans un panneau latéral coulissant (pattern partagé avec `/admin/home`) au clic sur une carte client.
  - Fiche client étendue éditable (profil CRM) + timeline de notes internes.
  - Actions rapides: ajout de note interne depuis le détail.
  - Protection UX contre perte de changements non enregistrés: confirmation via modal custom (pas de `window.confirm`) lors du changement de client et à la fermeture du panneau latéral, plus blocage `beforeunload`.
  - APIs internes protégées pour profil/notes (`/api/admin/crm/customers/[id]/...`).
  - Les appels client vers les APIs CRM protégées réessaient automatiquement une fois après `refreshSession()` en cas de `401` pour réduire les erreurs auth intermittentes.
  - `total_spent` basé sur bookings `completed`.
  - Recherche + tri intégrés.
- **Stats**
  - Filtres avancés (semaine/mois/année + période custom).
  - Graphiques responsives + étiquettes adaptatives.
  - `stylist-stats` et `location-stats` lisent le contexte d'accès effectif (`stats.view`) via `AdminAccessProvider` et appliquent désormais le scope en UI: `own_stylist`, `assigned_location` / `specific_locations`, `all`, `none`.
  - `/admin/location-stats` bloque explicitement les scopes de type styliste ; `/admin/stylist-stats` filtre la liste des stylistes selon le styliste associé ou les centres assignés.
- **Utilisateurs**
  - Gestion admin-only via nouveau panneau latéral : rôle global, profil de permissions, styliste associé, centres assignés, overrides `allow/deny`, scopes et aperçu des permissions effectives.
  - APIs dédiées: `GET /api/admin/users`, `GET/PATCH/DELETE /api/admin/users/[id]`.
  - Le détail utilisateur affiche également un extrait d’audit récent (`admin_audit_log`).
- **Stylists / Centres (writes server-side)**
  - `POST /api/admin/stylists`, `PATCH/DELETE /api/admin/stylists/[id]`
    - protégés par `requireStaffAuth` (`admin|staff`) + contrôles explicites `stylists.profile.*` / `stylists.operations.*`
    - filtrage de scope réel sur les `location_ids`
    - synchronisation des `stylist_services` côté serveur
    - audit `admin_audit_log`
  - `POST /api/admin/locations`, `PATCH/DELETE /api/admin/locations/[id]`
    - protégés par `requireStaffAuth` (`admin|staff`)
    - création limitée à `admin` ou scope global (`all`) pour éviter la création hors scope local
    - audit `admin_audit_log`
- **Boutique**
  - Onglets produits/commandes, status visuels, détails client, sync Stripe.
  - La page `/admin/boutique` lit maintenant le contexte d'accès effectif et n'affiche que les onglets/actions autorisés (`boutique.catalog.*`, `boutique.orders.*`).
  - Les endpoints `/api/boutique/productos`, `/api/boutique/productos/[id]`, `/api/boutique/pedidos`, `/api/boutique/pedidos/[id]` sont protégés par permissions granulares `requireStaffAuth` ; le GET public des produits conserve le fallback catalogue actif pour la boutique publique.
  - Les writes serveurs sur `productos` journalisent aussi explicitement dans `admin_audit_log` (`source = boutique_productos_api`) et les changements d’état de commande journalisent `source = boutique_pedidos_api`.
- **Webhooks**
  - `/admin/webhook-diagnostics` pour diagnostic Stripe.

## Supabase : Modèle réel (DB)
### Tables principales
- **servicios**: `id` (int8), `nombre`, `descripcion`, `precio`, `imagen_url`, `duration` (int, `default 30`, `NOT NULL`, `CHECK duration > 0 AND duration <= 240`), `active` (default true), `created_at`.
- **locations**: `id` (uuid), `name`, `address`, `phone`, `email`, `description?`, `image?`, `active` (default true), `created_at`.
- **stylists**: `id` (uuid), `name`, `bio?`, `specialties?` (text[]), `profile_img?`, `location_ids?` (uuid[]), `active` (default true), `created_at`.
- **stylist_services**: `id` (uuid), `stylist_id` → `stylists`, `service_id` → `servicios`.
- **working_hours**: `id` (uuid), `stylist_id`, `location_id`, `day_of_week` (0‑6), `start_time`, `end_time`.
- **location_hours**: `id` (uuid), `location_id`, `day_of_week`, `slot_number`, `start_time`, `end_time`. *(RLS on, lecture publique contrôlée)*
- **time_off**: `id` (uuid), `stylist_id`, `location_id`, `start_datetime`, `end_datetime`, `reason?`, `category` (`vacaciones|baja|descanso|formacion|bloqueo_operativo`, default `bloqueo_operativo`).
- **location_closures**: `id` (uuid), `location_id`, `closure_date`, `start_time?`, `end_time?`, `reason?`, `created_at`, `created_by?`.
  - Check de fenêtre: fermeture complète (`start_time/end_time` null) ou partielle (`start_time < end_time`).
  - Index: `idx_location_closures_location_date_time`.
  - RLS: lecture staff (`admin|staff`) ; certaines mutations sont désormais autorisées à `staff` seulement si les helpers SQL de permission (`current_user_has_permission`, `current_user_permission_scope`, `current_user_can_access_resource`) valident le droit et le scope.
- **bookings**: `id` (uuid), `customer_name/email/phone`, `stylist_id`, `service_id`, `location_id`, `booking_date`, `start_time`, `end_time`, `status` (`pending|confirmed|needs_replan|cancelled|completed`), `notes?`, `replan_reason?`, `replan_marked_at?`, `created_at`, `slot_range` (generated `tsrange`).
  - Contraintes de robustesse actives: `bookings_start_before_end` (`start_time < end_time`) + `bookings_no_overlap` (exclusion `gist` par `stylist_id + slot_range` pour statuts `pending|confirmed|needs_replan`).
  - Index agenda ajoutés: `idx_bookings_stylist_date_status_start`, `idx_bookings_location_date_status_start`, `idx_bookings_service_date`, `idx_working_hours_stylist_location_day`, `idx_time_off_stylist_location_start_end`.
- **booking_requests**: table d’idempotence pour création réservation (`source`, `idempotency_key`, `request_hash`, `status`, `booking_id`, `http_status`, `response_body`, `error_code`, `request_id`, `latency_ms`, timestamps), index unique `(source, idempotency_key)`.
- Fonctions SQL réservations V2:
  - `check_booking_slot_v2`: validation centralisée d’un créneau.
  - `create_booking_atomic_v2`: création atomique (source de vérité API create).
  - `get_availability_slots_v2`: génération des slots disponibilité avec `reason_code`.
  - Guard supplémentaire planifié/apporté par migration: refus des créneaux hors `location_hours` (`outside_location_hours`).
  - `mark_bookings_needs_replan_v2`: marquage automatique des réservations impactées.
  - Triggers actifs: `trg_mark_replan_working_hours_v2`, `trg_mark_replan_time_off_v2`, `trg_mark_replan_location_closures_v2`.
- **customer_profiles**: profil CRM étendu (`customer_name/email/phone`, `birth_date`, `marital_status`, `has_children`, `hobbies`, `occupation`, `preferred_contact_channel`, `marketing_consent`, `internal_notes_summary`, audit `created_by/updated_by`, timestamps).
  - Index: `customer_profiles_email_unique` (partiel), `customer_profiles_phone_unique` (partiel normalisé), `idx_customer_profiles_name`.
- **customer_notes**: notes CRM horodatées liées au profil client (`customer_profile_id`, `note`, `note_type`, `created_by`, `created_at`).
  - Index: `idx_customer_notes_profile_created_at`.
- **imagenes_galeria**: `id` (int8), `descripcion`, `imagen_url`, `fecha`, `created_at`.
- **configuracion**: `id` (int8), `clave` (unique), `valor`, `descripcion?`, `created_at`, `updated_at`.
  - Clés opérationnelles réservations matérialisées: `booking_slot_interval_minutes=15`, `booking_buffer_minutes=0`, `booking_max_advance_days=90`, `booking_min_advance_hours=2`, `business_timezone=Europe/Zurich`.
- **user_roles**: `id` (uuid → auth.users), `role` (default `staff`), `created_at`, `updated_at`.
- **stylist_users**: `id` (uuid), `user_id` → auth.users, `stylist_id` → stylists.

### Tables Boutique
- **productos** *(RLS on)*: `id` (int), `nombre`, `descripcion?`, `precio`, `precio_original?`, `stock` (default 0), `categoria?`, `imagen_url?`, `stripe_product_id?`, `stripe_price_id?`, `activo` (default true), `destacado` (default false), `orden` (default 0), `created_at`, `updated_at`.
- **categorias_productos** *(RLS on)*: `id`, `nombre`, `descripcion?`, `imagen_url?`, `orden`, `activa` (default true), `created_at`.
- **pedidos** *(RLS on, deny-by-default explicite)*: `id`, `cliente_*`, `total`, `stripe_payment_intent_id?`, `stripe_session_id?`, `estado` (default `pendiente`), `created_at`, `updated_at`.
  - Index uniques partiels: `pedidos_stripe_session_id_unique_idx`, `pedidos_stripe_payment_intent_id_unique_idx`.
- **items_pedido** *(RLS on, deny-by-default)*: `id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`, `created_at`.
- **carrito_sesiones** *(RLS on, deny-by-default)*: `id`, `session_id` (unique), `cliente_email?`, `created_at`, `updated_at`.
- **items_carrito** *(RLS on, deny-by-default)*: `id`, `carrito_id`, `producto_id`, `cantidad` (default 1), `created_at`, `updated_at`.

### Buckets (Storage)
Publics:
- `fotos_peluqueria`
- `estilistas`
- `stylists`
- `centros`
- `hero_images`

**Mapping `getImageUrl()`**:
- `estilistas/` ou `stylists/` → bucket `estilistas`.
- `centros/` → bucket `centros`.
- Autre path relatif → bucket `hero_images`.
- URL absolue ou `/...` → utilisée telle quelle.

### Relations critiques
- Un **styliste** travaille dans plusieurs **centres** et possède plusieurs **horaires**.
- Un **centre** peut avoir plusieurs plages horaires par jour (`location_hours.slot_number`).
- Un **styliste** peut offrir plusieurs **services** (`stylist_services`).
- Un **styliste** peut avoir des périodes **time_off**.
- Une **réservation** associe client + service + styliste + centre + date/heure.

### RLS / Sécurité
- RLS activée sur : `bookings`, `booking_requests`, `customer_profiles`, `customer_notes`, `configuracion`, `imagenes_galeria`, `locations`, `servicios`, `stylists`, `stylist_services`, `working_hours`, `time_off`, `location_hours`, `location_closures`, `user_roles`, `stylist_users`, `productos`, `categorias_productos`, `pedidos`, `items_pedido`, `carrito_sesiones`, `items_carrito`.
- `bookings` (phase sécurité):
  - suppression des policies publiques (`INSERT public` / `SELECT public`).
  - policies actives: `bookings_staff_select` + `bookings_staff_update` pour `authenticated` avec rôle `admin|staff`.
- `booking_requests`:
  - RLS activée.
  - policy `booking_requests_staff_select` pour `authenticated` avec rôle `admin|staff`.
- `customer_profiles` / `customer_notes`:
  - RLS activée.
  - lecture/écriture réservées aux rôles internes `admin|staff`.
  - `customer_notes` exige `created_by = auth.uid()` à l’insertion.
- Hardening post-robustez (2026-02-27):
  - suppression des policies permissives `FOR ALL ... USING true` sur tables admin core.
  - policies par opération (`SELECT` public seulement où nécessaire; `INSERT/UPDATE/DELETE` réservés à `admin`).
  - helper SQL `public.current_user_role()` (`SECURITY DEFINER`, `search_path=public`) utilisé dans les policies.
  - `public.handle_new_user()` durcie avec `search_path=public` + `EXECUTE` révoqué à `PUBLIC/anon/authenticated`.
- Politiques attendues (docs) :
  - Clients/anon : lecture services/stylists/centres + création réservations.
  - Admin : accès complet.
  - Storage : upload/lecture publique sur buckets d’images.

## Design System (actuel)
### Variables clés (`src/styles/theme.css`)
- **Primary** `#c8981d`
- **Secondary** `#212121`
- **Accent** `#000000`
- **Coral** `#E76F51`
- **Text dark** `#1a1a1a`
- **Text light** `#ffffff`
- **Text medium** `#e0e0e0f2`
- **BG dark** `#0c0c0c`
- **BG card** `#212121`
- **BG light** `#ffffff`

### Typographie
- `Montserrat` (principale)
- `Dancing Script` (décorative)

## Améliorations récentes (regroupées, toutes conservées)
### Qualité & maintenance
- Système de styles centralisé par variables CSS.
- Optimisations linter, suppression variables/fonctions inutilisées.
- Échappement correct des caractères spéciaux (accessibilité).
- Conversion des `<img>` vers `Next/Image`.
- Ajout de commentaires explicatifs ciblés.
- Résolution warnings React (clés dupliquées).

### UI/UX global
- Cohérence visuelle (theme.css appliqué partout, admin inclus).
- Design responsive unifié (admin, formulaires, calendrier, stats).
- Design unifié de cartes (services, galerie, stylists, centres, CRM).
- Thème sombre cohérent dans tout l’admin.
- Interface multilingue cohérente : traduction complète de la gestion utilisateurs en FR.
- Amélioration UX (hover primaire + curseur pointer nav admin).
- Prévisualisation d’images (services, galerie, config hero).
- Formulaires responsifs et homogènes.
- États de chargement visuels sur formulaires.

### Navigation & Admin
- AdminNav centralisé + barre latérale unique.
- Sidebar pliable (collapse) + fermée par défaut.
- Fermeture automatique au clic externe.
- Menu hamburger sur mobile (expérience mobile préservée).
- Suppression du bouton Dashboard redondant.
- Adaptation contextuelle selon rôle + page.
- Navigation enrichie (accès direct config, stats, boutique, etc.).
- Système de gestion des utilisateurs (rôles admin/employé + association styliste).
- Flux d’invitation : propriétaire crée les comptes, admins attribuent rôle + styliste.
- UI gestion utilisateurs refaite en cartes + corrections de contraste + meilleure responsivité.

### Réservations / Calendrier
- Correctif timezone (affichage bon jour).
- Calendrier mieux centré et plus lisible.
- Chargement immédiat après sélection d’une date.
- Filtrage par styliste, centre, date.
- Cartes de réservation avec bordure jaune distinctive.
- Sélecteur d’état adapté mobile.
- Statut `needs_replan` intégré dans les filtres/admin badges/sélecteurs de statut.
- Retour depuis le détail vers le calendrier: le jour consulté n’est plus conservé comme sélection visuelle (plus de bordure bleue persistante).
- Le champ date des filtres admin utilise un rendu custom (lisible iPad/tablette) et ouvre directement la vue détail du jour sélectionné.
- Seed démo ajouté sur `bookings`: 100 réservations créées entre le 26/02/2026 et le 31/03/2026, réparties sur 4 statuts (`pending|confirmed|completed|cancelled`), 5 stylistes et 4 centres.

### CRM & Stats
- CRM en cartes, meilleure lisibilité.
- Affichage d’images dans stats (stylists + centres).
- Filtrage avancé par période (semaine/mois/année/custom).
- Les tendances de statistiques stylists/centres affichent maintenant une série quotidienne (barres par jour du range) au lieu d’un agrégat mensuel.
- Les graphiques de tendance journalière utilisent une échelle fixe 0-15 et des barres empilées par statut (en attente jaune, confirmée bleu, terminée vert; annulée conservée dans le total).
- Les graphiques de tendance journalière incluent désormais l’état annulé en rouge dans les barres, et un popover flottant (hover/touch) affiche les volumes par statut du jour sélectionné.
- Sur Safari iPad/tablette, les barres de tendance sont rendues en segments positionnés en absolu (hauteurs en px) pour éviter les disparitions visuelles; le popover est désormais « pinable » au tap/click, rendu en `position: fixed` (au viewport) pour éviter le clipping lors du changement de jour, et se ferme au toucher/clic global hors barres journalières.
- Les requêtes stats utilisent des bornes `YYYY-MM-DD` sur `booking_date` pour éviter les trous de données liés au format datetime/timezone.
- Les raccourcis de période ont été ajustés pour inclure `Semaine prochaine` et `Mois prochain` (mois naturel du jour 1 au dernier jour).
- Filtres mobile optimisés (menus déroulants).
- Fermeture automatique des menus de filtre après sélection.
- Inputs date custom avec icônes calendrier.
- Graphiques responsives + ordre chronologique corrigé.
- Étiquettes adaptatives (desktop vs mobile).
- Périodes custom plus claires.
- Support périodes longues (affichage compact mobile, complet desktop).
- Fonds légèrement plus sombres pour améliorer la lisibilité des graphiques.
- Détection périodes vides avec message explicite.

### Landing Page & Contenu
- Parallax section services.
- Images services avec ombre blanche subtile.
- Background services distinct desktop/mobile (via Supabase).
- Animations séquentielles Hero (titre, texte, CTA).
- Fallback robustes en cas d’erreur image.
- Galerie: carrousel + miniatures + indicateurs mobiles + swipe.
- Effets modernes (scale hover, gradients, transitions).
- Section location refondue (parallax, maps, layout équilibré).
- Multi‑centres (boutons + flèches mobile).
- Horaires groupés par jour (multiples plages).
- Bouton directions Google Maps + CTA “Réservez Maintenant”.
- `backgroundStyle` constant pour location.

### Boutique
- Boutique complète (catalogue, panier, checkout, orders).
- Panier global persistant (React Context + localStorage).
- Navigation unifiée : accès panier intégré à la navigation principale.
- Checkout sécurisé via Stripe Checkout.
- Webhooks Stripe + fallback manuel.
- Synchronisation bidirectionnelle produits Supabase ↔ Stripe.
- Gestion d’erreurs de paiement.
- Support multi‑pays.
- Interface responsive boutique (mobile/desktop + filtres catégorie).
- Gestion commandes en **pestañas** (produits/commandes) :
  - états FR : **En Attente**, **En Traitement**, **Traité**.
  - détails client + items + paiement.
  - modification d’état en temps réel.
  - API dédiée `/api/boutique/pedidos` + `/[id]`.
  - interface responsive + horodatage complet.

## Notes / Divergences & Legacy Docs
- **README / SUPABASE_SETUP** mentionnent un bucket `coiffure-ciwan` → **non présent** dans le projet actuel.
- `env.example` **n’inclut pas** `NEXT_PUBLIC_SUPABASE_ANON_KEY` alors qu’il est requis.
- `BOUTIQUE_README` liste des IDs Stripe (ex: `prod_SlTHjQcCx2TBgN`) → **exemples**, pas source de vérité.
- Docs historiques décrivent des endpoints (`/api/services`, `/api/locations`) **non implémentés** dans le code actuel.
- Palette historique (ex: `#FFD700`) ≠ palette actuelle (`#c8981d`).
- Palette legacy détaillée (docs) :
  - Primary `#FFD700`, Secondary `#212121`, Accent `#000000`, Text dark `#1a1a1a`, Text light `#ffffff`, Text medium `#E0E0E0`, Coral `#E76F51`.
- `LocationManagement` utilise désormais `locations` (et non plus le legacy `centros`) pour les writes critiques via API dédiée.
- `pedidos.estado` est utilisé avec plusieurs vocabulaires : DB default `pendiente`, admin `pendiente|en_traitement|traite`, webhook `pagado|fallido` (à harmoniser).

## Docs & Scripts utiles
- `BOUTIQUE_README.md`, `STRIPE_INTEGRATION.md`, `STRIPE_CHECKOUT_SETUP.md`, `WEBHOOK_TROUBLESHOOTING.md`.
- Roadmap implémentation réservations V2 par phases: `Docs/plan-implementacion-reservas-v2.md`.
  - Le plan V2 est maintenant majoritairement implémenté sur le noyau (RPC SQL atomique v2, fenêtre 90j/2h, statut `needs_replan` bloquant, timezone `Europe/Zurich`, slots/configs opérationnels).
- Plan de hardening securite post-robustez (RLS/grants/PII/boutique) : `Docs/plan-hardening-seguridad-post-robustez.md`.
- Plan d’implémentation CRM fiche client (maître-détail + profil étendu + notes) : `Docs/plan-crm-ficha-cliente.md`.
- Migración aplicada de hardening B/C/D: `migrations/20260227_security_postrobustez_phase_bcd.sql`.
- Migración aplicada de cierre boutique: `migrations/20260227_security_boutique_final_hardening_phase1.sql`.
- Migración aplicada de extensión: `migrations/20260227_move_btree_gist_to_extensions.sql`.
- Migración aplicada Reservas V2.1 Fase A: `migrations/20260227_reservas_v2_phase_a_core.sql`.
- Migraciones aplicadas Reservas V2.1 Fase B: `migrations/20260227_reservas_v2_phase_b_engine.sql`, `migrations/20260227_reservas_v2_phase_b_availability.sql`, `migrations/20260227_reservas_v2_phase_b_availability_fix.sql`.
- Migración aplicada Reservas V2.1 Fase C (needs_replan): `migrations/20260227_reservas_v2_phase_c_needs_replan.sql`.
- Migración aplicada guard `location_hours`: `migrations/20260227_reservas_v2_location_hours_guard.sql` (version `20260227210129`, `reservas_v2_location_hours_guard_20260227`).
- Migraciones aplicadas CRM fase 1: `migrations/20260227_crm_customer_profiles_phase1.sql`, `migrations/20260227_crm_customer_profiles_grants_fix_phase1.sql`.
- Script de verificación continua: `scripts/security/postrobustez_security_checks.sql`.
- Checklist + rollback: `Docs/security-release-checklist.md`, `Docs/security-rollback-runbook.md`.
- Paquete operativo para plantilla single-tenant (resumen + playbook agente): `docs/plantilla-operativa/contexto-resumen.md`, `docs/plantilla-operativa/implementacion-agente.md`.
- Scripts DB legacy: `boutique_tables.sql`, `supabase_reservation_system.sql`, `location_hours_table.sql`, `fix_pending_orders.sql`, `fix_stripe_sync.sql`, `update_stripe_ids.sql`, etc.

## Etat securite (2026-02-27)
- Advisors security: warnings techniques fermés (`rls_enabled_no_policy`, `extension_in_public`) après migration.
- Restent uniquement des actions plateforme manuelles:
  - `auth_leaked_password_protection` (à activer dans Supabase Auth).
  - `vulnerable_postgres_version` (upgrade Postgres à planifier/appliquer).

## Fonctionnalités à venir (roadmap)
- Notifications WhatsApp.
- Système d’évaluation par centre.
- Vue calendrier avancée admin.
- Gestion temps libre stylists (blocage horaires).
- CRM avancé (segmentation, campagnes).
- Rapports & analytics complets par centre/styliste/service.
