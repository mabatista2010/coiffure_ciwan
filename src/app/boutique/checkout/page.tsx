'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCarrito } from '../../../components/boutique/CarritoContext';
import { ShoppingBag, CreditCard, Shield, Truck, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

interface CustomerInfo {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

function CheckoutContent() {
  const router = useRouter();
  const { state, getTotalPrice } = useCarrito();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    nombre: '',
    email: '',
    telefono: '',
    direccion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = getTotalPrice();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Redirigir a la página de demo en lugar de procesar el pago
      router.push('/boutique/checkout/demo');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (state.items.length === 0) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="mb-8">
            <ShoppingBag className="w-20 h-20 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-primary mb-4">Panier Vide</h1>
            <p className="text-text-medium text-lg mb-8">Aucun produit dans votre panier</p>
          </div>
          <motion.button
            onClick={() => router.push('/boutique')}
            className="bg-primary text-secondary px-8 py-4 rounded-full font-bold text-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Retourner à la Boutique
            </span>
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4 font-decorative">
            Démonstration - Finaliser l&apos;Achat
          </h1>
          <p className="text-light text-lg max-w-2xl mx-auto">
            Complétez vos informations pour voir la démonstration du processus de paiement
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Formulario */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-secondary rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-primary p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-secondary" />
                <h2 className="text-2xl font-bold text-secondary">Informations Personnelles</h2>
              </div>
            </div>
            
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="nombre" className="block text-light font-semibold mb-3">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={customerInfo.nombre}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-dark border-2 border-gray-600 rounded-xl text-light focus:border-primary focus:outline-none transition-all duration-300"
                    placeholder="Votre nom complet"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-light font-semibold mb-3">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-dark border-2 border-gray-600 rounded-xl text-light focus:border-primary focus:outline-none transition-all duration-300"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="telefono" className="block text-light font-semibold mb-3">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={customerInfo.telefono}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-dark border-2 border-gray-600 rounded-xl text-light focus:border-primary focus:outline-none transition-all duration-300"
                    placeholder="+34 600 000 000"
                  />
                </div>

                <div>
                  <label htmlFor="direccion" className="block text-light font-semibold mb-3">
                    Adresse de Livraison
                  </label>
                  <textarea
                    id="direccion"
                    name="direccion"
                    value={customerInfo.direccion}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-dark border-2 border-gray-600 rounded-xl text-light focus:border-primary focus:outline-none resize-none transition-all duration-300"
                    placeholder="Rue, numéro, ville, code postal..."
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-xl"
                  >
                    <p className="font-semibold">Erreur:</p>
                    <p>{error}</p>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-secondary py-4 rounded-xl font-bold text-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <div className="animate-spin-custom w-5 h-5"></div>
                        Redirection en cours...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        Voir la Démonstration
                      </>
                    )}
                  </span>
                </motion.button>
              </form>
            </div>
          </motion.div>

          {/* Resumen del Pedido */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-6"
          >
            <div className="bg-secondary rounded-2xl shadow-2xl overflow-hidden">
              <div className="bg-coral p-6">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">Résumé de la Commande</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {state.items.map((item, index) => (
                  <motion.div
                    key={item.producto.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex gap-4 p-4 bg-dark rounded-xl hover:bg-gray-800/50 transition-all duration-300"
                  >
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={item.producto.imagen_url}
                        alt={item.producto.nombre}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-light font-bold truncate">{item.producto.nombre}</h3>
                      <p className="text-text-medium text-sm">Quantité: {item.cantidad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">
                        {(item.producto.precio * item.cantidad).toFixed(2)} CHF
                      </p>
                    </div>
                  </motion.div>
                ))}
                
                <hr className="border-gray-600" />
                
                <div className="flex justify-between items-center py-4">
                  <span className="text-light font-bold text-lg">Total:</span>
                  <span className="text-3xl font-bold text-primary">
                    {total.toFixed(2)} CHF
                  </span>
                </div>
              </div>
            </div>

            {/* Información de Seguridad */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-secondary rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-light">Démonstration de Paiement</h3>
                </div>
                <div className="space-y-3 text-text-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Interface de paiement réaliste</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Aucun paiement réel ne sera traité</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Processus de checkout complet</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Información de Envío */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="bg-secondary rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-light">Livraison</h3>
                </div>
                <div className="space-y-3 text-text-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Livraison gratuite pour les commandes supérieures à 50 CHF</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Livraison en 2-3 jours ouvrables</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Suivi de commande par email</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <CheckoutContent />;
} 