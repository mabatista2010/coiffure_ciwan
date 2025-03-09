# Coiffure Ciwan - Contexte du Projet

## Description Générale

Coiffure Ciwan est une application web pour un salon de coiffure masculin moderne avec plusieurs centres. L'application comprend une landing page principale qui présente des informations sur le salon de coiffure et un système de réservation multicentrique qui permet aux clients de réserver des rendez-vous dans n'importe lequel des cinq centres disponibles.

## Objectif

L'objectif principal de l'application est de :

1. Fournir une présence en ligne professionnelle pour le salon de coiffure Coiffure Ciwan
2. Permettre aux clients de faire des réservations en ligne en sélectionnant le centre, le service, le coiffeur, la date et l'heure
3. Offrir aux administrateurs un tableau de bord pour gérer les réservations, les services, les coiffeurs et le contenu du site
4. Fournir un système de CRM pour le suivi des clients et l'analyse de leurs habitudes

## Langue de l'Application

**IMPORTANT** : L'application est entièrement en français. Tous les textes, libellés, messages et contenus doivent être en français. Cela inclut :
- L'interface utilisateur
- Les messages d'erreur et de confirmation
- Les e-mails et notifications
- Le contenu dynamique
- La documentation

Lors du développement de nouvelles fonctionnalités ou de la modification de fonctionnalités existantes, il est essentiel de maintenir la cohérence linguistique en français.

## Stack Technologique

### Frontend
- **Next.js 15** : Framework React pour le rendu côté serveur et la génération de sites statiques
- **React 19** : Bibliothèque pour construire des interfaces utilisateur
- **TypeScript** : Surensemble typé de JavaScript pour un développement plus robuste
- **TailwindCSS 4** : Framework CSS utility-first pour un design rapide et responsive
- **Framer Motion** : Bibliothèque pour des animations fluides en React
- **CSS Variables** : Système centralisé de variables CSS pour la gestion des styles

### Backend
- **Next.js API Routes** : Endpoints serverless pour la logique métier
- **Supabase** : Plateforme de backend en tant que service (BaaS) qui fournit :
  - Base de données PostgreSQL
  - Authentification et autorisation
  - Stockage de fichiers
  - Politiques de sécurité au niveau des lignes (RLS)

### Outils de Développement
- **ESLint** : Linter pour maintenir la qualité du code avec règles strictes:
  - Vérification des types explicites (sans any)
  - Détection des variables non utilisées
  - Échappement correct des caractères spéciaux
  - Optimisation des images avec Next.js
- **TypeScript** : Pour le typage statique avec couverture complète du code
- **Next.js Image Component** : Pour l'optimisation automatique des images
- **PostCSS** : Pour le traitement des styles avec le plugin @tailwindcss/postcss

## Améliorations Récentes
- **Système de Styles Centralisé** : Création d'un système unifié de styles basé sur des variables CSS pour une cohérence visuelle et une maintenance simplifiée
- **Page Équipe** : Ajout d'une page dédiée à la présentation de l'équipe d'estilistas accessible depuis la navigation principale
- **Optimisation du Code** : Correction des problèmes de typage et élimination des `any` explicites
- **Accessibilité** : Échappement correct des caractères spéciaux pour améliorer la compatibilité
- **Performance des Images** : Conversion des balises `<img>` standard vers le composant `<Image>` de Next.js
- **Qualité du Code** : Élimination des variables et fonctions non utilisées
- **Maintenance** : Ajout de commentaires explicatifs pour faciliter le développement futur
- **Gestion des Centres** : Ajout d'une interface complète pour gérer les centres dans le tableau de bord administratif
- **Sécurité Renforcée** : Mise en place d'un système d'authentification centralisé pour toutes les routes administratives
- **Système CRM** : Implémentation d'un système de gestion de la relation client pour suivre les habitudes des clients
- **Navigation Améliorée** : Refonte de la navigation du panel d'administration avec un composant AdminNav centralisé
- **Cohérence Visuelle** : Application des styles définis dans theme.css à toutes les interfaces administratives
- **Affichage des Images des Estilistas et Centres** : Amélioration des pages de statistiques avec l'affichage des images correspondantes pour une meilleure identification
- **Interface CRM en Cartes** : Conversion de la liste de clients en un design de cartes visuellement attrayant pour une meilleure expérience utilisateur
- **Design Responsive Unifié** : Application d'un design responsive cohérent à toutes les sections administratives, y compris les réservations et le calendrier
- **Navigation Administrative Enrichie** : Ajout d'un accès direct au panel de configuration pour la gestion des estilistas, centres et autres éléments
- **Thème Sombre Cohérent** : Application d'un thème sombre uniforme à toutes les interfaces d'administration pour améliorer la lisibilité et réduire la fatigue visuelle

