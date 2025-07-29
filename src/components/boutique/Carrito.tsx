'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  imagen_url: string;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
}

interface CarritoProps {
  isOpen: boolean;
  onClose: () => void;
  items: ItemCarrito[];
  onUpdateQuantity: (productoId: number, cantidad: number) => void;
  onRemoveItem: (productoId: number) => void;
}

export default function Carrito({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }: CarritoProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const total = items.reduce((sum, item) => sum + (item.producto.precio * item.cantidad), 0);
  const totalItems = items.reduce((sum, item) => sum + item.cantidad, 0);

  const handleCheckout = () => {
    // Redirigir al checkout
    window.location.href = '/boutique/checkout';
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Carrito */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-dark border-l border-gray-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header Mejorado */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-secondary/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart className="text-primary" size={28} />
                  {totalItems > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-coral text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      {totalItems > 9 ? '9+' : totalItems}
                    </motion.div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-light">Panier d&apos;Achats</h2>
                  <p className="text-text-medium text-sm">{totalItems} produits</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="text-text-medium hover:text-light transition-colors p-2 rounded-full hover:bg-white/10"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={24} />
              </motion.button>
            </div>

            {/* Contenido Mejorado */}
            <div className="flex-1 overflow-y-auto p-6">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16"
                >
                  <div className="mb-6">
                    <ShoppingCart className="mx-auto text-text-medium mb-4" size={64} />
                    <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="text-primary" size={32} />
                    </div>
                  </div>
                  <h3 className="text-light text-xl font-bold mb-2">Votre panier est vide</h3>
                  <p className="text-text-medium mb-6">Ajoutez quelques produits pour commencer</p>
                  <motion.button
                    onClick={onClose}
                    className="bg-primary text-secondary px-6 py-3 rounded-full font-semibold hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Explorer les Produits
                  </motion.button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.producto.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                      className="group bg-secondary rounded-2xl p-4 hover:bg-gray-700/50 transition-all duration-300"
                    >
                      <div className="flex gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={item.producto.imagen_url}
                            alt={item.producto.nombre}
                            fill
                            className="object-cover rounded-xl"
                          />
                          <div className="absolute inset-0 bg-black/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-light font-bold truncate mb-1">
                            {item.producto.nombre}
                          </h3>
                          <p className="text-2xl font-bold text-primary mb-3">
                            {item.producto.precio.toFixed(2)}€
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <motion.button
                                onClick={() => onUpdateQuantity(item.producto.id, item.cantidad - 1)}
                                disabled={item.cantidad <= 1}
                                className="w-8 h-8 bg-dark text-light rounded-full flex items-center justify-center hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Minus size={16} />
                              </motion.button>
                              <span className="text-light font-bold min-w-[2rem] text-center text-lg">
                                {item.cantidad}
                              </span>
                              <motion.button
                                onClick={() => onUpdateQuantity(item.producto.id, item.cantidad + 1)}
                                className="w-8 h-8 bg-primary text-secondary rounded-full flex items-center justify-center hover:bg-yellow-400 transition-all duration-200"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Plus size={16} />
                              </motion.button>
                            </div>
                            <motion.button
                              onClick={() => onRemoveItem(item.producto.id)}
                              className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-full hover:bg-red-500/20"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 size={20} />
                            </motion.button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Mejorado */}
            {items.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-t border-gray-700 p-6 bg-secondary/30 backdrop-blur-sm"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-light text-lg">Total ({totalItems} produits):</span>
                    <p className="text-text-medium text-sm">Livraison gratuite incluse</p>
                  </div>
                  <span className="text-3xl font-bold text-primary">
                    {total.toFixed(2)}€
                  </span>
                </div>
                <motion.button
                  onClick={handleCheckout}
                  className="w-full bg-primary text-secondary py-4 rounded-2xl font-bold text-lg hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>Procéder au Paiement</span>
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
                <p className="text-text-medium text-xs text-center mt-3">
                  Paiement sécurisé avec Stripe
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 