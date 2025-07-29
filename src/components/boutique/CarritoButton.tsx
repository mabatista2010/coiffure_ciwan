'use client';

import { ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCarrito } from './CarritoContext';
import { useEffect, useState } from 'react';

export default function CarritoButton() {
  const { toggleCart, getTotalItems } = useCarrito();
  const totalItems = getTotalItems();
  const [isAnimating, setIsAnimating] = useState(false);
  const [previousTotal, setPreviousTotal] = useState(totalItems);

  // Detectar cuando se añade un producto
  useEffect(() => {
    if (totalItems > previousTotal) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    setPreviousTotal(totalItems);
  }, [totalItems, previousTotal]);

  return (
    <motion.button
      onClick={toggleCart}
      className="relative group p-3 text-light hover:text-primary transition-all duration-300 rounded-full hover:bg-white/10 backdrop-blur-sm"
      aria-label="Ouvrir le panier d'achats"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={isAnimating ? {
        scale: [1, 1.2, 1],
        rotate: [0, -10, 10, 0]
      } : {}}
      transition={isAnimating ? {
        duration: 0.6,
        ease: "easeInOut"
      } : {}}
    >
      <ShoppingCart 
        size={24} 
        className={`group-hover:rotate-12 transition-transform duration-300 ${
          isAnimating ? 'text-primary' : ''
        }`} 
      />
      
      {totalItems > 0 && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: isAnimating ? [1, 1.3, 1] : 1, 
            rotate: isAnimating ? [0, 360] : 0 
          }}
          transition={isAnimating ? {
            duration: 0.6,
            ease: "easeInOut"
          } : {}}
          className="absolute -top-2 -right-2 bg-primary text-secondary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
        >
          {totalItems > 99 ? '99+' : totalItems}
        </motion.div>
      )}
    </motion.button>
  );
} 