## Structure de l'Application

### Structure des Dossiers
- `/src/app` : Pages et routes de l'application (Next.js App Router)
- `/src/components` : Composants réutilisables
- `/src/lib` : Utilitaires, configurations et types
- `/src/styles` : Styles globaux et système de design centralisé
- `/public` : Fichiers statiques (images, polices, etc.)

### Pages Principales
- `/` : Landing page principale
- `/equipo` : Page de présentation de l'équipe d'estilistas
- `/reservation` : Système de réservation pour les clients
- `/admin` : Tableau de bord d'administration
- `/admin/reservations` : Gestion des réservations
- `/admin/crm` : Gestion de la relation client et suivi des clients
- `/admin/stylist-management` : Gestion des estilistas
- `/admin/location-management` : Gestion des centres

## Fonctionnalités Implémentées

### Landing Page
- **Section Hero** : Présentation principale avec image de fond et appel à l'action
- **Services** : Affiche les services proposés avec les prix
- **Galerie** : Affiche des images des travaux réalisés
- **Localisation** : Affiche l'adresse et la carte des centres
- **Contact** : Informations de contact et formulaire

### Page Équipe
- **Présentation des Estilistas** : Affiche tous les estilistas actifs avec leurs photos, spécialités et biographies
- **Mise en Page Responsive** : Affichage adapté à tous les dispositifs (1 colonne sur mobile, 2 sur tablette, 3 sur desktop)
- **Animations Fluides** : Animations d'entrée pour améliorer l'expérience utilisateur
- **Intégration avec la Base de Données** : Récupération dynamique des données des estilistas depuis Supabase

### Système de Réservation
Le système de réservation suit un flux en 6 étapes :

1. **Sélection du Service** : Le client choisit le service souhaité
2. **Sélection du Centre** : Le client choisit l'un des cinq centres disponibles
3. **Sélection du Coiffeur** : Le client choisit un coiffeur qui propose le service dans le centre sélectionné
4. **Sélection de la Date et de l'Heure** : Le client choisit une date et une heure disponibles parmi tous les créneaux générés à partir des plages horaires du coiffeur
5. **Informations du Client** : Le client fournit ses coordonnées
6. **Confirmation** : Un résumé de la réservation est affiché et confirmé

