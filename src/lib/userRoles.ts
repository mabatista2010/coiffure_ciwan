import { supabase } from './supabase';

export type UserRole = 'admin' | 'employee';

export interface UserRoleData {
  id: string;
  role: UserRole;
}

export interface Stylist {
  id: string;
  name: string;
}

export interface UserWithStylist extends UserRoleData {
  email: string;
  stylist_id?: string;
  stylist_name?: string;
}

/**
 * Verifica el rol del usuario actual
 * @returns El rol del usuario o null si no está autenticado
 */
export async function getUserRole(): Promise<UserRole | null> {
  try {
    // Obtener la sesión actual
    const { data: sessionData } = await supabase.auth.getSession();
    
    if (!sessionData.session || !sessionData.session.user) {
      return null;
    }
    
    const userId = sessionData.session.user.id;
    
    // Consultar la tabla user_roles
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('id', userId)
      .single();
      
    if (error || !data) {
      console.error('Error al obtener el rol del usuario:', error);
      return null;
    }
    
    return data.role as UserRole;
  } catch (error) {
    console.error('Error al verificar el rol del usuario:', error);
    return null;
  }
}

/**
 * Verifica si el usuario actual es administrador
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'admin';
}

/**
 * Verifica si el usuario actual es empleado
 */
export async function isEmployee(): Promise<boolean> {
  const role = await getUserRole();
  return role === 'employee';
}

/**
 * Obtiene la lista de estilistas activos
 */
export async function getActiveStylists(): Promise<Stylist[]> {
  try {
    const { data, error } = await supabase
      .from('stylists')
      .select('id, name')
      .eq('active', true)
      .order('name');
      
    if (error) {
      console.error('Error al obtener estilistas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error al obtener estilistas:', error);
    return [];
  }
}

/**
 * Asigna un rol a un usuario existente y lo asocia a un estilista
 */
export async function assignUserRole(userId: string, role: UserRole = 'employee', stylistId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Solo los administradores pueden asignar roles
    if (!(await isAdmin())) {
      return { success: false, error: 'No tienes permisos para asignar roles' };
    }
    
    // Asignar el rol al usuario
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert([{ id: userId, role }]);
      
    if (roleError) {
      throw roleError;
    }
    
    // Si se proporciona un ID de estilista, asociarlo con el usuario
    if (stylistId) {
      // Primero eliminamos asociaciones existentes
      const { error: deleteError } = await supabase
        .from('stylist_users')
        .delete()
        .eq('user_id', userId);
        
      if (deleteError) {
        console.warn('Error al eliminar asociaciones existentes:', deleteError);
      }
      
      // Luego creamos la nueva asociación
      const { error: relationError } = await supabase
        .from('stylist_users')
        .insert([{ 
          user_id: userId, 
          stylist_id: stylistId
        }]);
        
      if (relationError) {
        throw relationError;
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al asignar rol al usuario:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al asignar rol' 
    };
  }
}

/**
 * Actualiza la asociación entre usuario y estilista
 */
export async function updateUserStylist(userId: string, stylistId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Solo los administradores pueden actualizar asociaciones
    if (!(await isAdmin())) {
      return { success: false, error: 'No tienes permisos para actualizar asociaciones' };
    }
    
    // Primero eliminamos cualquier asociación existente
    const { error: deleteError } = await supabase
      .from('stylist_users')
      .delete()
      .eq('user_id', userId);
      
    if (deleteError) {
      throw deleteError;
    }
    
    // Luego creamos la nueva asociación
    const { error: insertError } = await supabase
      .from('stylist_users')
      .insert([{ user_id: userId, stylist_id: stylistId }]);
      
    if (insertError) {
      throw insertError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar asociación de usuario-estilista:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al actualizar la asociación' 
    };
  }
}

