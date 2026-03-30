import { MODULE_VIEW_PERMISSIONS } from '@/lib/permissions/catalog';
import { canAccessModule, hasPermission } from '@/lib/permissions/helpers';
import type { StaffAccessContext } from '@/lib/permissions/types';

const SECTION_TO_MODULE: Record<string, string> = {
  services: 'services',
  gallery: 'gallery',
  stylists: 'stylists',
  locations: 'locations',
  hero: 'hero',
};

export function canAccessAdminPath(
  context: StaffAccessContext | null,
  pathname: string | null,
  section: string | null = null
): boolean {
  if (!context || !pathname) return false;
  if (context.role === 'admin') return true;

  if (pathname.startsWith('/admin/home')) {
    return hasPermission(context, 'dashboard.view');
  }

  if (pathname.startsWith('/admin/reservations')) {
    return canAccessModule(context, MODULE_VIEW_PERMISSIONS.reservations);
  }

  if (pathname.startsWith('/admin/crm')) {
    return canAccessModule(context, MODULE_VIEW_PERMISSIONS.crm);
  }

  if (pathname.startsWith('/admin/stylist-stats') || pathname.startsWith('/admin/location-stats')) {
    return hasPermission(context, 'stats.view');
  }

  if (pathname.startsWith('/admin/boutique')) {
    return canAccessModule(context, MODULE_VIEW_PERMISSIONS.boutique);
  }

  if (pathname.startsWith('/admin/user-management') || pathname.startsWith('/admin/webhook-diagnostics')) {
    return false;
  }

  if (pathname === '/admin') {
    if (!section) return hasPermission(context, 'dashboard.view');
    const moduleKey = SECTION_TO_MODULE[section];
    if (!moduleKey || moduleKey === 'hero') return false;
    return canAccessModule(context, MODULE_VIEW_PERMISSIONS[moduleKey] ?? []);
  }

  return false;
}

export function getDefaultAdminPath(context: StaffAccessContext | null): string {
  if (!context) return '/admin/home';
  if (context.role === 'admin') return '/admin/home';

  const candidates = [
    '/admin/home',
    '/admin/reservations',
    '/admin/crm',
    '/admin/stylist-stats',
    '/admin/boutique',
    '/admin?section=services',
    '/admin?section=stylists',
    '/admin?section=locations',
    '/admin?section=gallery',
  ];

  for (const candidate of candidates) {
    const [pathname, query = ''] = candidate.split('?');
    const params = new URLSearchParams(query);
    if (canAccessAdminPath(context, pathname, params.get('section'))) {
      return candidate;
    }
  }

  return '/admin/home';
}
