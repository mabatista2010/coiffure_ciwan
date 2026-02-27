"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaEnvelope, FaPhone, FaSearch, FaUser } from "react-icons/fa";

import { AdminSidePanel } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type AdminCustomerSearchResult, searchAdminCustomers } from "@/lib/adminCustomerSearch";

interface CustomerSearchPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: AdminCustomerSearchResult) => void;
  initialQuery?: string;
}

function formatLastVisit(lastVisitDate: string | null): string {
  if (!lastVisitDate) return "Aucune visite";

  try {
    return new Date(`${lastVisitDate}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return lastVisitDate;
  }
}

function CustomerSearchPanel({ open, onOpenChange, onSelect, initialQuery = "" }: CustomerSearchPanelProps) {
  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<AdminCustomerSearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    setQuery((current) => (current ? current : initialQuery));
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;

    const safeQuery = query.trim();
    if (safeQuery.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const payload = await searchAdminCustomers(safeQuery, {
          limit: 20,
          signal: controller.signal,
        });

        setResults(payload.customers);
      } catch (searchError) {
        if (controller.signal.aborted) return;
        console.error("customer_search_panel_error", searchError);
        setError(
          searchError instanceof Error
            ? searchError.message
            : "Erreur lors de la recherche des clients"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 260);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, query]);

  const hasQuery = query.trim().length >= 2;
  const panelDescription = useMemo(() => {
    if (!hasQuery) return "Saisissez au moins 2 caractères pour rechercher.";
    if (loading) return "Recherche en cours...";
    return `${results.length} client(s) trouvé(s)`;
  }, [hasQuery, loading, results.length]);

  return (
    <AdminSidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="Annuaire clients"
      description={panelDescription}
      width="lg"
    >
      <div className="space-y-4">
        <div className="relative">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-10"
            placeholder="Nom, email ou téléphone"
            autoFocus
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Recherche des clients en cours...
          </div>
        ) : !hasQuery ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Saisissez un nom, email ou téléphone pour afficher les résultats.
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Aucun client trouvé.
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((customer) => (
              <div
                key={customer.customer_key}
                className="rounded-xl border border-border bg-card p-3 shadow-[var(--admin-shadow-soft)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {customer.customer_name || "Client sans nom"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      <FaEnvelope className="mr-1 inline" />
                      {customer.customer_email || "Email non renseigné"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <FaPhone className="mr-1 inline" />
                      {customer.customer_phone || "Téléphone non renseigné"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <FaUser className="mr-1 inline" />
                      {customer.total_visits} visite(s) · Dernière: {formatLastVisit(customer.last_visit_date)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onSelect(customer);
                      onOpenChange(false);
                    }}
                  >
                    Sélectionner
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminSidePanel>
  );
}

export { CustomerSearchPanel };
