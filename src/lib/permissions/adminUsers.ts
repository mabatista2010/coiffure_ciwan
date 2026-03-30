import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { insertAdminAuditLog } from "@/lib/admin/audit";
import {
  PERMISSION_DEFINITIONS,
  PROFILE_DEFINITIONS,
  PROFILE_PERMISSION_GRANTS,
  type PermissionDefinition,
  type ScopeMode,
  type StaffRole,
} from "@/lib/permissions/catalog";
import { getStaffAccessContext } from "@/lib/permissions/server";

type OverrideEffect = "allow" | "deny";

export type ManagedUserSummary = {
  id: string;
  email: string;
  role: StaffRole;
  profileKey: string | null;
  profileName: string | null;
  associatedStylistId: string | null;
  associatedStylistName: string | null;
  assignedLocations: Array<{ id: string; name: string }>;
  overrideCount: number;
};

export type ManagedUserDetail = ManagedUserSummary & {
  assignedLocationIds: string[];
  overrides: Array<{
    permissionKey: string;
    effect: OverrideEffect;
    scopeMode: ScopeMode | null;
  }>;
  effectiveAccess: Awaited<ReturnType<typeof getStaffAccessContext>>;
  auditLog: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    metaJson: Record<string, unknown> | null;
  }>;
};

export type ManagedUserUpdateInput = {
  role: StaffRole;
  profileKey: string | null;
  associatedStylistId: string | null;
  assignedLocationIds: string[];
  overrides: Array<{
    permissionKey: string;
    effect: OverrideEffect;
    scopeMode: ScopeMode | null;
  }>;
};

type RelatedProfile = { key: string; name: string };

type ProfileRow = {
  user_id: string;
  profile_id: number;
  profile: RelatedProfile | RelatedProfile[] | null;
};

type OverrideRow = {
  user_id: string;
  permission_key: string;
  effect: OverrideEffect;
  scope_mode: ScopeMode | null;
};

type RelatedStylist = { id: string; name: string };

type StylistAssignmentRow = {
  user_id: string;
  stylist_id: string | null;
  stylist: RelatedStylist | RelatedStylist[] | null;
};

type RelatedLocation = { id: string; name: string };

type LocationAssignmentRow = {
  user_id: string;
  location_id: string;
  location: RelatedLocation | RelatedLocation[] | null;
};

function normalizeSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function sortValues(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right, "fr"));
}

function normalizeOverrides(
  overrides: Array<{
    permissionKey: string;
    effect: OverrideEffect;
    scopeMode: ScopeMode | null;
  }>
) {
  return [...overrides]
    .map((override) => ({
      permission_key: override.permissionKey,
      effect: override.effect,
      scope_mode: override.scopeMode ?? null,
    }))
    .sort((left, right) => left.permission_key.localeCompare(right.permission_key, "fr"));
}

function buildPermissionCatalog() {
  const labels: Record<string, string> = {
    dashboard: "Dashboard",
    reservations: "Réservations",
    crm: "CRM",
    services: "Services",
    stylists: "Stylists",
    locations: "Centres",
    gallery: "Galerie",
    boutique_orders: "Boutique - commandes",
    boutique_catalog: "Boutique - catalogue",
    stats: "Statistiques",
  };

  return Object.entries(
    PERMISSION_DEFINITIONS.reduce<Record<string, PermissionDefinition[]>>((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {})
  ).map(([module, permissions]) => ({
    module,
    label: labels[module] ?? module,
    permissions,
  }));
}

async function listAuthUsers() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users;
}

