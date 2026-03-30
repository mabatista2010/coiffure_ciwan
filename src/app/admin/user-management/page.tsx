"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCut,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSpinner,
  FaUserCog,
  FaUserEdit,
  FaUserShield,
} from "react-icons/fa";

import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminSidePanel,
  SectionHeader,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchWithStaffAuth } from "@/lib/fetchWithStaffAuth";
import { type ScopeMode, type StaffRole } from "@/lib/permissions/catalog";
import { cn } from "@/lib/utils";

type UserSummary = {
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

type PermissionDefinition = {
  key: string;
  module: string;
  label: string;
  description: string;
  allowedScopes: ScopeMode[];
};

type PermissionCatalogGroup = {
  module: string;
  label: string;
  permissions: PermissionDefinition[];
};

type UserDetail = UserSummary & {
  assignedLocationIds: string[];
  overrides: Array<{
    permissionKey: string;
    effect: "allow" | "deny";
    scopeMode: ScopeMode | null;
  }>;
  effectiveAccess: {
    role: StaffRole;
    profileKey: string | null;
    profileName: string | null;
    permissions: Record<
      string,
      { allowed: boolean; scope: ScopeMode; source: "admin" | "profile" | "override_allow" | "override_deny" | "none" }
    >;
  } | null;
  auditLog: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    metaJson: Record<string, unknown> | null;
  }>;
};

type FormState = {
  role: StaffRole;
  profileKey: string | null;
  associatedStylistId: string | null;
  assignedLocationIds: string[];
  overrides: Array<{
    permissionKey: string;
    effect: "allow" | "deny";
    scopeMode: ScopeMode | null;
  }>;
};

type UsersPayload = {
  users: UserSummary[];
  profiles: Array<{ key: string; name: string; description: string }>;
  profilePermissions: Record<string, Record<string, ScopeMode>>;
  stylists: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
  permissionCatalog: PermissionCatalogGroup[];
};

type DetailPayload = { user: UserDetail };
type EffectivePermissionSource = NonNullable<UserDetail["effectiveAccess"]>["permissions"][string]["source"];

