# Coiffure Ciwan - Contexte du Projet

## Description Générale

Coiffure Ciwan est une application web pour un salon de coiffure masculin moderne avec plusieurs centres. L'application comprend une landing page principale qui présente des informations sur le salon de coiffure et un système de réservation multicentrique qui permet aux clients de réserver des rendez-vous dans n'importe lequel des cinq centres disponibles.

## Objectif

L'objectif principal de l'application est de :

1. Fournir une présence en ligne professionnelle pour le salon de coiffure Coiffure Ciwan
2. Permettre aux clients de faire des réservations en ligne en sélectionnant le centre, le service, le coiffeur, la date et l'heure
3. Offrir aux administrateurs un tableau de bord pour gérer les réservations, les services, les coiffeurs et le contenu du site
4. Fournir un système de CRM pour le suivi des clients et l'analyse de leurs habitudes
5. Permettre la vente en ligne de produits capillaires via une boutique intégrée avec système de paiement sécurisé

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
- **Stripe** : Plateforme de paiement intégrée pour :
  - Gestion des produits et prix
  - Sessions de paiement sécurisées
  - Webhooks pour les notifications de paiement
  - Support multi-devises et multi-pays

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
- **Optimisation du Code** : Correction des problèmes de linter et suppression des variables non utilisées pour améliorer la qualité et la maintenance du code
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
- **Design Unifié de Cartes** : Application d'un design cohérent à toutes les cartes dans le panel administratif (services, galerie, estilistas, centres) avec une présentation visuelle améliorée et une expérience utilisateur optimisée
- **Correction d'Erreurs de Linter** : Résolution des erreurs de linter concernant les variables non utilisées et correction des typages pour améliorer la qualité du code
- **Amélioration de l'Expérience Utilisateur** : Ajout de curseur pointer et effet de survol en couleur primaire sur tous les éléments interactifs de la navigation administrative pour une meilleure expérience utilisateur
- **Correction de la Visualisation des Images de Configuration** : Résolution du problème de prévisualisation des images dans la configuration du hero, permettant une meilleure gestion des images de la page d'accueil
- **Formulaires Responsifs et Cohérents** : Uniformisation de tous les formulaires dans le panel administratif avec des styles responsifs et cohérents sur tous les dispositifs
- **Gestion Optimisée des États de Chargement** : Ajout d'indicateurs visuels pendant le chargement et les opérations d'enregistrement dans tous les formulaires administratifs
- **Filtrage Dynamique des Statistiques par Période** : Implémentation d'un système avancé de filtrage des statistiques par période (semaine actuelle/précédente, mois actuel/précédent, année actuelle/précédente et période personnalisée) pour les pages de statistiques des estilistas et centres
- **Interface Mobile Optimisée pour les Filtres** : Création d'une interface mobile améliorée avec menu déroulant pour les filtres de date, offrant une meilleure expérience utilisateur sur les appareils mobiles
- **Inputs de Date Améliorés** : Remplacement des sélecteurs de date natifs par des champs personnalisés avec icônes de calendrier distinctives et couleur primaire pour améliorer la visibilité et l'interaction
- **Visualisation Responsive des Graphiques** : Adaptation des graphiques de tendances et statistiques pour une visualisation optimale sur tous les appareils, avec un système d'affichage adaptatif selon la taille de l'écran
- **Fermeture Automatique des Menus** : Implémentation d'un système de fermeture automatique des menus déroulants après sélection pour une navigation plus fluide sur mobile
- **Correction de l'Ordre Chronologique des Graphiques** : Amélioration des graphiques de tendances pour afficher les mois en ordre chronologique correct (de plus ancien à plus récent) et formater les étiquettes de façon appropriée
- **Affichage Adaptatif des Étiquettes** : Optimisation de l'affichage des étiquettes de mois dans les graphiques avec format complet sur desktop et simplifié sur mobile pour une meilleure lisibilité
- **Amélioration des Périodes Personnalisées** : Renforcement de la précision et de la lisibilité des périodes de dates sélectionnées dans les interfaces de statistiques
- **Système de Gestion des Utilisateurs** : Implémentation d'un système complet de gestion des rôles utilisateurs (admin/employé) avec interface d'administration dédiée
- **Interface Multilingue Cohérente** : Traduction complète de l'interface de gestion des utilisateurs en français pour maintenir la cohérence linguistique
- **Optimisation React des Clés** : Résolution des problèmes de rendu avec clés duplicées dans le composant AdminNav pour améliorer la performance et éliminer les avertissements
- **Flux d'Invitation des Employés** : Mise en place d'un processus où le propriétaire du site crée les utilisateurs et les administrateurs leur attribuent des rôles et les associent à des estilistas
- **Interface Utilisateur Gestion Utilisateurs Améliorée** : Transformation de la présentation tabulaire en cartes interactives et correction des problèmes de contraste, avec amélioration de la responsivité du formulaire d'édition pour les mobiles
- **Barre Latérale Administrative Unifiée** : Unification de deux barres de navigation administratives en un seul composant de barre latérale pliable, offrant une meilleure expérience utilisateur et une navigation plus cohérente
- **Fonctionnalité de Collapse** : Implémentation d'une fonctionnalité permettant de réduire/agrandir la barre latérale pour optimiser l'espace disponible sur les écrans de bureau
- **Adaptation Contextuelle** : Affichage adaptatif de la barre latérale en fonction du rôle de l'utilisateur et de la page actuelle
- **Expérience Mobile Préservée** : Maintien d'une expérience mobile optimale avec un menu hamburger pour les petits écrans
- **Correction des Problèmes de Timezone** : Résolution des problèmes liés à la sélection des dates dans le calendrier des réservations pour assurer que les réservations s'affichent pour le jour correct sélectionné
- **Navigation Simplifiée** : Suppression du bouton Dashboard redondant pour une interface plus épurée et intuitive
- **Barre Latérale Fermée par Défaut** : Configuration de la barre latérale pour qu'elle soit fermée par défaut, optimisant l'espace d'écran disponible
- **Fermeture Automatique de la Barre Latérale** : Implémentation d'un système de détection de clics qui ferme automatiquement la barre latérale lorsque l'utilisateur clique en dehors de celle-ci
- **Centrage Amélioré du Calendrier** : Correction du centrage du calendrier des réservations pour assurer une présentation visuelle cohérente avec les autres pages de l'application
- **Effet Parallax dans la Section Services** : Implémentation d'un effet parallax pour l'arrière-plan de la section services, créant une profondeur visuelle lors du défilement
- **Images de Service Optimisées** : Ajout d'une subtile sombra blanche aux images des services pour les mettre en valeur sur fond sombre et améliorer l'expérience visuelle
- **Soutien des Images Mobile et Desktop** : Configuration distincte d'images d'arrière-plan pour mobile et desktop dans la section services via Supabase
- **Animation Séquentielle Hero** : Amélioration des animations de la section Hero avec un titre à effet rebond suivi des textes secondaires et du bouton CTA
- **Gestion d'Erreur des Images** : Implémentation d'un système robuste de fallback pour les images en cas d'erreur de chargement
- **Amélioration de la Section Galerie** : Implémentation d'un carrousel interactif avec animations fluides, miniatures pour navigation sur desktop et indicateurs de position pour mobile
- **Interface de Galerie Moderne** : Ajout d'effets visuels comme échelle au survol, gradients pour améliorer la lisibilité, et animations de transition entre les images
- **Gestion Tactile de la Galerie** : Support de gestures tactiles pour navigation de galerie sur mobile, avec détection de swipe gauche/droite
- **Amélioration de la Section Location** : Transformation avec arrière-plan à effet parallaxe, intégration de cartes Google Maps dynamiques et organisation visuelle équilibrée
- **Interface Multi-Centres** : Support pour affichage de plusieurs centres avec sélecteur par boutons et navigation par flèches sur mobile
- **Optimisation Mobile Location** : Adaptation complète pour écrans mobiles avec contrôles intuitifs et affichage optimisé
- **Affichage d'Heures d'Ouverture**: Présentation claire des heures d'ouverture de chaque centre, groupées par jour avec support pour plusieurs plages horaires
- **Bouton de Navigation Maps** : Ajout d'un bouton pour obtenir des directions via Google Maps directement depuis la section location
- **Bouton Réservation Intégré** : Ajout d'un bouton "Réservez Maintenant" en bas de la section location pour conversion directe des visiteurs
- **Refactorisation du Style Location** : Implémentation d'une constante backgroundStyle pour maintenir la cohérence et faciliter la maintenance
- **Boutique en Ligne Complète** : Implémentation d'un système de vente en ligne avec catalogue de produits, panier d'achat et processus de paiement sécurisé
- **Intégration Stripe** : Connexion complète avec Stripe pour la gestion des paiements, incluant la synchronisation automatique des produits entre la base de données et Stripe
- **Système de Panier Global** : Implémentation d'un panier d'achat persistant avec gestion d'état globale via React Context et localStorage
- **Interface de Gestion des Produits** : Panel administratif dédié pour créer, modifier, activer/désactiver et supprimer des produits avec synchronisation automatique vers Stripe
- **Processus de Checkout Sécurisé** : Intégration avec Stripe Checkout pour un processus de paiement professionnel et sécurisé
- **Webhooks de Paiement** : Système de notifications en temps réel pour traiter les événements de paiement et mettre à jour le statut des commandes
- **Gestion des Commandes** : Système complet de suivi des commandes avec statuts et historique des transactions
- **Navigation Unifiée** : Intégration du panier d'achat dans la navigation principale pour un accès global depuis toutes les pages
- **Interface Responsive Boutique** : Design adaptatif pour la boutique avec filtrage par catégories et présentation optimisée des produits
- **Synchronisation Bidirectionnelle** : Système automatique de synchronisation des produits entre Supabase et Stripe lors de la création, modification ou suppression
- **Gestion des Erreurs de Paiement** : Système robuste de gestion des erreurs et des cas d'échec de paiement
- **Support Multi-Pays** : Configuration de Stripe pour supporter les paiements depuis différents pays, incluant la Suisse et d'autres pays européens
- **Gestion de Commandes avec Pestañas** : Refonte complète de l'interface de gestion de la boutique avec système de pestañas séparant la gestion des produits et des commandes
  - **Interface à Pestañas** : Navigation intuitive entre la gestion des produits et la gestion des commandes avec design cohérent
  - **Gestion des États de Commandes** : Système d'états en français (En Attente, En Traitement, Traité) avec indicateurs visuels et couleurs distinctives
  - **Informations Détaillées des Commandes** : Affichage complet des données client, articles commandés avec images et prix, et informations de paiement
  - **Modification d'État en Temps Réel** : Selecteur pour changer le statut des commandes directement depuis l'interface avec mise à jour immédiate
  - **APIs de Gestion des Commandes** : Endpoints dédiés pour récupérer et mettre à jour les commandes avec leurs articles associés
  - **Interface Responsive Optimisée** : Design adaptatif pour mobile et desktop avec présentation claire des informations de commande
  - **Horodatage et Suivi** : Affichage des dates de création et modification pour un suivi complet des commandes

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
- `/boutique` : Boutique en ligne avec catalogue de produits
- `/boutique/checkout` : Processus de paiement sécurisé
- `/boutique/checkout/success` : Page de confirmation après paiement réussi
- `/admin` : Tableau de bord d'administration
- `/admin/reservations` : Gestion des réservations
- `/admin/crm` : Gestion de la relation client et suivi des clients
- `/admin/stylist-stats` : Statistiques des estilistas
- `/admin/location-stats` : Statistiques des centres
- `/admin/user-management` : Gestion des utilisateurs et des rôles
- `/admin/boutique` : Gestion des produits de la boutique

