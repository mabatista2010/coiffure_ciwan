'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { getUserRole, UserRole } from '@/lib/userRoles';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        // Obtener el rol del usuario
        const role = await getUserRole();
        setUserRole(role);
        
        // Verificar permisos de acceso basados en el rol y la ruta
        if (role === 'employee') {
          // Los empleados solo pueden acceder a reservas
          const allowedPaths = ['/admin/reservations', '/admin'];
          const isAllowed = allowedPaths.some(path => pathname?.startsWith(path));
          
          if (!isAllowed) {
            // Redirigir a la página de reservas si intentan acceder a otra ruta
            router.push('/admin/reservations');
          }
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    };
    
    checkSession();
  }, [pathname, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setIsAuthenticated(true);
      
      // Obtener el rol después de iniciar sesión
      const role = await getUserRole();
      setUserRole(role);
      
      // Redirigir según el rol
      if (role === 'employee') {
        router.push('/admin/reservations');
      }
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="w-full max-w-md p-8 space-y-8 bg-secondary rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">Cargando...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark">
        <div className="w-full max-w-md p-8 space-y-8 bg-secondary rounded-lg shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">Panel de administración</h1>
            <p className="mt-2 text-light">Por favor, inicia sesión para acceder al panel de administración</p>
          </div>
          
          {errorMessage && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {errorMessage}
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-light">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-dark text-light"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-light">Contraseña</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-dark text-light"
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-dark bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Iniciar sesión
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Verificación adicional para rutas prohibidas para empleados
  if (userRole === 'employee') {
    const allowedPaths = ['/admin/reservations', '/admin'];
    const isAllowed = allowedPaths.some(path => pathname?.startsWith(path));
    
    if (!isAllowed) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-dark">
          <div className="w-full max-w-md p-8 space-y-8 bg-secondary rounded-lg shadow-md">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-primary">Acceso denegado</h1>
              <p className="mt-2 text-light">No tienes permisos para acceder a esta sección</p>
              <button
                onClick={() => router.push('/admin/reservations')}
                className="mt-4 px-4 py-2 bg-primary text-dark rounded-md hover:bg-opacity-90"
              >
                Ir a reservas
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
} 