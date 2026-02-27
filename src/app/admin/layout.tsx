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
const EMPLOYEE_ALLOWED_PREFIXES = ['/admin/home', '/admin/reservations', '/admin/crm'];

function isEmployeePathAllowed(pathname: string | null): boolean {
  if (!pathname) return false;
  return EMPLOYEE_ALLOWED_PREFIXES.some((path) => pathname.startsWith(path));
}

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
          const isAllowed = isEmployeePathAllowed(pathname);

          if (!isAllowed) {
            // Redirigir al dashboard si intentan acceder a una ruta no permitida
            router.push('/admin/home');
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
        router.push('/admin/home');
      } else if (role === 'admin') {
        router.push('/admin/home');
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
                  <h1 className="text-2xl font-bold text-primary">Panneau d&apos;administration</h1>
                  <p className="mt-2 text-muted-foreground">
                    Connectez-vous pour accéder au panneau.
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
                    <label htmlFor="email" className="text-sm text-muted-foreground">E-mail</label>
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
                    <label htmlFor="password" className="text-sm text-muted-foreground">Mot de passe</label>
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
                    Se connecter
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
    const isAllowed = isEmployeePathAllowed(pathname);
    
    if (!isAllowed) {
      return (
        <div className="admin-scope admin-theme admin-theme-blue">
          <div className="min-h-screen bg-background px-4 py-8">
            <div className="mx-auto w-full max-w-md">
              <AdminCard>
                <AdminCardContent className="py-10 text-center">
                  <h1 className="text-2xl font-bold text-primary">Accès refusé</h1>
                  <p className="mt-2 text-muted-foreground">
                    Vous n&apos;avez pas les autorisations pour accéder à cette section.
                  </p>
                  <Button
                    onClick={() => router.push('/admin/home')}
                    className="mt-4"
                  >
                    Aller au tableau de bord
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