## Fonctionnalités Implémentées

### Landing Page
- **Section Hero** : Présentation principale avec image de fond et appel à l'action
- **Services** : Affiche les services proposés avec les prix
- **Galerie** : 
  - Carrousel interactif avec animations fluides et transitions élégantes
  - Navigation par flèches et miniatures sur desktop, indicateurs de position sur mobile
  - Support de gestes tactiles (swipe) pour la navigation sur appareils mobiles
  - Échelle au survol pour ajouter un effet de profondeur et d'interactivité
  - Informations descriptives et dates avec formatage en français
  - Récupération dynamique des images depuis Supabase avec fallback local en cas d'erreur
  - Fond avec gradient et effets visuels améliorant la présentation des images
- **Localisation** : 
  - Affichage des centres avec intégration Google Maps interactive
  - Interface multi-centres avec navigation fluide par boutons ou flèches
  - Horaires d'ouverture présentés de façon organisée par jour de la semaine
  - Support pour plusieurs plages horaires par jour (matin/après-midi)
  - Adaptation mobile avec contrôles de navigation optimisés
  - Bouton de directions Google Maps pour faciliter la navigation des clients
  - Fond avec effet parallaxe pour une expérience visuelle moderne
  - Récupération dynamique des données depuis Supabase
  - Bouton "Réservez Maintenant" pour convertir les visiteurs en clients
