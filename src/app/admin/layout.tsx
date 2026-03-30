"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminAccessProvider, useAdminAccess } from "@/components/admin/AdminAccessProvider";
import { AdminCard, AdminCardContent, AdminCardHeader } from "@/components/admin/ui";
import AdminNav from "@/components/AdminNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canAccessAdminPath, getDefaultAdminPath } from "@/lib/permissions/routing";
import { supabase } from "@/lib/supabase";

const ADMIN_THEME_CLASSES = ["admin-theme", "admin-theme-blue"];

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, accessContext, error, refresh } = useAdminAccess();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section");

  const isPathAllowed = useMemo(
    () => canAccessAdminPath(accessContext, pathname, section),
    [accessContext, pathname, section]
  );

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
    if (isLoading || !isAuthenticated || !accessContext || isPathAllowed) return;

    const nextPath = getDefaultAdminPath(accessContext);
    router.replace(nextPath);
  }, [accessContext, isAuthenticated, isLoading, isPathAllowed, router]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      await refresh();
      const nextPath = getDefaultAdminPath(accessContext);
      router.replace(nextPath);
    } catch (loginError) {
      setErrorMessage(
        loginError instanceof Error ? loginError.message : "Impossible de se connecter"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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

  if (!isAuthenticated) {
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
                {errorMessage ? (
                  <div className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                    {errorMessage}
                  </div>
                ) : null}

                <form className="space-y-4" onSubmit={handleLogin}>
                  <div className="space-y-1">
                    <label htmlFor="email" className="text-sm text-muted-foreground">
                      E-mail
                    </label>
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
                    <label htmlFor="password" className="text-sm text-muted-foreground">
                      Mot de passe
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
              </AdminCardContent>
            </AdminCard>
          </div>
        </div>
      </div>
    );
  }

  if (!accessContext) {
    return (
      <div className="admin-scope admin-theme admin-theme-blue">
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="mx-auto w-full max-w-lg">
            <AdminCard>
              <AdminCardContent className="space-y-4 py-10 text-center">
                <h1 className="text-2xl font-bold text-primary">Accès non configuré</h1>
                <p className="text-muted-foreground">
                  Votre compte est connecté mais son contexte d&apos;accès n&apos;a pas pu être chargé.
                </p>
                {error ? (
                  <p className="text-sm text-destructive-foreground">{error}</p>
                ) : null}
                <Button onClick={() => void refresh()}>Réessayer</Button>
              </AdminCardContent>
            </AdminCard>
          </div>
        </div>
      </div>
    );
  }

  if (!isPathAllowed) {
    return (
      <div className="admin-scope admin-theme admin-theme-blue">
        <div className="min-h-screen bg-background px-4 py-8">
          <div className="mx-auto w-full max-w-md">
            <AdminCard>
              <AdminCardContent className="py-10 text-center">
                <h1 className="text-2xl font-bold text-primary">Accès refusé</h1>
                <p className="mt-2 text-muted-foreground">
                  Vous n&apos;avez pas les autorisations nécessaires pour cette section.
                </p>
                <Button
                  onClick={() => router.replace(getDefaultAdminPath(accessContext))}
                  className="mt-4"
                >
                  Retour à une section autorisée
                </Button>
              </AdminCardContent>
            </AdminCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scope admin-theme admin-theme-blue">
      <AdminNav />
      <main className="min-h-screen bg-background text-foreground md:pl-20">{children}</main>
    </div>
  );
}

function AdminLayoutFallback() {
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAccessProvider>
      <Suspense fallback={<AdminLayoutFallback />}>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </Suspense>
    </AdminAccessProvider>
  );
}
