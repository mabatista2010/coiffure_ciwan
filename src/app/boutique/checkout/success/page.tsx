'use client';

import { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Mail } from 'lucide-react';
import Link from 'next/link';

interface Pedido {
  id: number;
  total: number | string;
  estado: string;
  created_at: string;
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const syncToken = searchParams.get('sync_token');

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID manquant');
      setLoading(false);
      return;
    }

    if (!syncToken) {
      setError('Jeton de synchronisation manquant');
      setLoading(false);
      return;
    }

    // Sincronizar pedido desde sesión Stripe (crea en fallback si no existe)
    const syncPedidoFromSession = async () => {
      try {
        console.log('Sincronizando pedido desde fallback para session:', sessionId);
        const response = await fetch('/api/boutique/pedidos/create-from-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId, syncToken }),
        });

        const data = await response.json();

        if (response.ok && data.success && data.pedido) {
          setPedido(data.pedido);
        } else {
          console.error('Error syncing pedido from session:', data.error);
          setError(data.error || 'Erreur lors de la synchronisation de la commande');
        }
      } catch (error) {
        console.error('Error syncing pedido:', error);
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };

    syncPedidoFromSession();
  }, [sessionId, syncToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-custom w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-primary text-xl">Traitement de votre commande...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-secondary rounded-lg p-8">
            <h1 className="text-2xl font-bold text-primary mb-4">Information</h1>
            <p className="text-text-medium mb-6">{error}</p>
            <div className="space-y-3">
              <Link 
                href="/boutique"
                className="block w-full bg-primary text-secondary px-6 py-3 rounded hover:bg-yellow-400 transition-colors text-center"
              >
                Retourner à la Boutique
              </Link>
              <Link 
                href="/"
                className="block w-full bg-secondary text-light px-6 py-3 rounded hover:bg-gray-700 transition-colors text-center"
              >
                Retour à l&apos;Accueil
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Commande introuvable</h1>
          <Link 
            href="/boutique"
            className="bg-primary text-secondary px-6 py-2 rounded hover:bg-yellow-400 transition-colors"
          >
            Retourner à la Boutique
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-secondary rounded-lg shadow-lg overflow-hidden"
        >
          {/* Header de Éxito */}
          <div className="bg-green-600 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block mb-4"
            >
              <CheckCircle size={64} className="text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Commande Confirmée !
            </h1>
            <p className="text-white text-lg">
              Merci pour votre achat. Votre commande a été traitée avec succès.
            </p>
          </div>

          {/* Información del Pedido */}
          <div className="p-8">
            <div className="bg-dark rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-light mb-4">Détails de la Commande</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-text-medium">Numéro de Commande:</span>
                  <span className="text-light font-medium">#{pedido.id}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-text-medium">Statut:</span>
                  <span className="text-green-400 font-medium capitalize">{pedido.estado}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-text-medium">Total:</span>
                  <span className="text-primary font-bold text-xl">{Number(pedido.total).toFixed(2)} CHF</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-text-medium">Date:</span>
                  <span className="text-light">
                    {new Date(pedido.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Próximos Pasos */}
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-blue-900 bg-opacity-20 rounded-lg">
                <Mail className="text-blue-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h3 className="text-light font-medium mb-1">Confirmation par Email</h3>
                  <p className="text-text-medium text-sm">
                    Nous avons envoyé une confirmation détaillée à votre adresse email.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-yellow-900 bg-opacity-20 rounded-lg">
                <Package className="text-yellow-400 mt-1 flex-shrink-0" size={20} />
                <div>
                  <h3 className="text-light font-medium mb-1">Préparation de l&apos;Expédition</h3>
                  <p className="text-text-medium text-sm">
                    Votre commande sera préparée et expédiée dans les prochaines 24-48 heures.
                  </p>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Link
                href="/boutique"
                className="flex-1 bg-primary text-secondary py-3 rounded-lg font-semibold text-center hover:bg-yellow-400 transition-colors"
              >
                Continuer les Achats
              </Link>
              
              <Link
                href="/"
                className="flex-1 bg-secondary text-light py-3 rounded-lg font-semibold text-center hover:bg-gray-700 transition-colors"
              >
                Retour à l&apos;Accueil
              </Link>
            </div>

            {/* Información de Contacto */}
            <div className="mt-8 p-4 bg-gray-800 rounded-lg text-center">
              <p className="text-text-medium text-sm mb-2">
                Avez-vous une question concernant votre commande ?
              </p>
              <p className="text-primary font-medium">
                Contactez-nous : info@steelandblade.com
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function CheckoutSuccessLoading() {
  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin-custom w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <div className="text-primary text-xl">Chargement...</div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<CheckoutSuccessLoading />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
} 
