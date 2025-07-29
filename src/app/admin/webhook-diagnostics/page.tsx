'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

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

export default function WebhookDiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<WebhookDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/boutique/webhook-status');
      if (response.ok) {
        const data = await response.json();
        setDiagnostics(data);
      } else {
        setError('Error al obtener diagnósticos');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-custom w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-primary text-xl">Diagnosticando webhook...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <p className="text-text-medium mb-6">{error}</p>
          <button
            onClick={fetchDiagnostics}
            className="bg-primary text-secondary px-6 py-3 rounded hover:bg-yellow-400 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Aucune donnée</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary mb-4">
              Diagnostic du Webhook Stripe
            </h1>
            <p className="text-text-medium text-lg">
              Vérification de la configuration du système de paiement
            </p>
            <button
              onClick={fetchDiagnostics}
              className="mt-4 bg-primary text-secondary px-6 py-3 rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Actualiser
            </button>
          </div>

          {/* Configuration Status */}
          <div className="bg-secondary rounded-lg p-6">
            <h2 className="text-2xl font-bold text-light mb-4">État de la Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-dark rounded-lg">
                {diagnostics.stripe_configured ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="text-light font-medium">Stripe Configuré</h3>
                  <p className="text-text-medium text-sm">
                    {diagnostics.stripe_configured ? 'Connecté' : 'Non connecté'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-dark rounded-lg">
                {diagnostics.webhook_secret_configured ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="text-light font-medium">Secret Webhook</h3>
                  <p className="text-text-medium text-sm">
                    {diagnostics.webhook_secret_configured ? 'Configuré' : 'Non configuré'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Webhooks List */}
          <div className="bg-secondary rounded-lg p-6">
            <h2 className="text-2xl font-bold text-light mb-4">Webhooks Configurés</h2>
            {diagnostics.webhooks_list.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                <p className="text-text-medium">Aucun webhook configuré</p>
              </div>
            ) : (
              <div className="space-y-4">
                {diagnostics.webhooks_list.map((webhook, index) => (
                  <div key={index} className="bg-dark rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-light font-medium">Webhook #{index + 1}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${
                        webhook.status === 'enabled' 
                          ? 'bg-green-900 text-green-400' 
                          : 'bg-red-900 text-red-400'
                      }`}>
                        {webhook.status}
                      </span>
                    </div>
                    <p className="text-text-medium text-sm mb-2">{webhook.url}</p>
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((event: string, eventIndex: number) => (
                        <span key={eventIndex} className="bg-primary bg-opacity-20 text-primary px-2 py-1 rounded text-xs">
                          {event}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="bg-secondary rounded-lg p-6">
            <h2 className="text-2xl font-bold text-light mb-4">Événements Récents</h2>
            {diagnostics.recent_events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-medium">Aucun événement récent</p>
              </div>
            ) : (
              <div className="space-y-3">
                {diagnostics.recent_events.map((event, index) => (
                  <div key={index} className="bg-dark rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-light font-medium">{event.type}</h3>
                        <p className="text-text-medium text-sm">{event.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-text-medium text-sm">
                          {new Date(event.created).toLocaleString('fr-FR')}
                        </p>
                        <span className={`px-2 py-1 rounded text-xs ${
                          event.livemode 
                            ? 'bg-green-900 text-green-400' 
                            : 'bg-yellow-900 text-yellow-400'
                        }`}>
                          {event.livemode ? 'Production' : 'Test'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Errors */}
          {diagnostics.errors.length > 0 && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-red-400 mb-4">Erreurs Détectées</h2>
              <div className="space-y-2">
                {diagnostics.errors.map((error, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-red-300">{error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-900 bg-opacity-20 border border-blue-500 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Instructions de Configuration</h2>
            <div className="space-y-4 text-blue-300">
              <div>
                <h3 className="font-medium mb-2">1. Configurer le Webhook dans Stripe</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Aller dans le Dashboard Stripe → Developers → Webhooks</li>
                  <li>Cliquer sur &quot;Add endpoint&quot;</li>
                  <li>URL: https://votredomaine.com/api/boutique/stripe/webhook</li>
                  <li>Événements: checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">2. Configurer les Variables d&apos;Environnement</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>STRIPE_SECRET_KEY=sk_live_...</li>
                  <li>STRIPE_WEBHOOK_SECRET=whsec_...</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium mb-2">3. Tester le Système</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Faire un achat de test avec la carte 4242 4242 4242 4242</li>
                  <li>Vérifier que le webhook se déclenche</li>
                  <li>Vérifier que la commande apparaît dans le panel administratif</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 