- **Contact** : Informations de contact et formulaire

### Boutique en Ligne
- **Catalogue de Produits** : Affichage dynamique de tous les produits actifs avec images, descriptions et prix
- **Filtrage par Catégories** : Système de filtrage pour afficher les produits par catégorie
- **Panier d'Achat Global** : Panier accessible depuis toutes les pages avec persistance des données via localStorage
- **Interface de Panier** : Panneau coulissant avec gestion des quantités, suppression d'articles et calcul automatique du total
- **Processus de Checkout** : Formulaire de saisie des informations client avant redirection vers Stripe
- **Intégration Stripe Checkout** : Redirection vers la page de paiement sécurisée de Stripe avec support multi-pays
- **Page de Confirmation** : Affichage des détails de la commande après paiement réussi
- **Design Responsive** : Interface adaptée à tous les dispositifs avec navigation optimisée

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
- **Barre Latérale Unifiée** : Barre de navigation administrative centralisée et pliable qui:
  - Intègre toutes les options de navigation principales et de configuration
  - S'adapte au rôle de l'utilisateur connecté
  - Est fermée par défaut pour maximiser l'espace de travail
  - Se ferme automatiquement lorsque l'utilisateur clique en dehors
  - Présente une interface simplifiée sans bouton Dashboard redondant
  - Affiche le nom et l'image de l'utilisateur connecté
  - Offre une expérience mobile optimisée avec menu hamburger
  - Permet un accès rapide à toutes les sections du panel administratif
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
  - **Filtrage par Période** : Système avancé de sélection de périodes (semaine, mois, année, personnalisé) avec interface adaptative pour mobile et desktop
  - **Visualisation Dynamique** : Représentation graphique des données qui s'adapte au période sélectionnée, avec affichage optimisé des tendances
  - **Sélecteurs Optimisés** : Champs de date avec icônes distinctives et fermeture automatique des menus après sélection pour une navigation fluide
  - **Adaptation Mobile** : Interface déroulante sur mobile pour économiser l'espace et améliorer l'expérience utilisateur
  - **Ordre Chronologique Corrigé** : Affichage des données dans un ordre chronologique correct, du plus ancien au plus récent, pour une analyse pertinente des tendances
  - **Formatage Intelligent des Étiquettes** : Système adaptatif qui ajuste le format des étiquettes de mois selon l'espace disponible et le nombre de périodes affichées
  - **Optimisation pour Périodes Longues** : Support amélioré pour les filtres sur de longues périodes avec affichage compact sur mobile et complet sur desktop
  - **Fond Contrasté pour Graphiques** : Utilisation de fonds légèrement plus sombres pour les sections de graphiques afin d'améliorer la lisibilité des données
  - **Détection Contextuelle de Périodes Vides** : Affichage de messages explicites lorsqu'aucune réservation n'est trouvée dans la période sélectionnée
