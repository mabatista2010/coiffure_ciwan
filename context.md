# Coiffure Ciwan - Contexte du Projet

## Description Générale

Coiffure Ciwan est une application web pour un salon de coiffure masculin moderne avec plusieurs centres. L'application comprend une landing page principale qui présente des informations sur le salon de coiffure et un système de réservation multicentrique qui permet aux clients de réserver des rendez-vous dans n'importe lequel des cinq centres disponibles.

## Objectif

L'objectif principal de l'application est de :

1. Fournir une présence en ligne professionnelle pour le salon de coiffure Coiffure Ciwan
2. Permettre aux clients de faire des réservations en ligne en sélectionnant le centre, le service, le coiffeur, la date et l'heure
3. Offrir aux administrateurs un tableau de bord pour gérer les réservations, les services, les coiffeurs et le contenu du site

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

## Améliorations Récentes
- **Optimisation du Code** : Correction des problèmes de typage et élimination des `any` explicites
- **Accessibilité** : Échappement correct des caractères spéciaux pour améliorer la compatibilité
- **Performance des Images** : Conversion des balises `<img>` standard vers le composant `<Image>` de Next.js
- **Qualité du Code** : Élimination des variables et fonctions non utilisées
- **Maintenance** : Ajout de commentaires explicatifs pour faciliter le développement futur
- **Gestion des Centres** : Ajout d'une interface complète pour gérer les centres dans le tableau de bord administratif

## Structure de l'Application

### Structure des Dossiers
- `/src/app` : Pages et routes de l'application (Next.js App Router)
- `/src/components` : Composants réutilisables
- `/src/lib` : Utilitaires, configurations et types
- `/public` : Fichiers statiques (images, polices, etc.)

### Pages Principales
- `/` : Landing page principale
- `/reservation` : Système de réservation pour les clients
- `/admin` : Tableau de bord d'administration
- `/admin/reservations` : Gestion des réservations (Page française)

## Fonctionnalités Implémentées

### Landing Page
- **Section Hero** : Présentation principale avec image de fond et appel à l'action
- **Services** : Affiche les services proposés avec les prix
- **Galerie** : Affiche des images des travaux réalisés
- **Localisation** : Affiche l'adresse et la carte des centres
- **Contact** : Informations de contact et formulaire

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
- **Gestion des Réservations** : Voir, créer, modifier et annuler des réservations
- **Filtrage par Date et Centre** : Filtrer les réservations par date et centre
- **Changement de Statut** : Marquer les réservations comme confirmées, annulées ou terminées
- **Localisation des Dates** : Format des dates adapté à la locale française (fr-FR)
- **Gestion Complète des Estilistas** : Ajouter, modifier et supprimer des estilistas avec les informations complètes
- **Gestion Intégrée des Horaires** : Configurer les horaires de travail pour chaque estilista par centre et par jour, avec possibilité de sélectionner des plages horaires spécifiques parmi les horaires du centre
- **Gestion des Services par Estilista** : Assigner des services à des estilistas et les modifier directement dans le même formulaire
- **Upload d'Images** : Téléverser des images pour les estilistas avec prévisualisation
- **Gestion Complète des Centres** : Interface dédiée pour ajouter, modifier et supprimer des centres avec toutes leurs informations (nom, adresse, téléphone, email, description, image et horaires d'ouverture multiples)
- **Configuration des Horaires des Centres** : Possibilité de définir plusieurs plages horaires par jour pour chaque centre (par exemple, matin et après-midi)

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
- **Palette de Couleurs** : 
  - Primaire : #FFD700 (jaune doré)
  - Secondaire : #212121 (noir logo)
  - Accent : #000000 (noir total)
  - Texte foncé : #1a1a1a
  - Texte clair : #ffffff
  - Texte moyen : #E0E0E0
  - Accent Coral : #E76F51 (coral pour les titres principaux)
- **Typographie** :
  - Principale : Montserrat (sans-serif)
  - Décorative : Dancing Script (cursive)

## Fonctionnalités à Venir

### Phase 2 : Intégrations Futures
- **Notifications par WhatsApp** : Confirmations, rappels et suivi
- **Système d'Évaluation par Centre** : Permettre aux clients d'évaluer leur expérience
- **Vue Calendrier Avancée** : Pour le tableau de bord d'administration
- **Gestion du Temps Libre** : Blocage des horaires pour les coiffeurs

## Déploiement
- **Vercel** : Plateforme recommandée pour le déploiement de l'application
- **Supabase** : Hébergement de la base de données et stockage

## Accès et Authentification
- **Clients** : Ne nécessitent pas d'authentification pour faire des réservations
- **Administrateurs** : Nécessitent une authentification pour accéder au tableau de bord d'administration

## Maintenance et Mise à Jour
- Le contenu dynamique (services, images, centres) est géré depuis le tableau de bord d'administration
- Les mises à jour de code nécessitent un déploiement sur Vercel
- La configuration de Supabase se fait via sa console ou par des scripts SQL
- **Vérification Qualité** : Les pull requests doivent passer toutes les vérifications ESLint avant fusion

## Points d'Attention Importants
- **Gestion des Horaires Multiples** : Les centres peuvent avoir plusieurs plages horaires par jour (matin/après-midi), et les estilistas peuvent choisir quelles plages ils travaillent
- **Gestion des Horaires** : Pour qu'un estilista apparaisse comme disponible dans le système de réservation, il doit avoir des horaires configurés dans la table `working_hours` pour chaque centre et jour où il travaille
- **API de Disponibilité** : L'API combine toutes les plages horaires de travail d'un estilista pour générer les slots disponibles pour les réservations
- **Stockage des Images** : Les images sont stockées dans des buckets Supabase avec des politiques de sécurité spécifiques
- **Stylistes Multi-centres** : Un styliste peut travailler dans plusieurs centres avec des horaires différents 
- **Qualité du Code** : Éviter l'utilisation de `any` et veiller à utiliser des types explicites
- **Performance Images** : Toujours utiliser le composant `<Image>` de Next.js pour les images 
- **Gestion des Centres** : Tous les champs doivent être remplis correctement pour assurer le bon fonctionnement du système de réservation 