export async function listAdminUsers() {
  const supabase = getSupabaseAdminClient();

  const [
    authUsers,
    roleResult,
    profileResult,
    overrideResult,
    stylistResult,
    locationResult,
    stylistsResult,
    locationsResult,
  ] = await Promise.all([
    listAuthUsers(),
    supabase.from("user_roles").select("id, role"),
    supabase
      .from("user_profiles")
      .select("user_id, profile_id, profile:permission_profiles(key,name)"),
    supabase
      .from("user_permission_overrides")
      .select("user_id, permission_key, effect, scope_mode"),
    supabase
      .from("stylist_users")
      .select("user_id, stylist_id, stylist:stylists(id,name)"),
    supabase
      .from("user_location_assignments")
      .select("user_id, location_id, location:locations(id,name)"),
    supabase.from("stylists").select("id, name").eq("active", true).order("name"),
    supabase.from("locations").select("id, name").eq("active", true).order("name"),
  ]);

  if (roleResult.error) throw roleResult.error;
  if (profileResult.error) throw profileResult.error;
  if (overrideResult.error) throw overrideResult.error;
  if (stylistResult.error) throw stylistResult.error;
  if (locationResult.error) throw locationResult.error;
  if (stylistsResult.error) throw stylistsResult.error;
  if (locationsResult.error) throw locationsResult.error;

  const roleMap = new Map(roleResult.data.map((row) => [row.id, row.role as StaffRole]));
  const profileRows = (profileResult.data ?? []) as unknown as ProfileRow[];
  const profileMap = new Map(profileRows.map((row) => [row.user_id, row]));
  const overridesByUser = new Map<string, OverrideRow[]>();
  (overrideResult.data as OverrideRow[]).forEach((row) => {
    const list = overridesByUser.get(row.user_id) ?? [];
    list.push(row);
    overridesByUser.set(row.user_id, list);
  });

  const stylistRows = (stylistResult.data ?? []) as unknown as StylistAssignmentRow[];
  const stylistByUser = new Map(stylistRows.map((row) => [row.user_id, row]));
  const locationsByUser = new Map<string, Array<{ id: string; name: string }>>();
  const locationRows = (locationResult.data ?? []) as unknown as LocationAssignmentRow[];
  locationRows.forEach((row) => {
    const resolvedLocation = normalizeSingleRelation(row.location);
    const list = locationsByUser.get(row.user_id) ?? [];
    list.push({
      id: row.location_id,
      name: resolvedLocation?.name ?? row.location_id,
    });
    locationsByUser.set(row.user_id, list);
  });

  const users: ManagedUserSummary[] = authUsers
    .map((user) => {
      const role = roleMap.get(user.id) ?? "staff";
      const profile = profileMap.get(user.id);
      const resolvedProfile = normalizeSingleRelation(profile?.profile);
      const stylistAssignment = stylistByUser.get(user.id);

      return {
        id: user.id,
        email: user.email ?? `Utilisateur ${user.id.slice(0, 8)}`,
        role,
        profileKey: resolvedProfile?.key ?? null,
        profileName: resolvedProfile?.name ?? null,
        associatedStylistId: stylistAssignment?.stylist_id ?? null,
        associatedStylistName: normalizeSingleRelation(stylistAssignment?.stylist)?.name ?? null,
        assignedLocations: locationsByUser.get(user.id) ?? [],
        overrideCount: (overridesByUser.get(user.id) ?? []).length,
      };
    })
    .sort((left, right) => left.email.localeCompare(right.email, "fr"));

  return {
    users,
    profiles: PROFILE_DEFINITIONS,
    profilePermissions: PROFILE_PERMISSION_GRANTS,
    stylists: stylistsResult.data,
    locations: locationsResult.data,
    permissionCatalog: buildPermissionCatalog(),
  };
}