function buildInitialForm(user: UserDetail): FormState {
  return {
    role: user.role,
    profileKey: user.profileKey,
    associatedStylistId: user.associatedStylistId,
    assignedLocationIds: user.assignedLocationIds,
    overrides: user.overrides,
  };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSourceLabel(source: EffectivePermissionSource) {
  switch (source) {
    case "admin":
      return "Admin";
    case "profile":
      return "Profil de base";
    case "override_allow":
      return "Ajout manuel";
    case "override_deny":
      return "Blocage manuel";
    default:
      return "Aucun accès";
  }
}

function getScopeLabel(scope: ScopeMode) {
  switch (scope) {
    case "all":
      return "Tous les éléments";
    case "none":
      return "Aucun accès";
    case "own_stylist":
      return "Styliste associé";
    case "assigned_location":
      return "Centre assigné";
    case "specific_locations":
      return "Centres sélectionnés";
    default:
      return scope;
  }
}

function getInheritedPermissionState(
  form: FormState,
  profilePermissions: Record<string, Record<string, ScopeMode>>,
  permission: PermissionDefinition
) {
  const profileMap = form.profileKey ? profilePermissions[form.profileKey] ?? {} : {};

  if (form.role === "admin") {
    return {
      allowed: true,
      scope: "all" as ScopeMode,
      source: "admin" as const,
    };
  }

  if (profileMap[permission.key]) {
    return {
      allowed: true,
      scope: profileMap[permission.key],
      source: "profile" as const,
    };
  }

  return {
    allowed: false,
    scope: "none" as ScopeMode,
    source: "none" as const,
  };
}

function resolveEffectivePermissions(
  form: FormState,
  profilePermissions: Record<string, Record<string, ScopeMode>>,
  permissionCatalog: PermissionCatalogGroup[]
) {
  const overrideMap = new Map(form.overrides.map((override) => [override.permissionKey, override]));
  const profileMap = form.profileKey ? profilePermissions[form.profileKey] ?? {} : {};

  return permissionCatalog.map((group) => ({
    ...group,
    permissions: group.permissions.map((permission) => {
      if (form.role === "admin") {
        return {
          ...permission,
          allowed: true,
          scope: "all" as ScopeMode,
          source: "admin" as const,
        };
      }

      const override = overrideMap.get(permission.key);
      if (override?.effect === "deny") {
        return {
          ...permission,
          allowed: false,
          scope: "none" as ScopeMode,
          source: "override_deny" as const,
        };
      }

      if (override?.effect === "allow") {
        return {
          ...permission,
          allowed: true,
          scope: override.scopeMode ?? profileMap[permission.key] ?? permission.allowedScopes[0] ?? "all",
          source: "override_allow" as const,
        };
      }

      if (profileMap[permission.key]) {
        return {
          ...permission,
          allowed: true,
          scope: profileMap[permission.key],
          source: "profile" as const,
        };
      }

      return {
        ...permission,
        allowed: false,
        scope: "none" as ScopeMode,
        source: "none" as const,
      };
    }),
  }));
}

export default function UserManagementPage() {
  const { accessContext, isLoading: loadingAccess } = useAdminAccess();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [profiles, setProfiles] = useState<UsersPayload["profiles"]>([]);
  const [profilePermissions, setProfilePermissions] = useState<UsersPayload["profilePermissions"]>({});
  const [stylists, setStylists] = useState<UsersPayload["stylists"]>([]);
  const [locations, setLocations] = useState<UsersPayload["locations"]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<PermissionCatalogGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithStaffAuth("/api/admin/users");
      const payload = (await response.json()) as UsersPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les utilisateurs");
      }

      setUsers(payload.users);
      setProfiles(payload.profiles);
      setProfilePermissions(payload.profilePermissions);
      setStylists(payload.stylists);
      setLocations(payload.locations);
      setPermissionCatalog(payload.permissionCatalog);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadingAccess || accessContext?.role !== "admin") return;
    void loadUsers();
  }, [accessContext, loadUsers, loadingAccess]);

  const openUserPanel = useCallback(async (userId: string) => {
    setPanelOpen(true);
    setPanelLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithStaffAuth(`/api/admin/users/${userId}`);
      const payload = (await response.json()) as DetailPayload & { error?: string };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Impossible de charger cet utilisateur");
      }

      setSelectedUser(payload.user);
      setForm(buildInitialForm(payload.user));
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "Erreur de chargement");
      setPanelOpen(false);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  const effectivePermissions = useMemo(() => {
    if (!form) return [];
    return resolveEffectivePermissions(form, profilePermissions, permissionCatalog);
  }, [form, permissionCatalog, profilePermissions]);

  const updateOverride = useCallback(
    (permissionKey: string, mode: "inherit" | "allow" | "deny", scopeMode?: ScopeMode | null) => {
      setForm((current) => {
        if (!current) return current;

        const nextOverrides = current.overrides.filter((override) => override.permissionKey !== permissionKey);
        if (mode !== "inherit") {
          nextOverrides.push({
            permissionKey,
            effect: mode,
            scopeMode: mode === "allow" ? scopeMode ?? null : null,
          });
        }

        return {
          ...current,
          overrides: nextOverrides.sort((left, right) => left.permissionKey.localeCompare(right.permissionKey)),
        };
      });
    },
    []
  );

  const saveUser = useCallback(async () => {
    if (!selectedUser || !form) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithStaffAuth(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as DetailPayload & { error?: string };

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Impossible d'enregistrer cet utilisateur");
      }

      setSelectedUser(payload.user);
      setForm(buildInitialForm(payload.user));
      setUsers((current) =>
        current.map((user) =>
          user.id === payload.user.id
            ? {
                id: payload.user.id,
                email: payload.user.email,
                role: payload.user.role,
                profileKey: payload.user.profileKey,
                profileName: payload.user.profileName,
                associatedStylistId: payload.user.associatedStylistId,
                associatedStylistName: payload.user.associatedStylistName,
                assignedLocations: payload.user.assignedLocations,
                overrideCount: payload.user.overrideCount,
              }
            : user
        )
      );
      setSuccess("Utilisateur mis à jour.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  }, [form, selectedUser]);

  const deleteUser = useCallback(async () => {
    if (!selectedUser) return;

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithStaffAuth(`/api/admin/users/${selectedUser.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de supprimer cet utilisateur");
      }

      setUsers((current) => current.filter((user) => user.id !== selectedUser.id));
      setSelectedUser(null);
      setForm(null);
      setPanelOpen(false);
      setDeleteDialogOpen(false);
      setSuccess("Utilisateur supprimé.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erreur de suppression");
    } finally {
      setDeleting(false);
    }
  }, [selectedUser]);

  if (loadingAccess) {
    return (
      <main className="admin-scope min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AdminCard>
            <AdminCardContent className="flex items-center justify-center gap-3 py-12">
              <FaSpinner className="h-5 w-5 animate-spin text-primary" />
              Chargement des accès...
            </AdminCardContent>
          </AdminCard>
        </div>
      </main>
    );
  }

  if (accessContext?.role !== "admin") {
    return (
      <main className="admin-scope min-h-screen bg-background px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AdminCard tone="highlight" className="border-destructive/35">
            <AdminCardHeader>
              <h1 className="text-2xl font-bold text-primary">Accès refusé</h1>
            </AdminCardHeader>
            <AdminCardContent>
              Seuls les administrateurs peuvent gérer les utilisateurs et permissions.
            </AdminCardContent>
          </AdminCard>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-scope min-h-screen overflow-x-hidden bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6">
        <SectionHeader
          title="Gestion des utilisateurs"
          description="Rôle global, profil de permissions, scope styliste/centres et overrides granularisés."
        />

        {error ? (
          <AdminCard className="border-destructive/35 bg-destructive/10">
            <AdminCardContent className="py-4 text-sm text-destructive-foreground">
              {error}
            </AdminCardContent>
          </AdminCard>
        ) : null}

        {success ? (
          <AdminCard className="border-emerald-500/35 bg-emerald-500/12">
            <AdminCardContent className="py-4 text-sm text-emerald-700">{success}</AdminCardContent>
          </AdminCard>
        ) : null}

        <AdminCard>
          <AdminCardHeader>
            <h2 className="text-xl font-semibold text-foreground">Comptes admin/staff</h2>
          </AdminCardHeader>
          <AdminCardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12">
                <FaSpinner className="h-5 w-5 animate-spin text-primary" />
                Chargement des utilisateurs...
              </div>
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {users.map((user) => (
                  <AdminCard key={user.id} className="h-full overflow-hidden border-border/80 bg-card">
                    <AdminCardContent className="space-y-4 pt-6">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full border border-border bg-muted/40 p-3">
                          {user.role === "admin" ? (
                            <FaUserShield className="h-4 w-4 text-primary" />
                          ) : (
                            <FaUserCog className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p className="flex items-center gap-2 text-sm text-foreground">
                            <FaEnvelope className="h-3.5 w-3.5 text-primary/70" />
                            <span className="truncate">{user.email}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={user.role === "admin" ? "warning" : "info"}>
                              {user.role === "admin" ? "Admin" : "Staff"}
                            </Badge>
                            {user.profileName ? <Badge variant="secondary">{user.profileName}</Badge> : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          <FaCut className="h-3.5 w-3.5 text-primary/70" />
                          {user.associatedStylistName || "Aucun styliste associé"}
                        </p>
                        <p className="flex items-center gap-2">
                          <FaMapMarkerAlt className="h-3.5 w-3.5 text-primary/70" />
                          {user.assignedLocations.length > 0
                            ? `${user.assignedLocations.length} centre(s) assigné(s)`
                            : "Aucun centre assigné"}
                        </p>
                        <p>{user.overrideCount} override(s) individuel(s)</p>
                      </div>

                      <Button
                        type="button"
                        className="w-full gap-2 whitespace-normal"
                        onClick={() => void openUserPanel(user.id)}
                      >
                        <FaUserEdit className="h-4 w-4" />
                        Configurer l&apos;accès
                      </Button>
                    </AdminCardContent>
                  </AdminCard>
                ))}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminSidePanel
        open={panelOpen}
        onOpenChange={(open) => {
          setPanelOpen(open);
          if (!open) {
            setSelectedUser(null);
            setForm(null);
          }
        }}
        title={selectedUser ? `Accès de ${selectedUser.email}` : "Configuration utilisateur"}
        description="Profil, scope et overrides individuels."
        width="xl"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={!selectedUser || deleting || saving}
              className="whitespace-normal"
            >
              Supprimer l&apos;accès utilisateur
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setPanelOpen(false)}>
                Fermer
              </Button>
              <Button type="button" onClick={() => void saveUser()} disabled={!form || saving || panelLoading}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        }
      >
        {panelLoading || !selectedUser || !form ? (
          <div className="flex items-center justify-center gap-3 py-12">
            <FaSpinner className="h-5 w-5 animate-spin text-primary" />
            Chargement du panneau...
          </div>
        ) : (
          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Identité</h3>
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                <p className="font-medium text-foreground">{selectedUser.email}</p>
                <p className="text-sm text-muted-foreground">ID: {selectedUser.id}</p>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rôle et profil</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">Rôle global</label>
                  <div className="flex flex-wrap gap-2">
                    {(["admin", "staff"] as const).map((roleOption) => (
                      <Button
                        key={roleOption}
                        type="button"
                        variant={form.role === roleOption ? "default" : "outline"}
                        onClick={() => setForm((current) => current ? { ...current, role: roleOption } : current)}
                      >
                        {roleOption === "admin" ? "Admin" : "Staff"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <label className="mb-2 block text-sm font-medium text-foreground">Profil de base</label>
                  <div className="flex flex-wrap gap-2">
                    {profiles.map((profile) => (
                      <Button
                        key={profile.key}
                        type="button"
                        variant={form.profileKey === profile.key ? "default" : "outline"}
                        onClick={() =>
                          setForm((current) =>
                            current ? { ...current, profileKey: profile.key } : current
                          )
                        }
                        className="whitespace-normal"
                      >
                        {profile.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Associations</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Styliste associé</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={form.associatedStylistId === null ? "default" : "outline"}
                      onClick={() =>
                        setForm((current) =>
                          current ? { ...current, associatedStylistId: null } : current
                        )
                      }
                    >
                      Aucun
                    </Button>
                    {stylists.map((stylist) => (
                      <Button
                        key={stylist.id}
                        type="button"
                        variant={form.associatedStylistId === stylist.id ? "default" : "outline"}
                        onClick={() =>
                          setForm((current) =>
                            current ? { ...current, associatedStylistId: stylist.id } : current
                          )
                        }
                        className="whitespace-normal"
                      >
                        {stylist.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/80 bg-card p-4">
                  <p className="mb-3 text-sm font-medium text-foreground">Centres assignés</p>
                  <div className="space-y-3">
                    {locations.map((location) => {
                      const checked = form.assignedLocationIds.includes(location.id);
                      return (
                        <label key={location.id} className="flex items-center gap-3 text-sm text-foreground">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextChecked) =>
                              setForm((current) => {
                                if (!current) return current;
                                return {
                                  ...current,
                                  assignedLocationIds: nextChecked
                                    ? [...current.assignedLocationIds, location.id]
                                    : current.assignedLocationIds.filter((id) => id !== location.id),
                                };
                              })
                            }
                          />
                          <span>{location.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Overrides par permission</h3>
              <div className="space-y-4">
                {permissionCatalog.map((group) => (
                  <details key={group.module} className="rounded-2xl border border-border/80 bg-card p-4" open>
                    <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                      {group.label}
                    </summary>
                    <div className="mt-4 space-y-4">
                      {group.permissions.map((permission) => {
                        const override = form.overrides.find((entry) => entry.permissionKey === permission.key);
                        const mode = override?.effect ?? "inherit";
                        const inheritedState = getInheritedPermissionState(form, profilePermissions, permission);
                        const scopeValue = override?.scopeMode ?? inheritedState.scope ?? permission.allowedScopes[0] ?? "all";

                        return (
                          <div key={permission.key} className="rounded-xl border border-border/70 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{permission.label}</p>
                                <p className="text-xs text-muted-foreground">{permission.description}</p>
                              </div>
                              <div className="flex min-w-0 flex-col gap-2 lg:w-[22rem]">
                                <div className="flex flex-wrap gap-2">
                                  {(["inherit", "allow", "deny"] as const).map((option) => {
                                    const isSelected = mode === option;
                                    const inheritedHint = mode === "inherit" && (
                                      (option === "allow" && inheritedState.allowed)
                                      || (option === "deny" && !inheritedState.allowed)
                                    );

                                    return (
                                      <Button
                                        key={option}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                          inheritedHint && !isSelected && option === "allow" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15",
                                          inheritedHint && !isSelected && option === "deny" && "border-amber-500/45 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15"
                                        )}
                                        onClick={() =>
                                          updateOverride(
                                            permission.key,
                                            option,
                                            option === "allow" ? scopeValue : null
                                          )
                                        }
                                      >
                                        {option === "inherit"
                                          ? "Hériter"
                                          : option === "allow"
                                            ? "Autoriser"
                                            : "Refuser"}
                                      </Button>
                                    );
                                  })}
                                </div>
                                {mode === "inherit" ? (
                                  <p className="text-xs text-muted-foreground">
                                    Hérité du profil : {inheritedState.allowed ? "autorisé" : "refusé"}
                                    {inheritedState.allowed ? ` · Scope : ${getScopeLabel(inheritedState.scope)}` : ""}
                                  </p>
                                ) : null}
                                {mode === "allow" ? (
                                  <div className="flex flex-wrap gap-2">
                                    {permission.allowedScopes.map((scope) => (
                                      <Button
                                        key={scope}
                                        type="button"
                                        size="sm"
                                        variant={scopeValue === scope ? "default" : "outline"}
                                        onClick={() => updateOverride(permission.key, "allow", scope)}
                                      >
                                        {getScopeLabel(scope)}
                                      </Button>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Permissions effectives</h3>
              <div className="space-y-4">
                {effectivePermissions.map((group) => (
                  <div key={group.module} className="rounded-2xl border border-border/80 bg-card p-4">
                    <h4 className="mb-3 text-sm font-semibold text-foreground">{group.label}</h4>
                    <div className="space-y-2">
                      {group.permissions.map((permission) => (
                        <div
                          key={permission.key}
                          className={cn(
                            "flex flex-col gap-2 rounded-xl border p-3 text-sm md:flex-row md:items-center md:justify-between",
                            permission.allowed
                              ? "border-emerald-500/35 bg-emerald-500/10"
                              : "border-border/70 bg-muted/20"
                          )}
                          >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{permission.label}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant={permission.allowed ? "success" : "secondary"}>
                              {permission.allowed ? "Autorisé" : "Refusé"}
                            </Badge>
                            <Badge variant="outline">{getScopeLabel(permission.scope)}</Badge>
                            <Badge variant="secondary">{getSourceLabel(permission.source)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Audit récent</h3>
              <div className="rounded-2xl border border-border/80 bg-card p-4">
                {selectedUser.auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune trace récente.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedUser.auditLog.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-border/70 p-3 text-sm">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{entry.entityType}</Badge>
                          <Badge variant="secondary">{entry.action}</Badge>
                        </div>
                        <p className="mt-2 text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </AdminSidePanel>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cet accès ?</DialogTitle>
            <DialogDescription>
              Cela retirera le rôle, les profils, les scopes et les overrides de l&apos;utilisateur
              sélectionné, sans supprimer son compte Auth.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" variant="destructive" onClick={() => void deleteUser()} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer l'accès"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
