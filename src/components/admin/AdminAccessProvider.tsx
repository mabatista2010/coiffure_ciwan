"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/lib/supabase";
import { fetchCurrentStaffAccessContext } from "@/lib/permissions/client";
import type { StaffAccessContext } from "@/lib/permissions/types";

type AdminAccessContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  accessContext: StaffAccessContext | null;
  error: string | null;
  refresh: () => Promise<void>;
};

const AdminAccessContext = createContext<AdminAccessContextValue | null>(null);

async function resolveAccessState(): Promise<{
  isAuthenticated: boolean;
  accessContext: StaffAccessContext | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.user) {
    return {
      isAuthenticated: false,
      accessContext: null,
      error: null,
    };
  }

  try {
    const accessContext = await fetchCurrentStaffAccessContext();
    return {
      isAuthenticated: true,
      accessContext,
      error: null,
    };
  } catch (accessError) {
    return {
      isAuthenticated: true,
      accessContext: null,
      error:
        accessError instanceof Error
          ? accessError.message
          : "Impossible de charger le contexte d'accès admin",
    };
  }
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessContext, setAccessContext] = useState<StaffAccessContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const next = await resolveAccessState();
    setIsAuthenticated(next.isAuthenticated);
    setAccessContext(next.accessContext);
    setError(next.error);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

  const value = useMemo<AdminAccessContextValue>(
    () => ({
      isLoading,
      isAuthenticated,
      accessContext,
      error,
      refresh,
    }),
    [accessContext, error, isAuthenticated, isLoading, refresh]
  );

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>;
}

export function useAdminAccess() {
  const context = useContext(AdminAccessContext);

  if (!context) {
    throw new Error("useAdminAccess doit être utilisé dans AdminAccessProvider");
  }

  return context;
}
