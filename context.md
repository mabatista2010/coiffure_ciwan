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
- **Framer Motion 12.4.10**.
- `lucide-react`, `react-icons`.

### Backend / Intégrations
- **Next.js Route Handlers** (`src/app/api`).
- **Supabase** (DB PostgreSQL, Auth, Storage, RLS) via `@supabase/supabase-js@2.49.1`.
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
- `src/lib/` : utilitaires (Supabase, Stripe helpers, calendrier, roles).
- `src/styles/` : `theme.css`, `parallax.css`.
- `public/` : assets statiques.
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

### Admin
- `/admin` : configuration (services, galerie, stylists, centres, hero)
- `/admin/reservations` : gestion réservations
- `/admin/reservations/nueva` : création manuelle de réservation
- `/admin/crm` : CRM clients
- `/admin/stylist-stats` : stats stylists
- `/admin/location-stats` : stats centres
- `/admin/user-management` : rôles & utilisateurs
- `/admin/boutique` : produits + commandes
- `/admin/webhook-diagnostics` : diagnostic Stripe

> Note : `src/app/admin/reservations/page.tsx.bak` est un backup.

## APIs (Route Handlers)
### Réservation
- `GET /api/reservation/availability`
  - Paramètres: `date`, `stylistId`, `locationId`, `serviceId`.
  - Génère des slots toutes **15 min** en tenant compte de `working_hours`, `time_off`, `bookings` (status `pending|confirmed`) et durée du service.
- `POST /api/reservation/create`
  - Calcule `end_time` via `servicios.duration`, vérifie chevauchement et horaires.

### ChatGPT Apps SDK (MCP)
- `GET|POST|DELETE /mcp`
  - Serveur MCP (Apps SDK) avec widget UI intégré (resource `ui://widget/reserva.html`).
  - Tools exposés : `get_welcome`, `list_services`, `list_locations`, `list_stylists`, `get_availability`, `create_booking`.
  - Réponses utilisent `structuredContent` pour synchroniser le widget (centres, stylistes, hero). `get_welcome` renvoie l’image hero configurée + `logo_url`, avec des URLs absolues et `view: "welcome"`. `list_locations` renvoie `view: "locations"` et `list_stylists` renvoie `view: "stylists"` avec des images en URLs absolues. Les tools `list_services`, `get_availability`, `create_booking` n’affichent plus de widget.
  - `create_booking` appelle `/api/reservation/create` (si l’écriture est bloquée côté plan ChatGPT, le tool renvoie un message d’échec).
- `GET /api/chatgpt-preview/locations`
  - Endpoint de preview pour charger les centres (avec images) dans `/chatgpt-preview`.

### Boutique / Stripe
- `POST /api/boutique/stripe`
  - Crée une session **Stripe Checkout**.
  - Refuse tout item sans `stripe_price_id`.
  - Ajoute les infos client + items dans `metadata`.
  - Pays autorisés : **ES, FR, DE, IT, PT, CH, AT, BE, NL, GB, US, CA**.
  - `success_url` / `cancel_url` basées sur `NEXT_PUBLIC_BASE_URL`.
- `POST /api/boutique/stripe/webhook`
  - Traite `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`.
  - Crée/maj les `pedidos` + `items_pedido`.
- `GET /api/boutique/webhook-status`
  - Diagnostics Stripe (config + liste webhooks + événements récents).
- `POST /api/boutique/pedidos/create-from-session`
  - Fallback: crée un `pedido` depuis une `sessionId` Stripe payée.
- `GET /api/boutique/pedidos/session/[sessionId]`
  - Récupère un `pedido` par `stripe_session_id`.
- `GET /api/boutique/pedidos`
  - Liste commandes + items produits.
- `PUT /api/boutique/pedidos/[id]`
  - Met à jour `estado` (valeurs autorisées côté API : `pendiente`, `en_traitement`, `traite`).
- `GET/POST /api/boutique/productos`
  - Liste produits actifs / crée produit + sync Stripe.
- `GET/PUT/DELETE /api/boutique/productos/[id]`
  - CRUD produit + sync Stripe (création de prix si prix change).
- `POST /api/boutique/checkout`
  - **API legacy**: crée `pedido` en `pendiente` sans Stripe (utilisée pour démo / fallback).

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
- Page `/boutique/checkout/demo` (mode démo explicite).

## Panel Admin (Sécurité & UX)
- Auth Supabase par email/password (`AdminLayout`).
- Layout admin avec 3 états (chargement / non‑auth / auth) + formulaire login unifié.
- Vérification de session Supabase sur toutes les routes `/admin/*`.
- **Rôles** : `admin` vs `employee`.
  - Les employés ne voient que `/admin` et `/admin/reservations`.
- **AdminNav** unifiée :
  - Sidebar pliante, fermée par défaut, auto‑close clic externe, hamburger mobile.
  - Navigation role‑based (clients, stats, user‑management, boutique).

### Sections Admin
- **Configuration** (`/admin`)
  - Services, galerie, stylists, centres, hero/images.
  - Uploads Supabase Storage avec preview.
  - Stylists : CRUD, services assignés, horaires par centre/jour (plages multi‑slots).
  - Centres : CRUD complet (nom, adresse, tel, email, description, image) + horaires multiples par jour.
