'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';
import { getUserRole, UserRole } from '@/lib/userRoles';
import AdminNav from '@/components/AdminNav';
import { AdminCard, AdminCardContent, AdminCardHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ADMIN_THEME_CLASSES = ['admin-theme', 'admin-theme-blue'];

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
    const html = document.documentElement;
    const body = document.body;

    ADMIN_THEME_CLASSES.forEach((className) => {
      html.classList.add(className);
      body.classList.add(className);
    });

    return () => {
      ADMIN_THEME_CLASSES.forEach((className) => {
        html.classList.remove(className);
        body.classList.remove(className);
      });
    };
  }, []);
  
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
      <div className="admin-scope admin-theme admin-theme-blue">
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <AdminCard>
              <AdminCardContent className="py-12 text-center">
                <h1 className="text-2xl font-bold text-primary">Chargement...</h1>
              </AdminCardContent>
            </AdminCard>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return (
      <div className="admin-scope admin-theme admin-theme-blue">
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <AdminCard>
              <AdminCardHeader>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-primary">Panel de administración</h1>
                  <p className="mt-2 text-muted-foreground">
                    Inicia sesión para acceder al panel.
                  </p>
                </div>
              </AdminCardHeader>
              <AdminCardContent className="space-y-6">
                {errorMessage && (
                  <div className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                    {errorMessage}
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm text-muted-foreground">Email</label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="password" className="text-sm text-muted-foreground">Contraseña</label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Iniciar sesión
                  </Button>
                </form>
              </AdminCardContent>
            </AdminCard>
          </div>
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
        <div className="admin-scope admin-theme admin-theme-blue">
          <div className="min-h-screen bg-background px-4 py-8">
            <div className="mx-auto w-full max-w-md">
              <AdminCard>
                <AdminCardContent className="py-10 text-center">
                  <h1 className="text-2xl font-bold text-primary">Acceso denegado</h1>
                  <p className="mt-2 text-muted-foreground">
                    No tienes permisos para acceder a esta sección.
                  </p>
                  <Button
                    onClick={() => router.push('/admin/reservations')}
                    className="mt-4"
                  >
                    Ir a reservas
                  </Button>
                </AdminCardContent>
              </AdminCard>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="admin-scope admin-theme admin-theme-blue">
      <AdminNav />
      <main className="min-h-screen bg-background text-foreground md:pl-20">
        {children}
      </main>
    </div>
  );
}
