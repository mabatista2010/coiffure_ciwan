export const SCOPE_MODES = [
  'all',
  'none',
  'own_stylist',
  'assigned_location',
  'specific_locations',
] as const;

export type ScopeMode = (typeof SCOPE_MODES)[number];
export type StaffRole = 'admin' | 'staff';
export type PermissionSource = 'admin' | 'profile' | 'override_allow' | 'override_deny' | 'none';

export type PermissionDefinition = {
  key: string;
  module: string;
  label: string;
  description: string;
  allowedScopes: ScopeMode[];
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { key: 'dashboard.view', module: 'dashboard', label: 'Voir le tableau de bord', description: 'Accès au tableau de bord admin.', allowedScopes: ['all'] },

  { key: 'reservations.view', module: 'reservations', label: 'Voir les réservations', description: 'Lecture du calendrier et des réservations.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'reservations.create', module: 'reservations', label: 'Créer une réservation', description: 'Création manuelle de réservations.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'reservations.replan', module: 'reservations', label: 'Replanifier / déplacer', description: 'Déplacement ou replanification des réservations.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'reservations.manage_pending', module: 'reservations', label: 'Gérer les réservations en attente', description: 'Validation des réservations en attente.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'reservations.cancel', module: 'reservations', label: 'Annuler les réservations', description: 'Annulation des réservations.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'schedule.time_off.manage', module: 'reservations', label: 'Gérer les indisponibilités', description: 'Gestion des indisponibilités du styliste.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'schedule.location_closures.manage', module: 'reservations', label: 'Gérer les fermetures du centre', description: 'Gestion des fermetures de centre.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'schedule.working_hours.manage', module: 'reservations', label: 'Gérer les horaires du styliste', description: 'Gestion des horaires hebdomadaires du styliste.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'schedule.location_hours.manage', module: 'reservations', label: 'Gérer les horaires du centre', description: 'Gestion des horaires hebdomadaires du centre.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },

  { key: 'crm.customers.view', module: 'crm', label: 'Voir les clients', description: 'Lecture et recherche des fiches clients.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'crm.customers.edit', module: 'crm', label: 'Modifier les fiches clients', description: 'Édition des profils CRM.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'crm.notes.view', module: 'crm', label: 'Voir les notes CRM', description: 'Lecture des notes CRM.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'crm.notes.create', module: 'crm', label: 'Ajouter des notes CRM', description: 'Création de notes CRM.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },

  { key: 'services.view', module: 'services', label: 'Voir les services', description: 'Lecture du catalogue des services.', allowedScopes: ['all', 'none'] },
  { key: 'services.content.edit', module: 'services', label: 'Modifier le contenu des services', description: 'Nom, description, image, slug, ordre et visibilité.', allowedScopes: ['all', 'none'] },
  { key: 'services.business.edit', module: 'services', label: 'Modifier les paramètres métier des services', description: 'Prix et durée des services.', allowedScopes: ['all', 'none'] },
  { key: 'services.delete', module: 'services', label: 'Supprimer les services', description: 'Suppression ou retrait des services.', allowedScopes: ['all', 'none'] },

  { key: 'stylists.profile.view', module: 'stylists', label: 'Voir les profils styliste', description: 'Lecture des fiches styliste.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'stylists.profile.edit', module: 'stylists', label: 'Modifier les profils styliste', description: 'Édition des fiches styliste.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'stylists.profile.delete', module: 'stylists', label: 'Supprimer les profils styliste', description: 'Suppression ou retrait d’un styliste.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'stylists.operations.view', module: 'stylists', label: 'Voir l’opérationnel styliste', description: 'Lecture des services associés et affectations.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
  { key: 'stylists.operations.edit', module: 'stylists', label: 'Modifier l’opérationnel styliste', description: 'Services associés et affectations opérationnelles.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },

  { key: 'locations.profile.view', module: 'locations', label: 'Voir les centres', description: 'Lecture des fiches centre.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'locations.profile.edit', module: 'locations', label: 'Modifier les centres', description: 'Édition des fiches centre.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'locations.profile.delete', module: 'locations', label: 'Supprimer les centres', description: 'Suppression ou retrait de centres.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'locations.operations.view', module: 'locations', label: 'Voir l’opérationnel centre', description: 'Lecture des opérations liées aux centres.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },
  { key: 'locations.operations.edit', module: 'locations', label: 'Modifier l’opérationnel centre', description: 'Édition des opérations liées aux centres.', allowedScopes: ['all', 'none', 'assigned_location', 'specific_locations'] },

  { key: 'gallery.view', module: 'gallery', label: 'Voir la galerie', description: 'Lecture des images de la galerie.', allowedScopes: ['all', 'none'] },
  { key: 'gallery.edit', module: 'gallery', label: 'Modifier la galerie', description: 'Création et édition des images de la galerie.', allowedScopes: ['all', 'none'] },
  { key: 'gallery.delete', module: 'gallery', label: 'Supprimer de la galerie', description: 'Suppression des images de la galerie.', allowedScopes: ['all', 'none'] },

  { key: 'boutique.orders.view', module: 'boutique_orders', label: 'Voir les commandes boutique', description: 'Lecture des commandes de la boutique.', allowedScopes: ['all', 'none'] },
  { key: 'boutique.orders.edit', module: 'boutique_orders', label: 'Modifier les commandes boutique', description: 'Changement d’état des commandes.', allowedScopes: ['all', 'none'] },
  { key: 'boutique.catalog.view', module: 'boutique_catalog', label: 'Voir le catalogue boutique', description: 'Lecture des produits de la boutique.', allowedScopes: ['all', 'none'] },
  { key: 'boutique.catalog.content.edit', module: 'boutique_catalog', label: 'Modifier le contenu du catalogue boutique', description: 'Édition du contenu des produits.', allowedScopes: ['all', 'none'] },
  { key: 'boutique.catalog.business.edit', module: 'boutique_catalog', label: 'Modifier les paramètres commerciaux boutique', description: 'Prix, stock et activation.', allowedScopes: ['all', 'none'] },
  { key: 'boutique.catalog.delete', module: 'boutique_catalog', label: 'Supprimer des produits boutique', description: 'Suppression ou retrait des produits boutique.', allowedScopes: ['all', 'none'] },

  { key: 'stats.view', module: 'stats', label: 'Voir les statistiques', description: 'Lecture des statistiques selon le scope configuré.', allowedScopes: ['all', 'none', 'own_stylist', 'assigned_location', 'specific_locations'] },
] as const;

export const PERMISSIONS_BY_KEY = Object.fromEntries(
  PERMISSION_DEFINITIONS.map((permission) => [permission.key, permission])
) as Record<string, PermissionDefinition>;

export const PROFILE_DEFINITIONS = [
  { key: 'staff_basic', name: 'Staff basique', description: 'Acces minimal au dashboard et a la lecture operationnelle.' },
  { key: 'reception', name: 'Reception', description: 'Gestion quotidienne des reservations et du CRM.' },
  { key: 'center_manager', name: 'Responsable de centre', description: 'Gestion operationnelle d un ou plusieurs centres.' },
  { key: 'catalog_content', name: 'Catalogue / contenu', description: 'Gestion du catalogue services, galerie et boutique.' },
  { key: 'analyst', name: 'Analyste', description: 'Consultation analytique et lecture seule.' },
] as const;

export const PROFILE_PERMISSION_GRANTS = {
  staff_basic: {
    'dashboard.view': 'all',
    'reservations.view': 'own_stylist',
  },
  reception: {
    'dashboard.view': 'all',
    'reservations.view': 'specific_locations',
    'reservations.create': 'specific_locations',
    'reservations.manage_pending': 'specific_locations',
    'reservations.cancel': 'specific_locations',
    'crm.customers.view': 'all',
    'crm.customers.edit': 'all',
    'crm.notes.view': 'all',
    'crm.notes.create': 'all',
    'boutique.orders.view': 'all',
    'boutique.orders.edit': 'all',
  },
  center_manager: {
    'dashboard.view': 'all',
    'reservations.view': 'assigned_location',
    'reservations.create': 'assigned_location',
    'reservations.replan': 'assigned_location',
    'reservations.manage_pending': 'assigned_location',
    'reservations.cancel': 'assigned_location',
    'schedule.time_off.manage': 'assigned_location',
    'schedule.location_closures.manage': 'assigned_location',
    'schedule.working_hours.manage': 'assigned_location',
    'schedule.location_hours.manage': 'assigned_location',
    'crm.customers.view': 'all',
    'crm.customers.edit': 'all',
    'crm.notes.view': 'all',
    'crm.notes.create': 'all',
    'services.view': 'all',
    'services.content.edit': 'all',
    'stylists.profile.view': 'assigned_location',
    'stylists.profile.edit': 'assigned_location',
    'stylists.operations.view': 'assigned_location',
    'stylists.operations.edit': 'assigned_location',
    'locations.profile.view': 'assigned_location',
    'locations.profile.edit': 'assigned_location',
    'locations.operations.view': 'assigned_location',
    'locations.operations.edit': 'assigned_location',
    'gallery.view': 'all',
    'gallery.edit': 'all',
    'stats.view': 'assigned_location',
    'boutique.orders.view': 'all',
    'boutique.orders.edit': 'all',
  },
  catalog_content: {
    'dashboard.view': 'all',
    'services.view': 'all',
    'services.content.edit': 'all',
    'gallery.view': 'all',
    'gallery.edit': 'all',
    'gallery.delete': 'all',
    'boutique.catalog.view': 'all',
    'boutique.catalog.content.edit': 'all',
  },
  analyst: {
    'dashboard.view': 'all',
    'stats.view': 'all',
  },
} as const satisfies Record<string, Record<string, ScopeMode>>;

export const MODULE_VIEW_PERMISSIONS: Record<string, string[]> = {
  home: ['dashboard.view'],
  reservations: ['reservations.view', 'reservations.create', 'reservations.manage_pending', 'reservations.replan', 'reservations.cancel'],
  crm: ['crm.customers.view', 'crm.customers.edit', 'crm.notes.view', 'crm.notes.create'],
  services: ['services.view', 'services.content.edit', 'services.business.edit', 'services.delete'],
  stylists: ['stylists.profile.view', 'stylists.profile.edit', 'stylists.profile.delete', 'stylists.operations.view', 'stylists.operations.edit'],
  locations: ['locations.profile.view', 'locations.profile.edit', 'locations.profile.delete', 'locations.operations.view', 'locations.operations.edit'],
  gallery: ['gallery.view', 'gallery.edit', 'gallery.delete'],
  boutique: ['boutique.orders.view', 'boutique.orders.edit', 'boutique.catalog.view', 'boutique.catalog.content.edit', 'boutique.catalog.business.edit', 'boutique.catalog.delete'],
  stylist_stats: ['stats.view'],
  location_stats: ['stats.view'],
  user_management: [],
  hero: [],
  webhook_diagnostics: [],
};
