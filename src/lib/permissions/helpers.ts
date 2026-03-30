import type { ScopeMode } from '@/lib/permissions/catalog';
import type { PermissionScopeFilter, StaffAccessContext } from '@/lib/permissions/types';

export function hasPermission(context: StaffAccessContext | null, permissionKey: string): boolean {
  if (!context) return false;
  if (context.role === 'admin') return true;
  return Boolean(context.permissions[permissionKey]?.allowed);
}

export function getPermissionScope(context: StaffAccessContext | null, permissionKey: string): ScopeMode {
  if (!context) return 'none';
  if (context.role === 'admin') return 'all';
  return context.permissions[permissionKey]?.scope ?? 'none';
}

export function canAccessModule(context: StaffAccessContext | null, permissionKeys: string[]): boolean {
  if (!context) return false;
  if (context.role === 'admin') return true;
  return permissionKeys.some((permissionKey) => hasPermission(context, permissionKey));
}

export function getPermissionScopeFilter(
  context: StaffAccessContext | null,
  permissionKey: string
): PermissionScopeFilter {
  if (!context) {
    return { kind: 'none', scope: 'none', code: 'missing_context' };
  }

  if (context.role === 'admin') {
    return { kind: 'all', scope: 'all' };
  }

  if (!hasPermission(context, permissionKey)) {
    return { kind: 'none', scope: 'none', code: 'missing_permission' };
  }

  const scope = getPermissionScope(context, permissionKey);

  if (scope === 'all') {
    return { kind: 'all', scope };
  }

  if (scope === 'own_stylist') {
    if (!context.associatedStylistId) {
      return { kind: 'none', scope, code: 'missing_associated_stylist' };
    }

    return {
      kind: 'stylist',
      scope,
      stylistId: context.associatedStylistId,
    };
  }

  if (scope === 'assigned_location' || scope === 'specific_locations') {
    if (!context.assignedLocationIds.length) {
      return { kind: 'none', scope, code: 'missing_assigned_locations' };
    }

    return {
      kind: 'locations',
      scope,
      locationIds: context.assignedLocationIds,
    };
  }

  return { kind: 'none', scope, code: 'scope_none' };
}

export function canAccessScopedResource(
  context: StaffAccessContext | null,
  permissionKey: string,
  resource: { stylistId?: string | null; locationId?: string | null }
): boolean {
  const filter = getPermissionScopeFilter(context, permissionKey);

  if (filter.kind === 'all') return true;
  if (filter.kind === 'none') return false;
  if (filter.kind === 'stylist') return Boolean(resource.stylistId && resource.stylistId === filter.stylistId);
  return Boolean(resource.locationId && filter.locationIds.includes(resource.locationId));
}
