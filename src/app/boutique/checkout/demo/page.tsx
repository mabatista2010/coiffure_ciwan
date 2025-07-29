'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCarrito } from '../../../../components/boutique/CarritoContext';
import { Info, ExternalLink, ArrowLeft, ShoppingBag } from 'lucide-react';
import Image from 'next/image';

export default function DemoPage() {
  const router = useRouter();
  const { state } = useCarrito();

  const handleVisitKipitPro = () => {
    window.open('https://kipitpro.com', '_blank');
  };

  const handleReturnToBoutique = () => {
    router.push('/boutique');
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Icono de Información */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Info className="w-12 h-12 text-secondary" />
            </div>
          </motion.div>

          {/* Título Principal */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl md:text-5xl font-bold text-primary mb-6 font-decorative"
          >
            Site de Démonstration
          </motion.h1>

          {/* Mensaje Principal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-secondary rounded-2xl shadow-2xl p-8 mb-8"
          >
            <p className="text-white text-lg md:text-xl mb-6 leading-relaxed">
              Ce site est une <span className="text-primary font-bold">démonstration</span> d&apos;une boutique en ligne complète avec système de réservation.
            </p>
            
            <p className="text-white text-base md:text-lg mb-6 leading-relaxed">
              Les fonctionnalités que vous voyez (boutique, panier, checkout, réservations, panel d&apos;administration) sont entièrement fonctionnelles mais ne traitent pas de vrais paiements.
            </p>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-6 mb-6">
              <h3 className="text-primary font-bold text-lg mb-3">Fonctionnalités Démonstrées :</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Boutique en ligne avec catalogue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Panier d&apos;achat persistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Système de réservation multicentrique</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Panel d&apos;administration complet</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Gestion des produits et commandes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Système CRM intégré</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Gestion des employés et rôles</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Gestion des centres et horaires</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Calendrier de réservations interactif</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Statistiques et analyses détaillées</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Gestion des services par styliste</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Système de paiement sécurisé Stripe</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Interface responsive mobile/desktop</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Gestion des images et galerie</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Authentification et sécurité</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                  <span className="text-white font-medium">Webhooks et notifications temps réel</span>
                </div>
              </div>
            </div>

            <p className="text-coral font-bold text-lg">
              Voulez-vous un site comme celui-ci pour votre entreprise ?
            </p>
          </motion.div>

          {/* Resumen del Carrito */}
          {state.items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-secondary rounded-2xl shadow-2xl p-6 mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <ShoppingBag className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-bold text-white">Votre Panier de Démonstration</h3>
              </div>
              <div className="space-y-3">
                {state.items.map((item) => (
                  <div key={item.producto.id} className="flex items-center gap-4 p-3 bg-dark rounded-xl">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <Image
                        src={item.producto.imagen_url}
                        alt={item.producto.nombre}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-semibold">{item.producto.nombre}</h4>
                      <p className="text-white text-sm">Quantité: {item.cantidad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold">
                        {(item.producto.precio * item.cantidad).toFixed(2)}€
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Botones de Acción */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <motion.button
              onClick={handleVisitKipitPro}
              className="bg-primary text-secondary px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ExternalLink className="w-5 h-5" />
              Visiter KipitPro.com
            </motion.button>

            <motion.button
              onClick={handleReturnToBoutique}
              className="bg-secondary text-light border-2 border-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-primary hover:text-secondary transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5" />
              Retourner à la Boutique
            </motion.button>
          </motion.div>

          {/* Información Adicional */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-white text-sm"
          >
            <p>
              Développé avec Next.js, Supabase, Stripe et TailwindCSS
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 