/**
 * Elimina un usuario y su rol
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Solo los administradores pueden eliminar usuarios
    if (!(await isAdmin())) {
      return { success: false, error: 'No tienes permisos para eliminar usuarios' };
    }
    
    // Solo eliminamos de user_roles y stylist_users, no de autenticación
    // Esto evita el uso de la API administrativa
    
    // Eliminar de stylist_users
    const { error: stylistUserError } = await supabase
      .from('stylist_users')
      .delete()
      .eq('user_id', userId);
      
    if (stylistUserError) {
      console.warn('Error al eliminar asociación estilista-usuario:', stylistUserError);
    }
    
    // Eliminar de user_roles
    const { error: roleError } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', userId);
      
    if (roleError) {
      throw roleError;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido al eliminar el usuario' 
    };
  }
}

/**
 * Obtiene la lista de todos los usuarios con sus roles y estilistas asociados
 */
export async function getAllUsers(): Promise<{ users: UserWithStylist[]; error?: string }> {
  try {
    // Solo los administradores pueden ver todos los usuarios
    if (!(await isAdmin())) {
      return { users: [], error: 'No tienes permisos para ver la lista de usuarios' };
    }
    
    // Obtener datos de user_roles que ya incluyen los IDs de usuario
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('id, role');
      
    if (rolesError) {
      throw rolesError;
    }
    
    // Obtener la sesión actual para obtener al menos el usuario actual
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    
    // Crear un arreglo básico de usuarios a partir de los roles
    // Incluimos al usuario actual con su email conocido
    const users = userRoles.map(role => {
      // Si este es el usuario actual, incluimos su email
      const isCurrentUser = currentUser && role.id === currentUser.id;
      return {
        id: role.id,
        email: isCurrentUser ? currentUser.email || '' : `Usuario ${role.id.substring(0, 8)}` // Usamos un placeholder para otros usuarios
      };
    });
    
    // Obtener relaciones usuario-estilista
    const { data: stylistUsers, error: relationError } = await supabase
      .from('stylist_users')
      .select('user_id, stylist_id');
      
    if (relationError) {
      throw relationError;
    }
    
    // Obtener estilistas
    const { data: stylists, error: stylistsError } = await supabase
      .from('stylists')
      .select('id, name');
      
    if (stylistsError) {
      throw stylistsError;
    }
    
    // Combinar los datos
    const usersWithRolesAndStylists = users.map(user => {
      const roleData = userRoles?.find(r => r.id === user.id);
      const stylistUser = stylistUsers?.find(su => su.user_id === user.id);
      const stylist = stylistUser ? stylists?.find(s => s.id === stylistUser.stylist_id) : null;
      
      return {
        id: user.id,
        email: user.email,
        role: (roleData?.role as UserRole) || 'employee',
        stylist_id: stylist?.id,
        stylist_name: stylist?.name
      };
    });
    
    return { users: usersWithRolesAndStylists };
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return { 
      users: [],
      error: error instanceof Error ? error.message : 'Error desconocido al obtener usuarios' 
    };
  }
}

/**
 * Obtiene usuarios que existen en auth pero no tienen un rol asignado
 */
export async function getNewUsers(): Promise<{ users: Array<{id: string; email: string}>; error?: string }> {
  try {
    // Solo los administradores pueden ver todos los usuarios
    if (!(await isAdmin())) {
      return { users: [], error: 'No tienes permisos para ver la lista de usuarios' };
    }
    
    // Obtener la sesión actual para obtener al menos el usuario actual
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    
    if (!currentUser) {
      return { users: [], error: 'No hay sesión de usuario activa' };
    }
    
    // Obtener todos los usuarios con rol asignado
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('id');
    
    // Este array contendrá los IDs de los usuarios que ya tienen un rol
    const usersWithRoles = userRoles?.map(ur => ur.id) || [];
    
    // Consultar el servicio de autenticación para encontrar usuarios sin rol
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      // Si no podemos usar listUsers, al menos incluimos al usuario actual
      return { 
        users: [{ id: currentUser.id, email: currentUser.email || '' }],
        error: 'No se pudieron obtener todos los usuarios: ' + error.message 
      };
    }
    
    // Filtrar usuarios que no tienen un rol asignado
    const newUsers = data.users
      .filter(user => !usersWithRoles.includes(user.id))
      .map(user => ({
        id: user.id,
        email: user.email || ''
      }));
    
    return { users: newUsers };
  } catch (error) {
    console.error('Error al obtener nuevos usuarios:', error);
    return { 
      users: [],
      error: error instanceof Error ? error.message : 'Error desconocido al obtener nuevos usuarios' 
    };
  }
} 