- **Calendrier Intuitif** : Interface de calendrier améliorée avec code couleur pour visualiser rapidement la disponibilité
  - **Filtrage Contextuel** : Affichage des réservations spécifiques à l'estilista sélectionné dans le calendrier
  - **Indicateurs Visuels** : Affichage de points indiquant les jours avec réservations
  - **Navigation Optimisée** : Boutons de navigation entre les mois plus visibles et mieux espacés
  - **Adaptation au Contexte** : Titre du calendrier indiquant l'estilista sélectionné pour une meilleure orientation
  - **Sélection Précise des Dates** : Correction des problèmes de timezone qui causaient l'affichage des réservations du jour précédent
  - **Chargement Immédiat** : Chargement automatique des réservations lors de la sélection d'une date spécifique
- **Design Sombre** : Thème sombre cohérent pour toutes les interfaces d'administration
- **Gestion des Utilisateurs** : Interface complète pour gérer les utilisateurs du système administratif
  - **Attribution de Rôles** : Possibilité d'assigner des rôles (Administrateur/Employé) aux utilisateurs
  - **Association aux Estilistas** : Liaison entre utilisateurs et estilistas pour permettre à chaque estilista d'accéder à ses données
  - **Interface Multilingue** : Interface entièrement en français pour maintenir la cohérence linguistique de l'application
  - **Contrôle d'Accès** : Restrictions basées sur les rôles (les employés n'ont accès qu'aux réservations)
  - **Flux d'Invitation** : Processus où le propriétaire crée les utilisateurs, qui sont ensuite configurés par les administrateurs