- **Réservations**
  - Calendrier, filtres (date, centre, styliste), statuts.
  - Création manuelle via `/admin/reservations/nueva`.
- **CRM**
  - Carte client + historique des réservations + favoris (centre/styliste/service).
  - `total_spent` basé sur bookings `completed`.
  - Recherche + tri intégrés.
- **Stats**
  - Filtres avancés (semaine/mois/année + période custom).
  - Graphiques responsives + étiquettes adaptatives.
- **Utilisateurs**
  - Gestion roles + association styliste (table `stylist_users`).
  - Suppression: retire uniquement `user_roles` + `stylist_users`.
- **Boutique**
  - Onglets produits/commandes, status visuels, détails client, sync Stripe.
- **Webhooks**
  - `/admin/webhook-diagnostics` pour diagnostic Stripe.

## Supabase : Modèle réel (DB)
### Tables principales
- **servicios**: `id` (int8), `nombre`, `descripcion`, `precio`, `imagen_url`, `duration` (default 30), `active` (default true), `created_at`.
- **locations**: `id` (uuid), `name`, `address`, `phone`, `email`, `description?`, `image?`, `active` (default true), `created_at`.
- **stylists**: `id` (uuid), `name`, `bio?`, `specialties?` (text[]), `profile_img?`, `location_ids?` (uuid[]), `active` (default true), `created_at`.
- **stylist_services**: `id` (uuid), `stylist_id` → `stylists`, `service_id` → `servicios`.
- **working_hours**: `id` (uuid), `stylist_id`, `location_id`, `day_of_week` (0‑6), `start_time`, `end_time`.
- **location_hours**: `id` (uuid), `location_id`, `day_of_week`, `slot_number`, `start_time`, `end_time`. *(RLS off)*
- **time_off**: `id` (uuid), `stylist_id`, `location_id`, `start_datetime`, `end_datetime`, `reason?`.
- **bookings**: `id` (uuid), `customer_name/email/phone`, `stylist_id`, `service_id`, `location_id`, `booking_date`, `start_time`, `end_time`, `status` (`pending|confirmed|cancelled|completed`), `notes?`, `created_at`.
- **imagenes_galeria**: `id` (int8), `descripcion`, `imagen_url`, `fecha`, `created_at`.
- **configuracion**: `id` (int8), `clave` (unique), `valor`, `descripcion?`, `created_at`, `updated_at`.
- **user_roles**: `id` (uuid → auth.users), `role` (default `employee`), `created_at`, `updated_at`.
- **stylist_users**: `id` (uuid), `user_id` → auth.users, `stylist_id` → stylists.

### Tables Boutique
- **productos** *(RLS off)*: `id` (int), `nombre`, `descripcion?`, `precio`, `precio_original?`, `stock` (default 0), `categoria?`, `imagen_url?`, `stripe_product_id?`, `stripe_price_id?`, `activo` (default true), `destacado` (default false), `orden` (default 0), `created_at`, `updated_at`.
- **categorias_productos** *(RLS off)*: `id`, `nombre`, `descripcion?`, `imagen_url?`, `orden`, `activa` (default true), `created_at`.
- **pedidos** *(RLS off)*: `id`, `cliente_*`, `total`, `stripe_payment_intent_id?`, `stripe_session_id?`, `estado` (default `pendiente`), `created_at`, `updated_at`.
- **items_pedido** *(RLS off)*: `id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`, `subtotal`, `created_at`.
- **carrito_sesiones** *(RLS off)*: `id`, `session_id` (unique), `cliente_email?`, `created_at`, `updated_at`.
- **items_carrito** *(RLS off)*: `id`, `carrito_id`, `producto_id`, `cantidad` (default 1), `created_at`, `updated_at`.

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
- RLS activée sur : `bookings`, `configuracion`, `imagenes_galeria`, `locations`, `servicios`, `stylists`, `stylist_services`, `working_hours`, `time_off`, `user_roles`, `stylist_users`.
- RLS désactivée sur : `location_hours`, `productos`, `categorias_productos`, `pedidos`, `items_pedido`, `carrito_sesiones`, `items_carrito`.
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

### CRM & Stats
- CRM en cartes, meilleure lisibilité.
- Affichage d’images dans stats (stylists + centres).
- Filtrage avancé par période (semaine/mois/année/custom).
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
- `LocationManagement` utilise encore la table `centros` (legacy) alors que la DB réelle utilise `locations`.
- `pedidos.estado` est utilisé avec plusieurs vocabulaires : DB default `pendiente`, admin `pendiente|en_traitement|traite`, webhook `pagado|fallido` (à harmoniser).

## Docs & Scripts utiles
- `BOUTIQUE_README.md`, `STRIPE_INTEGRATION.md`, `STRIPE_CHECKOUT_SETUP.md`, `WEBHOOK_TROUBLESHOOTING.md`.
- Scripts DB: `boutique_tables.sql`, `supabase_reservation_system.sql`, `location_hours_table.sql`, `fix_pending_orders.sql`, `fix_stripe_sync.sql`, `update_stripe_ids.sql`, etc.

## Fonctionnalités à venir (roadmap)
- Notifications WhatsApp.
- Système d’évaluation par centre.
- Vue calendrier avancée admin.
- Gestion temps libre stylists (blocage horaires).
- CRM avancé (segmentation, campagnes).
- Rapports & analytics complets par centre/styliste/service.