### Tableau de Bord d'Administration
- **Interface en Français** : L'interface a été entièrement traduite en français
- **Navigation Unifiée** : Barre de navigation administrative centralisée avec accès à toutes les sections
- **Gestion des Réservations** : Voir, créer, modifier et annuler des réservations
- **Filtrage par Date et Centre** : Filtrer les réservations par date et centre
- **Filtrage par Estilista** : Possibilité de filtrer les réservations et le calendrier par estilista avec mise à jour dynamique de la vue
- **Mise en Page Optimisée** : Organisation du panneau de filtres dans une colonne latérale pour mettre en valeur le calendrier
- **Tarjetas con Bordes Distintivos** : Bordure jaune distinctive pour les cartes de réservation améliorant la lisibilité et la séparation visuelle
- **Design Responsive Amélioré** : Sélecteur d'état de réservation adapté aux appareils mobiles, positionné en bas des cartes sur petit écran
- **Changement de Statut** : Marquer les réservations comme confirmées, annulées ou terminées
- **Localisation des Dates** : Format des dates adapté à la locale française (fr-FR)
- **Gestion Complète des Estilistas** : Ajouter, modifier et supprimer des estilistas avec les informations complètes
- **Gestion Intégrée des Horaires** : Configurer les horaires de travail pour chaque estilista par centre et par jour, avec possibilité de sélectionner des plages horaires spécifiques parmi les horaires du centre
- **Gestion des Services par Estilista** : Assigner des services à des estilistas et les modifier directement dans le même formulaire
- **Upload d'Images** : Téléverser des images pour les estilistas avec prévisualisation
- **Gestion Complète des Centres** : Interface dédiée pour ajouter, modifier et supprimer des centres avec toutes leurs informations (nom, adresse, téléphone, email, description, image et horaires d'ouverture multiples)
- **Configuration des Horaires des Centres** : Possibilité de définir plusieurs plages horaires par jour pour chaque centre (par exemple, matin et après-midi)
- **Prévisualisation des Images** : Fonctionnalité améliorée pour prévisualiser les images avant leur téléversement dans toutes les sections (services, galerie, configuration)
- **Système CRM Clients** : Interface pour suivre les clients, leurs visites et leurs préférences
  - **Liste des Clients** : Vue d'ensemble de tous les clients avec filtrage et tri
  - **Profils Détaillés** : Informations complètes sur chaque client, incluant historique des visites et préférences
  - **Statistiques par Client** : Nombre de visites, dépenses totales, centres et estilistas préférés
  - **Historique des Réservations** : Liste complète des réservations passées par client
  - **Interface Visuelle** : Présentation des clients en format carte pour une meilleure expérience utilisateur
- **Statistiques Visuelles** : Tableaux de bord avec informations visuelles pour les estilistas et centres
  - **Affichage des Images** : Visualisation des photos des estilistas et centres dans leurs pages de statistiques
  - **Interface Responsive** : Design adapté à tous les dispositifs, y compris mobiles et tablettes
- **Calendrier Intuitif** : Interface de calendrier améliorée avec code couleur pour visualiser rapidement la disponibilité
  - **Filtrage Contextuel** : Affichage des réservations spécifiques à l'estilista sélectionné dans le calendrier
  - **Indicateurs Visuels** : Affichage de points indiquant les jours avec réservations
  - **Navigation Optimisée** : Boutons de navigation entre les mois plus visibles et mieux espacés
  - **Adaptation au Contexte** : Titre du calendrier indiquant l'estilista sélectionné pour une meilleure orientation
- **Design Sombre** : Thème sombre cohérent pour toutes les interfaces d'administration qui améliore la lisibilité et réduit la fatigue visuelle

### Système de Styles Centralisé
- **Variables CSS** : Définition centralisée de toutes les couleurs et propriétés visuelles dans `/src/styles/theme.css`
- **Classes Utilitaires** : Ensemble de classes prédéfinies pour appliquer les styles de manière cohérente
- **Intégration avec Tailwind** : Les variables CSS sont utilisées comme base des couleurs dans la configuration de Tailwind
- **Maintenance Simplifiée** : Tous les changements de style peuvent être faits à un seul endroit et se propagent automatiquement

### Système de Sécurité Administratif
- **Authentification Centralisée** : Utilisation d'un layout qui vérifie l'authentification pour toutes les routes sous `/admin`
- **Protection des Routes** : Toutes les pages du panel d'administration, y compris les sous-routes comme `/admin/reservations`, sont protégées par authentification
- **Vérification de Session** : Vérification automatique de la présence d'une session Supabase valide
- **Formulaire de Connexion Unifié** : Interface de connexion cohérente pour toutes les routes administratives
- **Gestion d'État de l'Authentification** : Trois états possibles (chargement, non authentifié, authentifié) pour une expérience utilisateur fluide

### APIs Implémentées
- **API de Disponibilité** : Calcule les horaires disponibles selon le service, le centre, le coiffeur et la date, en tenant compte de toutes les plages horaires de travail du coiffeur
- **API de Création de Réservations** : Crée de nouvelles réservations en vérifiant la disponibilité en temps réel et que l'horaire est dans une plage horaire de travail valide
- **API de Stockage** : Gestion des téléversements d'images avec politiques de sécurité RLS

## Base de Données (Supabase)

### Tables Principales
- **servicios** : Services proposés par le salon de coiffure
- **locations** : Centres du salon de coiffure
- **stylists** : Coiffeurs qui travaillent dans les centres
- **stylist_services** : Relation entre coiffeurs et services
- **working_hours** : Horaires de travail des coiffeurs par centre et par jour de la semaine
- **location_hours** : Horaires d'ouverture des centres par jour de la semaine, avec support pour plusieurs plages horaires par jour
- **time_off** : Temps libre programmé pour les coiffeurs
- **bookings** : Réservations des clients
- **imagenes_galeria** : Images pour la galerie
- **configuracion** : Configurations générales du site

### Politiques de Sécurité
- **Clients** : Peuvent lire les services, les coiffeurs et les centres, et créer des réservations
- **Administrateurs** : Ont un accès complet à toutes les tables
- **Stockage** : Politiques pour permettre l'upload et la lecture des images dans les buckets spécifiques

### Buckets de Stockage
- **fotos_peluqueria** : Stockage général pour les images du site
- **estilistas** : Images des profils des coiffeurs
- **stylists** : Alias alternatif pour les images des coiffeurs
- **centros** : Images des centres de coiffure

### Relations Critiques
- Un **estilista** peut travailler dans plusieurs **centres**
- Un **estilista** peut avoir plusieurs **plages horaires de travail** par jour dans un même centre
- Un **centre** peut avoir plusieurs **plages horaires d'ouverture** par jour (ex: 9h-13h et 16h-20h)
- Un **estilista** doit avoir des **horaires de travail** configurés pour chaque centre et jour où il travaille
- Un **estilista** peut sélectionner quelles plages horaires spécifiques il travaille parmi les plages disponibles du centre
- Un **estilista** peut offrir plusieurs **services**

## Caractéristiques de Design
- **Design Responsive** : Adapté aux appareils mobiles, tablettes et ordinateurs de bureau
- **Système de Design Unifié** : Tous les composants suivent le même système de design basé sur des variables CSS
- **Palette de Couleurs** : 
  - Primaire : #FFD700 (jaune doré) - `--color-primary`
  - Secondaire : #212121 (noir logo) - `--color-secondary`
  - Accent : #000000 (noir total) - `--color-accent`
  - Texte foncé : #1a1a1a - `--color-text-dark`
  - Texte clair : #ffffff - `--color-text-light`
  - Texte moyen : #E0E0E0 - `--color-text-medium`
  - Accent Coral : #E76F51 (coral pour les titres principaux) - `--color-coral`
- **Typographie** :
  - Principale : Montserrat (sans-serif) - `--font-sans`
  - Décorative : Dancing Script (cursive) - `--font-decorative`

## Fonctionnalités à Venir

### Phase 2 : Intégrations Futures
- **Notifications par WhatsApp** : Confirmations, rappels et suivi
- **Système d'Évaluation par Centre** : Permettre aux clients d'évaluer leur expérience
- **Vue Calendrier Avancée** : Pour le tableau de bord d'administration
- **Gestion du Temps Libre** : Blocage des horaires pour les coiffeurs
- **Expansion du CRM** : Ajout de fonctionnalités avancées comme la segmentation des clients et les campagnes marketing
- **Rapports et Analyses** : Tableaux de bord statistiques pour analyser les performances par centre, estilista et service

## Déploiement
- **Vercel** : Plateforme recommandée pour le déploiement de l'application
- **Supabase** : Hébergement de la base de données et stockage

## Accès et Authentification
- **Clients** : Ne nécessitent pas d'authentification pour faire des réservations
- **Administrateurs** : 
  - Authentification obligatoire via Supabase Auth pour accéder à toutes les routes sous `/admin`
  - Implémentation via un layout React qui vérifie la session utilisateur
  - Redirection automatique vers le formulaire de connexion pour toutes les routes protégées
  - Protection complète de toutes les sous-routes administratives
  - Interface utilisateur adaptée pour les différents états d'authentification (chargement, connexion, authentifié)

## Maintenance et Mise à Jour
- Le contenu dynamique (services, images, centres) est géré depuis le tableau de bord d'administration
- Les styles visuels sont gérés via le système centralisé dans `/src/styles/theme.css`
- Les mises à jour de code nécessitent un déploiement sur Vercel
- La configuration de Supabase se fait via sa console ou par des scripts SQL
- **Vérification Qualité** : Les pull requests doivent passer toutes les vérifications ESLint avant fusion
- **Sécurité** : Vérifier régulièrement que toutes les routes administratives sont correctement protégées

## Points d'Attention Importants
- **Système de Styles** : Toujours utiliser les variables CSS et les classes prédéfinies pour maintenir la cohérence visuelle
- **Gestion des Horaires Multiples** : Les centres peuvent avoir plusieurs plages horaires par jour (matin/après-midi), et les estilistas peuvent choisir quelles plages ils travaillent
- **Gestion des Horaires** : Pour qu'un estilista apparaisse comme disponible dans le système de réservation, il doit avoir des horaires configurés dans la table `working_hours` pour chaque centre et jour où il travaille
- **API de Disponibilité** : L'API combine toutes les plages horaires de travail d'un estilista pour générer les slots disponibles pour les réservations
- **Stockage des Images** : Les images sont stockées dans des buckets Supabase avec des politiques de sécurité spécifiques
- **Stylistes Multi-centres** : Un styliste peut travailler dans plusieurs centres avec des horaires différents 
- **Qualité du Code** : Éviter l'utilisation de `any` et veiller à utiliser des types explicites
- **Performance Images** : Toujours utiliser le composant `<Image>` de Next.js pour les images 
- **Gestion des Centres** : Tous les champs doivent être remplis correctement pour assurer le bon fonctionnement du système de réservation
- **Sécurité du Panel Admin** : Toutes les pages et sous-routes sous `/admin/*` doivent être protégées par l'authentification centralisée du layout
- **Données CRM** : Les données du CRM sont générées à partir des réservations existantes, organisées par email client
- **Navigation Admin** : Utiliser le composant AdminNav pour maintenir une navigation cohérente dans toutes les sections administratives
- **Gestion des URLs d'Images** : Utiliser la fonction getImageUrl pour gérer correctement les différents formats d'URLs d'images (locales, Supabase Storage, URLs complètes)
- **Filtrage des Réservations** : Le système permet de combiner les filtres par centre, estilista et date pour une gestion précise des réservations
- **Calendrier Adaptatif** : Le calendrier se met à jour dynamiquement selon les filtres appliqués (estilista et/ou centre)
- **Responsive Design** : Le sélecteur d'état de réservation utilise deux designs différents selon la taille d'écran (haut/droite sur grand écran, bas sur mobile)
- **Cohérence des Bordes** : Maintenir le borde jaune (`border-primary`) pour les cartes de réservation afin d'assurer la cohérence visuelle
- **Gestion des Apostrophes** : Toujours échapper les apostrophes dans le texte JSX en utilisant `&apos;` pour éviter des erreurs de compilation
- **Images de Substitution** : Prévoir toujours des images de substitution (fallback) en cas d'erreur de chargement des images
- **Cohérence du Thème Sombre** : Maintenir la cohérence du thème sombre dans toutes les sections administratives, en utilisant les classes bg-dark, bg-secondary, text-light et text-primary 