export async function getAdminUserDetail(userId: string): Promise<ManagedUserDetail | null> {
  const supabase = getSupabaseAdminClient();
  const base = await listAdminUsers();
  const user = base.users.find((entry) => entry.id === userId);

  if (!user) return null;

  const [overrideResult, locationResult, auditResult, effectiveAccess] = await Promise.all([
    supabase
      .from("user_permission_overrides")
      .select("permission_key, effect, scope_mode")
      .eq("user_id", userId)
      .order("permission_key"),
    supabase
      .from("user_location_assignments")
      .select("location_id")
      .eq("user_id", userId)
      .order("location_id"),
    supabase
      .from("admin_audit_log")
      .select("id, action, entity_type, entity_id, created_at, meta_json")
      .or(`target_user_id.eq.${userId},entity_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(20),
    getStaffAccessContext(userId),
  ]);

  if (overrideResult.error) throw overrideResult.error;
  if (locationResult.error) throw locationResult.error;
  if (auditResult.error) throw auditResult.error;

  return {
    ...user,
    assignedLocationIds: (locationResult.data ?? []).map((row) => row.location_id),
    overrides: (overrideResult.data ?? []).map((row) => ({
      permissionKey: row.permission_key,
      effect: row.effect as OverrideEffect,
      scopeMode: row.scope_mode as ScopeMode | null,
    })),
    effectiveAccess,
    auditLog: (auditResult.data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdAt: row.created_at,
      metaJson: (row.meta_json ?? null) as Record<string, unknown> | null,
    })),
  };
}

export async function updateAdminUser(
  actorUserId: string,
  targetUserId: string,
  input: ManagedUserUpdateInput
) {
  const supabase = getSupabaseAdminClient();

  const validProfile = input.profileKey
    ? PROFILE_DEFINITIONS.find((profile) => profile.key === input.profileKey)
    : null;

  if (input.role === "staff" && input.profileKey && !validProfile) {
    throw new Error("Profil de permissions introuvable");
  }

  const invalidOverrides = input.overrides.filter(
    (override) =>
      !PERMISSION_DEFINITIONS.some((permission) => permission.key === override.permissionKey)
  );

  if (invalidOverrides.length > 0) {
    throw new Error("Override invalide détecté");
  }

  const [
    { data: previousRoleRow },
    { data: previousProfileRow },
    { data: previousStylistRow },
    { data: previousLocationRows },
    { data: previousOverrideRows },
  ] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("profile:permission_profiles(key)")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    supabase
      .from("stylist_users")
      .select("stylist_id")
      .eq("user_id", targetUserId)
      .maybeSingle(),
    supabase
      .from("user_location_assignments")
      .select("location_id")
      .eq("user_id", targetUserId),
    supabase
      .from("user_permission_overrides")
      .select("permission_key,effect,scope_mode")
      .eq("user_id", targetUserId),
  ]);

  const previousProfileKey = (
    normalizeSingleRelation(previousProfileRow?.profile as { key: string } | { key: string }[] | null)?.key
    ?? null
  );
  const previousAssociatedStylistId = previousStylistRow?.stylist_id ?? null;
  const previousAssignedLocationIds = sortValues(
    (previousLocationRows ?? []).map((row) => row.location_id)
  );
  const previousOverrides = normalizeOverrides(
    (previousOverrideRows ?? []).map((row) => ({
      permissionKey: row.permission_key,
      effect: row.effect as OverrideEffect,
      scopeMode: row.scope_mode as ScopeMode | null,
    }))
  );

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert([{ id: targetUserId, role: input.role }]);

  if (roleError) {
    throw roleError;
  }

  if (input.role === "staff" && input.profileKey) {
    const { data: profileRow, error: profileLookupError } = await supabase
      .from("permission_profiles")
      .select("id")
      .eq("key", input.profileKey)
      .single();

    if (profileLookupError) throw profileLookupError;

    const { error: userProfileError } = await supabase
      .from("user_profiles")
      .upsert([{ user_id: targetUserId, profile_id: profileRow.id }]);

    if (userProfileError) throw userProfileError;
  } else {
    const { error: deleteProfileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteProfileError) throw deleteProfileError;
  }

  const { error: deleteStylistError } = await supabase
    .from("stylist_users")
    .delete()
    .eq("user_id", targetUserId);

  if (deleteStylistError) throw deleteStylistError;

  if (input.associatedStylistId) {
    const { error: insertStylistError } = await supabase
      .from("stylist_users")
      .insert([{ user_id: targetUserId, stylist_id: input.associatedStylistId }]);

    if (insertStylistError) throw insertStylistError;
  }

  const { error: deleteLocationsError } = await supabase
    .from("user_location_assignments")
    .delete()
    .eq("user_id", targetUserId);

  if (deleteLocationsError) throw deleteLocationsError;

  if (input.assignedLocationIds.length > 0) {
    const { error: insertLocationsError } = await supabase
      .from("user_location_assignments")
      .insert(
        input.assignedLocationIds.map((locationId) => ({
          user_id: targetUserId,
          location_id: locationId,
        }))
      );

    if (insertLocationsError) throw insertLocationsError;
  }

  const { error: deleteOverridesError } = await supabase
    .from("user_permission_overrides")
    .delete()
    .eq("user_id", targetUserId);

  if (deleteOverridesError) throw deleteOverridesError;

  if (input.overrides.length > 0) {
    const { error: insertOverridesError } = await supabase
      .from("user_permission_overrides")
      .insert(
        input.overrides.map((override) => ({
          user_id: targetUserId,
          permission_key: override.permissionKey,
          effect: override.effect,
          scope_mode: override.scopeMode,
        }))
      );

    if (insertOverridesError) throw insertOverridesError;
  }

  if ((previousRoleRow?.role as StaffRole | undefined) !== input.role) {
    await insertAdminAuditLog({
      actorUserId,
      targetUserId,
      entityType: "user_roles",
      entityId: targetUserId,
      action: "update",
      before: previousRoleRow ? { role: previousRoleRow.role } : null,
      after: { role: input.role },
      meta: { source: "admin_users_api" },
    });
  }

  if (previousProfileKey !== (input.profileKey ?? null)) {
    await insertAdminAuditLog({
      actorUserId,
      targetUserId,
      entityType: "user_profiles",
      entityId: targetUserId,
      action: "update",
      before: { profile_key: previousProfileKey },
      after: { profile_key: input.profileKey ?? null },
      meta: { source: "admin_users_api" },
    });
  }

  if (previousAssociatedStylistId !== (input.associatedStylistId ?? null)) {
    await insertAdminAuditLog({
      actorUserId,
      targetUserId,
      entityType: "stylist_users",
      entityId: targetUserId,
      action: "update",
      before: { stylist_id: previousAssociatedStylistId },
      after: { stylist_id: input.associatedStylistId ?? null },
      meta: { source: "admin_users_api" },
    });
  }

  const nextAssignedLocationIds = sortValues(input.assignedLocationIds);
  if (JSON.stringify(previousAssignedLocationIds) !== JSON.stringify(nextAssignedLocationIds)) {
    await insertAdminAuditLog({
      actorUserId,
      targetUserId,
      entityType: "user_location_assignments",
      entityId: targetUserId,
      action: "update",
      before: { location_ids: previousAssignedLocationIds },
      after: { location_ids: nextAssignedLocationIds },
      meta: { source: "admin_users_api" },
    });
  }

  const nextOverrides = normalizeOverrides(input.overrides);
  if (JSON.stringify(previousOverrides) !== JSON.stringify(nextOverrides)) {
    await insertAdminAuditLog({
      actorUserId,
      targetUserId,
      entityType: "user_permission_overrides",
      entityId: targetUserId,
      action: "update",
      before: { overrides: previousOverrides },
      after: { overrides: nextOverrides },
      meta: { source: "admin_users_api" },
    });
  }

  return getAdminUserDetail(targetUserId);
}

export async function deleteAdminUser(actorUserId: string, targetUserId: string) {
  const supabase = getSupabaseAdminClient();

  const [roleResult] = await Promise.all([
    supabase.from("user_roles").select("role").eq("id", targetUserId).maybeSingle(),
    supabase.from("user_profiles").delete().eq("user_id", targetUserId),
    supabase.from("user_permission_overrides").delete().eq("user_id", targetUserId),
    supabase.from("user_location_assignments").delete().eq("user_id", targetUserId),
    supabase.from("stylist_users").delete().eq("user_id", targetUserId),
  ]);

  const { error: deleteRoleError } = await supabase
    .from("user_roles")
    .delete()
    .eq("id", targetUserId);

  if (deleteRoleError) throw deleteRoleError;

  await supabase.from("admin_audit_log").insert([
    {
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      entity_type: "user_roles",
      entity_id: targetUserId,
      action: "delete",
      before_json: roleResult.data ? { role: roleResult.data.role } : null,
      after_json: null,
      meta_json: { source: "admin_users_api" },
    },
  ]);
}
