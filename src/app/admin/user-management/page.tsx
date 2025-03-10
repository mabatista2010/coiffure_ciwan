'use client';

import { useState, useEffect } from 'react';
import { FaUserEdit, FaTrash, FaSpinner, FaUserShield, FaUserCog, FaCut, FaInfoCircle } from 'react-icons/fa';
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
        
        {/* Lista de usuarios */}
        <div className="bg-secondary rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Utilisateurs du Système</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 text-light">Chargement des utilisateurs...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-light">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4">Styliste</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-light">
                        Aucun utilisateur à afficher
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-800">
                        <td className="py-3 px-4">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-primary bg-opacity-20 text-primary' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? (
                              <><FaUserShield className="mr-1" /> Administrateur</>
                            ) : (
                              <><FaUserCog className="mr-1" /> Employé</>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {user.stylist_name ? (
                            <span className="inline-flex items-center text-light">
                              <FaCut className="mr-1 text-primary" /> {user.stylist_name}
                            </span>
                          ) : (
                            <span className="text-gray-500">Non assigné</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {editUserId === user.id ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <select
                                  value={editUserRole}
                                  onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                                  className="px-2 py-1 rounded-md bg-dark text-light border border-gray-700 focus:border-primary focus:outline-none"
                                >
                                  <option value="employee">Employé</option>
                                  <option value="admin">Administrateur</option>
                                </select>
                                
                                <button
                                  onClick={() => handleUpdateUserRole(user.id)}
                                  disabled={isUpdatingUser}
                                  className="p-1 rounded-md bg-primary text-dark hover:bg-opacity-90 transition-opacity"
                                  title="Mettre à jour le rôle"
                                >
                                  {isUpdatingUser ? <FaSpinner className="animate-spin" /> : "Enregistrer"}
                                </button>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <select
                                  value={editUserStylistId}
                                  onChange={(e) => setEditUserStylistId(e.target.value)}
                                  className="px-2 py-1 rounded-md bg-dark text-light border border-gray-700 focus:border-primary focus:outline-none"
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
                                  className="p-1 rounded-md bg-primary text-dark hover:bg-opacity-90 transition-opacity"
                                  title="Mettre à jour le styliste"
                                >
                                  {isUpdatingStylist ? <FaSpinner className="animate-spin" /> : "Enregistrer"}
                                </button>
                              </div>
                              
                              <button
                                onClick={() => setEditUserId(null)}
                                className="p-1 rounded-md bg-gray-600 text-white hover:bg-opacity-90 transition-opacity"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => {
                                  setEditUserId(user.id);
                                  setEditUserRole(user.role);
                                  setEditUserStylistId(user.stylist_id || '');
                                }}
                                className="p-1 rounded-md bg-blue-500 text-white hover:bg-opacity-90 transition-opacity"
                                title="Modifier l'utilisateur"
                              >
                                <FaUserEdit />
                              </button>
                              
                              <button
                                onClick={() => setDeleteUserId(user.id)}
                                className="p-1 rounded-md bg-red-500 text-white hover:bg-opacity-90 transition-opacity"
                                title="Supprimer l'utilisateur"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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