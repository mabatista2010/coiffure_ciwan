'use client';

import { useState, useEffect } from 'react';
import { FaUserEdit, FaTrash, FaSpinner, FaUserShield, FaUserCog, FaCut, FaInfoCircle, FaUser, FaEnvelope } from 'react-icons/fa';
import AdminNav from '@/components/AdminNav';
import { 
  getAllUsers, 
  assignUserRole,
  updateUserStylist,
  deleteUser, 
  isAdmin, 
  UserRole, 
  getActiveStylists,
  Stylist,
  UserWithStylist
} from '@/lib/userRoles';

export default function UserManagement() {
  const [users, setUsers] = useState<UserWithStylist[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado para edición
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRole>('employee');
  const [editUserStylistId, setEditUserStylistId] = useState<string>('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [isUpdatingStylist, setIsUpdatingStylist] = useState(false);
  
  // Estado para eliminación
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  
  // Verificar si el usuario actual es administrador
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Verificar si el usuario es administrador
      const adminStatus = await isAdmin();
      setIsUserAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('No tienes permisos para acceder a esta página');
        setLoading(false);
        return;
      }
      
      // Cargar estilistas activos
      const stylistsList = await getActiveStylists();
      setStylists(stylistsList);
      
      // Cargar la lista de usuarios
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
      const { success, error } = await assignUserRole(userId, editUserRole);
      
      if (!success) {
        throw new Error(error || 'Error al actualizar el rol del usuario');
      }
      
      // Recargar la lista de usuarios
      const { users: usersList } = await getAllUsers();
      setUsers(usersList);
      
      // Cerrar el formulario de edición
      setEditUserId(null);
      setSuccess('Rol actualizado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
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
        throw new Error('Debes seleccionar un estilista');
      }
      
      const { success, error } = await updateUserStylist(userId, editUserStylistId);
      
      if (!success) {
        throw new Error(error || 'Error al actualizar el estilista asociado');
      }
      
      // Recargar la lista de usuarios
      const { users: usersList } = await getAllUsers();
      setUsers(usersList);
      
      // Cerrar el formulario de edición
      setEditUserId(null);
      setSuccess('Estilista asociado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUpdatingStylist(false);
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    setIsDeletingUser(true);
    setError(null);
    setSuccess(null);
    
    try {
      const { success, error } = await deleteUser(userId);
      
      if (!success) {
        throw new Error(error || 'Error al eliminar el usuario');
      }
      
      // Actualizar la lista local
      setUsers(users.filter(user => user.id !== userId));
      
      // Cerrar el diálogo de confirmación
      setDeleteUserId(null);
      setSuccess('Usuario eliminado correctamente');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsDeletingUser(false);
    }
  };
  
  if (!isUserAdmin) {
    return (
      <div className="min-h-screen bg-dark">
        <AdminNav />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-secondary rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-primary text-2xl font-bold mb-4">Accès Refusé</h1>
            <p className="text-light">Vous n&apos;avez pas les permissions pour accéder à cette page. Seuls les administrateurs peuvent gérer les utilisateurs.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-dark">
      <AdminNav />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-primary mb-8">Gestion des Utilisateurs</h1>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md">
            <p>{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md">
            <p>{success}</p>
          </div>
        )}
        
        {/* Información sobre creación de usuarios */}
        <div className="bg-secondary rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-primary mb-4 flex items-center">
            <FaInfoCircle className="mr-2" /> Informations sur la Gestion des Utilisateurs
          </h2>
          
          <div className="text-light">
            <p className="mb-4">Le processus de gestion des utilisateurs fonctionne comme suit :</p>
            
            <ol className="list-decimal pl-5 space-y-2 mb-4">
              <li>Le propriétaire du site crée et envoie les invitations pour les nouveaux utilisateurs</li>
              <li>Une fois inscrits, les utilisateurs apparaîtront dans la liste ci-dessous</li>
              <li>En tant qu&apos;administrateur, vous pouvez leur attribuer un rôle (Employé ou Administrateur) et les associer à un styliste</li>
            </ol>
            
            <p className="p-2 bg-dark rounded border border-primary text-primary">
              Note: Les nouveaux utilisateurs reçoivent automatiquement le rôle d&apos;Employé. 
              En tant qu&apos;administrateur, vous pouvez modifier ce rôle ou les assigner à un styliste spécifique.
            </p>
          </div>
        </div>
        
        {/* Lista de usuarios con tarjetas en lugar de tabla */}
        <div className="bg-secondary rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Utilisateurs du Système</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-light">Chargement des utilisateurs...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {users.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <FaUser className="mx-auto text-primary opacity-50 text-5xl mb-4" />
                  <p className="text-light opacity-60 text-lg">Aucun utilisateur à afficher</p>
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="bg-dark rounded-lg p-4 shadow-lg border border-dark hover:border-primary transition-all">
                    <div className="flex items-start mb-4">
                      <div className="bg-secondary p-3 rounded-full mr-3">
                        <FaUser className="text-primary text-xl" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm text-light flex items-center">
                          <FaEnvelope className="mr-2 text-primary opacity-70" /> {user.email}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-primary bg-opacity-20 text-dark' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? (
                              <><FaUserShield className="mr-1" /> Administrateur</>
                            ) : (
                              <><FaUserCog className="mr-1" /> Employé</>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-secondary p-3 rounded-lg mb-4">
                      <p className="text-sm font-medium text-light mb-1">Styliste associé:</p>
                      {user.stylist_name ? (
                        <span className="text-sm flex items-center text-primary">
                          <FaCut className="mr-1" /> {user.stylist_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Non assigné</span>
                      )}
                    </div>
                    
                    {editUserId === user.id ? (
                      <div className="mt-4 space-y-3 bg-secondary p-3 rounded-lg">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-light">Rôle:</label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <select
                              value={editUserRole}
                              onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                              className="w-full sm:w-auto px-2 py-1 rounded-md bg-dark text-light border border-gray-700 focus:border-primary focus:outline-none flex-grow"
                            >
                              <option value="employee">Employé</option>
                              <option value="admin">Administrateur</option>
                            </select>
                            
                            <button
                              onClick={() => handleUpdateUserRole(user.id)}
                              disabled={isUpdatingUser}
                              className="w-full sm:w-auto p-1 rounded-md bg-primary text-dark hover:bg-opacity-90 transition-opacity sm:w-24"
                              title="Mettre à jour le rôle"
                            >
                              {isUpdatingUser ? <FaSpinner className="animate-spin mx-auto" /> : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-light">Styliste:</label>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <select
                              value={editUserStylistId}
                              onChange={(e) => setEditUserStylistId(e.target.value)}
                              className="w-full sm:w-auto px-2 py-1 rounded-md bg-dark text-light border border-gray-700 focus:border-primary focus:outline-none flex-grow"
                            >
                              <option value="">-- Sélectionner un Styliste --</option>
                              {stylists.map(stylist => (
                                <option key={stylist.id} value={stylist.id}>
                                  {stylist.name}
                                </option>
                              ))}
                            </select>
                            
                            <button
                              onClick={() => handleUpdateUserStylist(user.id)}
                              disabled={isUpdatingStylist}
                              className="w-full sm:w-auto p-1 rounded-md bg-primary text-dark hover:bg-opacity-90 transition-opacity sm:w-24"
                              title="Mettre à jour le styliste"
                            >
                              {isUpdatingStylist ? <FaSpinner className="animate-spin mx-auto" /> : "Enregistrer"}
                            </button>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setEditUserId(null)}
                          className="w-full p-2 rounded-md bg-gray-600 text-white hover:bg-opacity-90 transition-opacity"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2 mt-3">
                        <button
                          onClick={() => {
                            setEditUserId(user.id);
                            setEditUserRole(user.role);
                            setEditUserStylistId(user.stylist_id || '');
                          }}
                          className="p-2 rounded-md bg-blue-500 text-white hover:bg-opacity-90 transition-opacity flex items-center"
                          title="Modifier l'utilisateur"
                        >
                          <FaUserEdit className="mr-1" /> Modifier
                        </button>
                        
                        <button
                          onClick={() => setDeleteUserId(user.id)}
                          className="p-2 rounded-md bg-red-500 text-white hover:bg-opacity-90 transition-opacity flex items-center"
                          title="Supprimer l'utilisateur"
                        >
                          <FaTrash className="mr-1" /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        
        {/* Confirmación de eliminación */}
        {deleteUserId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-secondary rounded-lg shadow-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-primary mb-4">Confirmer la Suppression</h3>
              <p className="text-light mb-6">
                Êtes-vous sûr de vouloir supprimer cet utilisateur? Cette action ne peut pas être annulée.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteUserId(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-opacity-90 transition-opacity"
                >
                  Annuler
                </button>
                
                <button
                  onClick={() => handleDeleteUser(deleteUserId)}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-red-500 text-white rounded-md flex items-center hover:bg-opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isDeletingUser ? (
                    <><FaSpinner className="animate-spin mr-2" /> Suppression...</>
                  ) : (
                    <><FaTrash className="mr-2" /> Supprimer</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 