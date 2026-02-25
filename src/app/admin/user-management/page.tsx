"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCut,
  FaEnvelope,
  FaInfoCircle,
  FaSpinner,
  FaTrash,
  FaUser,
  FaUserCog,
  FaUserEdit,
  FaUserShield,
} from "react-icons/fa";

import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  SectionHeader,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignUserRole,
  deleteUser,
  getActiveStylists,
  getAllUsers,
  isAdmin,
  type Stylist,
  type UserRole,
  type UserWithStylist,
  updateUserStylist,
} from "@/lib/userRoles";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employe" },
  { value: "admin", label: "Administrateur" },
];

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStylist[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRole>("employee");
  const [editUserStylistId, setEditUserStylistId] = useState<string>("");
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingStylist, setIsUpdatingStylist] = useState(false);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const userPendingDelete = useMemo(
    () => users.find((user) => user.id === deleteUserId) ?? null,
    [deleteUserId, users]
  );

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const adminStatus = await isAdmin();
      setIsUserAdmin(adminStatus);

      if (!adminStatus) {
        setError("No tienes permisos para acceder a esta pagina");
        setLoading(false);
        return;
      }

      const stylistsList = await getActiveStylists();
      setStylists(stylistsList);

      const { users: usersList, error: usersError } = await getAllUsers();
      if (usersError) {
        setError(usersError);
      } else {
        setUsers(usersList);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleUpdateUserRole = async (userId: string) => {
    setIsUpdatingUser(true);
    setError(null);
    setSuccess(null);

    try {
      const { success: roleUpdated, error: roleError } = await assignUserRole(
        userId,
        editUserRole
      );

      if (!roleUpdated) {
        throw new Error(roleError || "Error al actualizar el rol del usuario");
      }

      const { users: usersList } = await getAllUsers();
      setUsers(usersList);
      setEditUserId(null);
      setSuccess("Rol actualizado correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdateUserStylist = async (userId: string) => {
    setIsUpdatingStylist(true);
    setError(null);
    setSuccess(null);

    try {
      if (!editUserStylistId) {
        throw new Error("Debes seleccionar un estilista");
      }

      const { success: stylistUpdated, error: stylistError } =
        await updateUserStylist(userId, editUserStylistId);

      if (!stylistUpdated) {
        throw new Error(stylistError || "Error al actualizar el estilista asociado");
      }

      const { users: usersList } = await getAllUsers();
      setUsers(usersList);
      setEditUserId(null);
      setSuccess("Estilista asociado correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsUpdatingStylist(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    setError(null);
    setSuccess(null);

    try {
      const { success: userDeleted, error: userDeleteError } = await deleteUser(
        userId
      );

      if (!userDeleted) {
        throw new Error(userDeleteError || "Error al eliminar el usuario");
      }

      setUsers(users.filter((user) => user.id !== userId));
      setDeleteUserId(null);
      setSuccess("Usuario eliminado correctamente");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsDeletingUser(false);
    }
  };

  if (loading && !isUserAdmin) {
    return (
      <main className="admin-scope min-h-screen bg-dark px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AdminCard>
            <AdminCardContent className="flex items-center justify-center gap-3 py-12 text-zinc-300">
              <FaSpinner className="h-5 w-5 animate-spin text-primary" />
              Verification des droits en cours...
            </AdminCardContent>
          </AdminCard>
        </div>
      </main>
    );
  }

  if (!isUserAdmin) {
    return (
      <main className="admin-scope min-h-screen bg-dark px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <AdminCard tone="highlight" className="border-destructive/35">
            <AdminCardHeader>
              <h1 className="text-2xl font-bold text-primary">Acces refuse</h1>
            </AdminCardHeader>
            <AdminCardContent className="text-zinc-300">
              Vous n&apos;avez pas les permissions pour acceder a cette page.
              Seuls les administrateurs peuvent gerer les utilisateurs.
            </AdminCardContent>
          </AdminCard>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-scope min-h-screen bg-dark px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Gestion des Utilisateurs"
          description="Attribution des roles et liaison styliste pour les comptes de l'espace admin."
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
            <AdminCardContent className="py-4 text-sm text-emerald-300">
              {success}
            </AdminCardContent>
          </AdminCard>
        ) : null}

        <AdminCard>
          <AdminCardHeader>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-zinc-100">
              <FaInfoCircle className="text-primary" />
              Informations sur la gestion des utilisateurs
            </h2>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4 text-sm text-zinc-300">
            <p>Le processus fonctionne comme suit :</p>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                Le proprietaire du site envoie les invitations des nouveaux
                utilisateurs.
              </li>
              <li>Une fois inscrits, les comptes apparaissent ci-dessous.</li>
              <li>
                L&apos;administrateur attribue le role (Employe ou Administrateur)
                et peut associer un styliste.
              </li>
            </ol>
            <p className="rounded-xl border border-primary/30 bg-black/30 p-3 text-primary">
              Les nouveaux utilisateurs recoivent automatiquement le role
              Employe.
            </p>
          </AdminCardContent>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader>
            <h2 className="text-xl font-semibold text-zinc-100">
              Utilisateurs du systeme
            </h2>
          </AdminCardHeader>
          <AdminCardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-300">
                <FaSpinner className="h-8 w-8 animate-spin text-primary" />
                Chargement des utilisateurs...
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-400">
                <FaUser className="h-12 w-12 text-primary/60" />
                Aucun utilisateur a afficher.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {users.map((user) => {
                  const isEditing = editUserId === user.id;

                  return (
                    <AdminCard
                      key={user.id}
                      className="h-full border-white/8 bg-black/35 shadow-none"
                    >
                      <AdminCardContent className="space-y-4 pt-6">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full border border-primary/20 bg-secondary p-3">
                            <FaUser className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="flex items-center gap-2 text-sm text-zinc-300">
                              <FaEnvelope className="h-3.5 w-3.5 text-primary/70" />
                              <span className="truncate">{user.email}</span>
                            </p>
                            <Badge
                              variant={user.role === "admin" ? "warning" : "info"}
                              className="normal-case tracking-normal"
                            >
                              {user.role === "admin" ? (
                                <>
                                  <FaUserShield className="h-3 w-3" /> Administrateur
                                </>
                              ) : (
                                <>
                                  <FaUserCog className="h-3 w-3" /> Employe
                                </>
                              )}
                            </Badge>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-secondary/50 p-3 text-sm">
                          <p className="mb-1 font-medium text-zinc-300">
                            Styliste associe
                          </p>
                          {user.stylist_name ? (
                            <p className="flex items-center gap-2 text-primary">
                              <FaCut className="h-3.5 w-3.5" />
                              {user.stylist_name}
                            </p>
                          ) : (
                            <p className="text-zinc-500">Non assigne</p>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 rounded-xl border border-primary/20 bg-black/25 p-3">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                Role
                              </label>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Select
                                  value={editUserRole}
                                  onValueChange={(value) =>
                                    setEditUserRole(value as UserRole)
                                  }
                                >
                                  <SelectTrigger className="w-full sm:flex-1">
                                    <SelectValue placeholder="Selectionner un role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROLE_OPTIONS.map((roleOption) => (
                                      <SelectItem
                                        key={roleOption.value}
                                        value={roleOption.value}
                                      >
                                        {roleOption.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleUpdateUserRole(user.id)}
                                  disabled={isUpdatingUser}
                                  className="sm:min-w-28"
                                >
                                  {isUpdatingUser ? (
                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Enregistrer"
                                  )}
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                Styliste
                              </label>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Select
                                  value={editUserStylistId || "unassigned"}
                                  onValueChange={(value) =>
                                    setEditUserStylistId(
                                      value === "unassigned" ? "" : value
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-full sm:flex-1">
                                    <SelectValue placeholder="Selectionner un styliste" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unassigned">
                                      -- Selectionner un styliste --
                                    </SelectItem>
                                    {stylists.map((stylist) => (
                                      <SelectItem key={stylist.id} value={stylist.id}>
                                        {stylist.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleUpdateUserStylist(user.id)}
                                  disabled={isUpdatingStylist}
                                  className="sm:min-w-28"
                                >
                                  {isUpdatingStylist ? (
                                    <FaSpinner className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Enregistrer"
                                  )}
                                </Button>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              className="w-full"
                              onClick={() => setEditUserId(null)}
                            >
                              Annuler
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setEditUserId(user.id);
                                setEditUserRole(user.role);
                                setEditUserStylistId(user.stylist_id || "");
                              }}
                            >
                              <FaUserEdit className="h-3.5 w-3.5" />
                              Modifier
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteUserId(user.id)}
                            >
                              <FaTrash className="h-3.5 w-3.5" />
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </AdminCardContent>
                    </AdminCard>
                  );
                })}
              </div>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      <Dialog
        open={Boolean(deleteUserId)}
        onOpenChange={(open) => {
          if (!open && !isDeletingUser) {
            setDeleteUserId(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Cette action supprimera le compte
              {userPendingDelete ? ` ${userPendingDelete.email}` : ""}.
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteUserId(null)}
              disabled={isDeletingUser}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deleteUserId) {
                  void handleDeleteUser(deleteUserId);
                }
              }}
              disabled={isDeletingUser || !deleteUserId}
            >
              {isDeletingUser ? (
                <>
                  <FaSpinner className="h-4 w-4 animate-spin" /> Suppression...
                </>
              ) : (
                <>
                  <FaTrash className="h-4 w-4" /> Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