- **Gestion de la Boutique** : Interface complète divisée en deux pestañas pour gérer les produits et les commandes
  - **Pestaña Produits** : Gestion complète des produits de la boutique
    - **Création de Produits** : Formulaire pour ajouter de nouveaux produits avec synchronisation automatique vers Stripe
    - **Modification de Produits** : Édition des informations des produits avec mise à jour en temps réel dans Stripe
    - **Activation/Désactivation** : Possibilité d'activer ou désactiver des produits sans les supprimer définitivement
    - **Suppression Sécurisée** : Suppression complète des produits avec nettoyage automatique des références dans Stripe
    - **Indicateurs de Synchronisation** : Indicateurs visuels (cercles verts/jaunes) pour montrer le statut de synchronisation avec Stripe
    - **Gestion des Images** : Upload et prévisualisation des images de produits avec stockage dans Supabase
    - **Gestion des Catégories** : Organisation des produits par catégories pour une meilleure navigation
  - **Pestaña Commandes** : Gestion complète des commandes clients
    - **Liste des Commandes** : Affichage de toutes les commandes avec informations détaillées du client
    - **Informations Client** : Nom, email, téléphone, adresse de livraison pour chaque commande
    - **Détails des Articles** : Liste des produits commandés avec images, quantités et prix unitaires
    - **Gestion des États** : Système d'états en français pour suivre le traitement des commandes
      - "En Attente" (pendiente) : Commande reçue mais pas encore traitée
      - "En Traitement" (en_traitement) : Commande en cours de préparation
      - "Traité" (traite) : Commande finalisée et prête pour l'expédition
    - **Modification d'État** : Selecteur pour changer le statut de chaque commande en temps réel
    - **Informations de Paiement** : Affichage des références Stripe et du total de la commande
    - **Horodatage** : Dates de création et de dernière modification des commandes
    - **Interface Responsive** : Design adapté pour mobile et desktop avec navigation intuitive
    - **Indicateurs Visuels** : Icônes et couleurs distinctives pour chaque état de commande

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
- **APIs de Boutique** :
  - **API Produits** : Gestion complète des produits (GET, POST, PUT, DELETE) avec synchronisation automatique vers Stripe
  - **API Checkout Stripe** : Création de sessions de paiement sécurisées avec redirection vers Stripe Checkout
  - **API Webhook Stripe** : Traitement des événements de paiement en temps réel pour mettre à jour le statut des commandes
  - **API Commandes** : Récupération des détails des commandes avec informations complètes des produits
  - **API Gestion des Commandes** : 
    - **GET /api/boutique/pedidos** : Obtention de toutes les commandes avec leurs articles et informations produits
    - **PUT /api/boutique/pedidos/[id]** : Mise à jour du statut des commandes (En Attente, En Traitement, Traité)
- **Synchronisation Stripe** : Système automatique de création, modification et suppression de produits dans Stripe lors des opérations CRUD

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
- **user_roles** : Rôles attribués aux utilisateurs (admin/employee)
- **stylist_users** : Relation entre utilisateurs et estilistas

### Tables de la Boutique
- **productos** : Produits de la boutique avec informations complètes (nom, description, prix, stock, catégorie, image, statut actif/destacado)
- **categorias_productos** : Catégories pour organiser les produits de la boutique
- **pedidos** : Commandes des clients avec informations de livraison et statut de paiement
- **items_pedido** : Articles individuels dans chaque commande avec quantités et prix
- **carrito_sesiones** : Sessions de panier pour gérer les paniers temporaires
- **items_carrito** : Articles dans le panier avec quantités et informations de produit

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

### Relations de la Boutique
- Un **produit** appartient à une **catégorie**
- Un **pedido** contient plusieurs **items_pedido**
- Un **item_pedido** référence un **produit** spécifique
- Un **carrito_sesion** contient plusieurs **items_carrito**
- Un **item_carrito** référence un **produit** spécifique
- Les **produits** sont synchronisés avec **Stripe** via `stripe_product_id` et `stripe_price_id`

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

