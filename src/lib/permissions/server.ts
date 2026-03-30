import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import {
  PERMISSION_DEFINITIONS,
  PERMISSIONS_BY_KEY,
  type PermissionSource,
  type ScopeMode,
  type StaffRole,
} from '@/lib/permissions/catalog';
import {
  canAccessModule,
  canAccessScopedResource,
  getPermissionScope,
  getPermissionScopeFilter,
  hasPermission,
} from '@/lib/permissions/helpers';
import type { PermissionScopeFilter, PermissionState, StaffAccessContext } from '@/lib/permissions/types';

type OverrideRow = {
  permission_key: string;
  effect: 'allow' | 'deny';
  scope_mode: ScopeMode | null;
};

type ProfilePermissionRow = {
  permission_key: string;
  scope_mode: ScopeMode;
};

function makePermissionState(
  key: string,
  allowed: boolean,
  scope: ScopeMode,
  source: PermissionSource
): PermissionState {
  return { key, allowed, scope, source };
}

export function buildAdminAccessContext(userId: string): StaffAccessContext {
  const permissions = Object.fromEntries(
    PERMISSION_DEFINITIONS.map((permission) => [
      permission.key,
      makePermissionState(permission.key, true, 'all', 'admin'),
    ])
  );

  return {
    userId,
    role: 'admin',
    profileKey: null,
    profileName: 'Administrateur',
    associatedStylistId: null,
    assignedLocationIds: [],
    permissions,
  };
}

export async function getStaffAccessContext(userId: string): Promise<StaffAccessContext | null> {
  const supabase = getSupabaseAdminClient();

  const { data: roleRow, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (roleError || !roleRow?.role) {
    return null;
  }

  const role = roleRow.role as StaffRole;
  if (role === 'admin') {
    return buildAdminAccessContext(userId);
  }

  const [
    profileAssignmentResult,
    overrideResult,
    stylistAssignmentResult,
    locationAssignmentResult,
  ] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('profile_id, profile:permission_profiles(key,name)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_permission_overrides')
      .select('permission_key,effect,scope_mode')
      .eq('user_id', userId),
    supabase
      .from('stylist_users')
      .select('stylist_id')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('user_location_assignments')
      .select('location_id')
      .eq('user_id', userId),
  ]);

  const profileKey = (profileAssignmentResult.data as { profile?: { key?: string | null; name?: string | null } | null } | null)?.profile?.key ?? null;
  const profileName = (profileAssignmentResult.data as { profile?: { key?: string | null; name?: string | null } | null } | null)?.profile?.name ?? null;
  const profileId = (profileAssignmentResult.data as { profile_id?: number | null } | null)?.profile_id ?? null;
  const permissionRows = profileId
    ? (((await supabase
        .from('profile_permissions')
        .select('permission_key,scope_mode')
        .eq('profile_id', profileId)).data ?? []) as ProfilePermissionRow[])
    : [];
  const overrides = (overrideResult.data ?? []) as OverrideRow[];
  const associatedStylistId = stylistAssignmentResult.data?.stylist_id ?? null;
  const assignedLocationIds = (locationAssignmentResult.data ?? []).map((row) => row.location_id);

  const profileMap = new Map(permissionRows.map((row) => [row.permission_key, row]));
  const overrideMap = new Map(overrides.map((row) => [row.permission_key, row]));

  const permissions = Object.fromEntries(
    PERMISSION_DEFINITIONS.map((permission) => {
      const profilePermission = profileMap.get(permission.key);
      const override = overrideMap.get(permission.key);

      if (override?.effect === 'deny') {
        return [permission.key, makePermissionState(permission.key, false, 'none', 'override_deny')];
      }

      if (override?.effect === 'allow') {
        return [
          permission.key,
          makePermissionState(
            permission.key,
            true,
            override.scope_mode ?? profilePermission?.scope_mode ?? 'all',
            'override_allow'
          ),
        ];
      }

      if (profilePermission) {
        return [
          permission.key,
          makePermissionState(permission.key, true, profilePermission.scope_mode, 'profile'),
        ];
      }

      return [permission.key, makePermissionState(permission.key, false, 'none', 'none')];
    })
  ) as Record<string, PermissionState>;

  return {
    userId,
    role,
    profileKey,
    profileName,
    associatedStylistId,
    assignedLocationIds,
    permissions,
  };
}

export function getPermissionDefinition(permissionKey: string) {
  return PERMISSIONS_BY_KEY[permissionKey] ?? null;
}

export function getScopedPermissionFilter(
  context: StaffAccessContext | null,
  permissionKey: string
): PermissionScopeFilter {
  return getPermissionScopeFilter(context, permissionKey);
}

export { canAccessModule, canAccessScopedResource, getPermissionScope, hasPermission };
