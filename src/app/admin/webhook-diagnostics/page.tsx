"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";

import {
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  SectionHeader,
} from "@/components/admin/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WebhookDiagnostics {
  stripe_configured: boolean;
  webhook_secret_configured: boolean;
  webhooks_list: WebhookInfo[];
  recent_events: EventInfo[];
  errors: string[];
}

interface WebhookInfo {
  id: string;
  url: string;
  status: string;
  events: string[];
}

interface EventInfo {
  id: string;
  type: string;
  created: string;
  livemode: boolean;
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge variant={active ? "success" : "destructive"}>
      {label}: {active ? "Configuré" : "Non configuré"}
    </Badge>
  );
}

export default function WebhookDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<WebhookDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/boutique/webhook-status");
      if (!response.ok) {
        setError("Erreur lors de la récupération des diagnostics.");
        return;
      }

      const data = await response.json();
      setDiagnostics(data);
    } catch {
      setError("Erreur de connexion lors de la récupération des diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  return (
    <div className="admin-scope min-h-screen bg-dark px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <SectionHeader
          title="Diagnostic du Webhook Stripe"
          description="Vérification de la configuration Stripe et des événements récents du système de paiement."
          actions={
            <Button
              type="button"
              variant="secondary"
              onClick={fetchDiagnostics}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
              Actualiser
            </Button>
          }
        />

        {loading ? (
          <AdminCard>
            <AdminCardContent className="flex min-h-56 items-center justify-center gap-3 text-zinc-300">
              <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              Diagnostic en cours...
            </AdminCardContent>
          </AdminCard>
        ) : null}

        {!loading && error ? (
          <AdminCard className="border-destructive/35 bg-destructive/10">
            <AdminCardContent className="flex items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-3 text-destructive-foreground">
                <XCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
              <Button type="button" onClick={fetchDiagnostics}>
                Réessayer
              </Button>
            </AdminCardContent>
          </AdminCard>
        ) : null}

        {!loading && !error && !diagnostics ? (
          <AdminCard>
            <AdminCardContent className="py-10 text-center text-zinc-400">
              Aucune donnée disponible.
            </AdminCardContent>
          </AdminCard>
        ) : null}

        {!loading && !error && diagnostics ? (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    État de la configuration
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {diagnostics.stripe_configured ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <StatusPill
                      active={diagnostics.stripe_configured}
                      label="Stripe"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    {diagnostics.webhook_secret_configured ? (
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                    <StatusPill
                      active={diagnostics.webhook_secret_configured}
                      label="Secret Webhook"
                    />
                  </div>
                </AdminCardContent>
              </AdminCard>

              <AdminCard>
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-zinc-100">
                    Webhooks configurés
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-3">
                  {diagnostics.webhooks_list.length === 0 ? (
                    <div className="flex items-center gap-2 text-zinc-300">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Aucun webhook configuré.
                    </div>
                  ) : (
                    diagnostics.webhooks_list.map((webhook) => (
                      <div
                        key={webhook.id}
                        className="rounded-xl border border-white/10 bg-black/25 p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              webhook.status === "enabled"
                                ? "success"
                                : "destructive"
                            }
                          >
                            {webhook.status}
                          </Badge>
                          <span className="text-xs text-zinc-400">
                            {webhook.id}
                          </span>
                        </div>
                        <p className="mb-2 break-all text-sm text-zinc-200">
                          {webhook.url}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </AdminCardContent>
              </AdminCard>
            </div>

            <AdminCard>
              <AdminCardHeader>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Événements récents
                </h3>
              </AdminCardHeader>
              <AdminCardContent className="space-y-3">
                {diagnostics.recent_events.length === 0 ? (
                  <p className="text-zinc-400">Aucun événement récent.</p>
                ) : (
                  diagnostics.recent_events.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">{event.type}</p>
                        <p className="text-xs text-zinc-400">{event.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={event.livemode ? "success" : "warning"}>
                          {event.livemode ? "Production" : "Test"}
                        </Badge>
                        <span className="text-xs text-zinc-400">
                          {new Date(event.created).toLocaleString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </AdminCardContent>
            </AdminCard>

            {diagnostics.errors.length > 0 ? (
              <AdminCard className="border-destructive/35 bg-destructive/10">
                <AdminCardHeader>
                  <h3 className="text-lg font-semibold text-destructive-foreground">
                    Erreurs détectées
                  </h3>
                </AdminCardHeader>
                <AdminCardContent className="space-y-2">
                  {diagnostics.errors.map((err) => (
                    <div key={err} className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <p className="text-sm text-red-200">{err}</p>
                    </div>
                  ))}
                </AdminCardContent>
              </AdminCard>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