### Phase 3 : Améliorations de la Boutique
- **Système de Gestion des Stocks** : Suivi automatique des stocks avec alertes de réapprovisionnement
- **Système de Codes Promo** : Intégration avec Stripe pour les coupons et réductions
- **Historique des Commandes** : Interface client pour consulter l'historique des achats
- **Système de Fidélité** : Points de fidélité et récompenses pour les clients réguliers
- **Notifications de Livraison** : Suivi des commandes avec notifications par email/SMS
- **Analytics de Vente** : Tableaux de bord pour analyser les performances de la boutique

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
- Le contenu dynamique (services, images, centres, produits) est géré depuis le tableau de bord d'administration
- Les styles visuels sont gérés via le système centralisé dans `/src/styles/theme.css`
- Les mises à jour de code nécessitent un déploiement sur Vercel
- La configuration de Supabase se fait via sa console ou par des scripts SQL
- **Vérification Qualité** : Les pull requests doivent passer toutes les vérifications ESLint avant fusion
- **Sécurité** : Vérifier régulièrement que toutes les routes administratives sont correctement protégées
- **Synchronisation Stripe** : Vérifier périodiquement la synchronisation entre Supabase et Stripe pour les produits
- **Webhooks** : Surveiller les webhooks Stripe pour s'assurer du bon traitement des événements de paiement

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
- **Consistance des Cartes** : Maintenir la cohérence visuelle entre toutes les cartes du panel administratif avec les mêmes styles de bordure, effets de survol et transitions
- **UX Navigation** : Assurer que tous les éléments interactifs de la navigation ont le curseur pointer et des effets de survol cohérents en couleur primaire
- **Prévisualisation des Images** : Toujours initialiser les états de prévisualisation d'images lors du chargement des données depuis la base de données
- **États de Chargement** : Afficher des indicateurs visuels lors des opérations asynchrones pour améliorer l'expérience utilisateur
- **Classes Responsives** : Utiliser les classes flex-col/flex-row avec sm: pour garantir une adaptation correcte sur tous les dispositifs
- **Indicateurs d'Erreur** : Afficher les messages d'erreur de manière visible pour informer l'utilisateur des problèmes éventuels
- **Respect des Règles du Linter** : Traiter les avertissements ESLint comme des erreurs bloquantes et les résoudre avant de fusionner le code, particulièrement pour les variables constantes vs. modifiables (prefer-const)
- **Manipulation des Dates** : Utiliser des approches explicites pour la manipulation des dates, en privilégiant des structures claires pour les opérations d'incrémentation et de comparaison
- **Variables Modifiables** : Déclarer avec `let` toute variable qui sera modifiée dans son cycle de vie, même si la référence de l'objet reste la même
- **Ordre Chronologique** : Dans les visualisations de données temporelles, toujours présenter les données dans un ordre chronologique cohérent pour faciliter l'analyse
- **Étiquetage des Périodes** : Adapter le niveau de détail des étiquettes temporelles en fonction du contexte d'affichage (detailed pour desktop, simplifié pour mobile)
- **Optimisation des Clés React** : Utiliser des clés uniques pour les éléments générés dynamiquement, en ajoutant un préfixe ou un suffixe contextuel pour éviter les duplications
- **Gestion des Rôles** : Vérifier que les vues administratives adaptent leur contenu en fonction du rôle de l'utilisateur connecté 
- **Contraste et Lisibilité** : Assurer un contraste suffisant pour tous les textes, particulièrement pour les étiquettes sur fond coloré (comme le texte sur fond primaire jaune qui doit être foncé et non clair)
- **Expérience Mobile Optimisée** : Utiliser une disposition en colonnes (`flex-col`) sur mobile et en lignes (`sm:flex-row`) sur desktop pour les formulaires et contrôles, avec largeur complète (`w-full`) sur mobile pour une meilleure expérience utilisateur
- **Gestion du Panier** : Le panier d'achat utilise React Context avec localStorage pour la persistance des données entre les sessions
- **Synchronisation Stripe** : Tous les produits créés/modifiés/supprimés via le panel administratif sont automatiquement synchronisés avec Stripe
- **Webhooks Stripe** : Les webhooks doivent être configurés dans le dashboard Stripe pour traiter les événements de paiement en temps réel
- **Clés API Stripe** : Utiliser les clés de production (`sk_live_`) pour l'environnement de production et les clés de test (`sk_test_`) pour le développement
- **Gestion des Erreurs de Paiement** : Implémenter une gestion robuste des erreurs pour les cas d'échec de paiement et les problèmes de synchronisation
- **Sécurité des Paiements** : Tous les paiements passent par Stripe Checkout pour garantir la sécurité et la conformité PCI
- **Contraintes de Clés Étrangères** : Lors de la suppression de produits, gérer correctement les contraintes de clés étrangères dans les tables `items_carrito` et `items_pedido`
- **Indicateurs de Synchronisation** : Utiliser les indicateurs visuels dans le panel administratif pour identifier rapidement les produits non synchronisés avec Stripe
- **Configuration Multi-Pays** : Configurer Stripe Checkout pour supporter les paiements depuis différents pays, notamment la Suisse et les pays européens 