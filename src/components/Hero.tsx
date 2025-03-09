'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Hero() {
  const [heroImage, setHeroImage] = useState({
    desktop: '/hero-background-desktop.jpg', // Imagen por defecto
    mobile: '/hero-background-mobile.jpg'    // Imagen por defecto
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Intentar cargar las imágenes desde Supabase
    const fetchHeroImages = async () => {
      try {
        // Puedes ajustar esta lógica según cómo almacenes las imágenes en Supabase
        const { data: desktopData, error: desktopError } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'hero_image_desktop')
          .single();

        const { data: mobileData, error: mobileError } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'hero_image_mobile')
          .single();

        if (!desktopError && desktopData) {
          setHeroImage(prev => ({ ...prev, desktop: desktopData.valor }));
        }

        if (!mobileError && mobileData) {
          setHeroImage(prev => ({ ...prev, mobile: mobileData.valor }));
        }
      } catch (error) {
        console.error('Error al cargar imágenes de hero:', error);
      }
    };

    fetchHeroImages();
  }, []);

  // Variantes para las animaciones
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.7,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const imageLoaded = () => {
    setIsLoaded(true);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ zIndex: 0 }}>
      {/* Imagen de fondo para escritorio (visible en md y superior) */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={heroImage.desktop}
            alt="Coiffure Ciwan - Salon de coiffure moderne pour hommes"
            layout="fill"
            objectFit="cover"
            priority
            className="brightness-[0.9]"
            onLoadingComplete={imageLoaded}
          />
        </motion.div>
      </div>
      
      {/* Imagen de fondo para móvil (visible en sm e inferior) */}
      <div className="absolute inset-0 z-0 block md:hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        >
          <Image
            src={heroImage.mobile}
            alt="Coiffure Ciwan - Salon de coiffure moderne pour hommes"
            layout="fill"
            objectFit="cover"
            priority
            className="brightness-[0.9]"
            onLoadingComplete={imageLoaded}
          />
        </motion.div>
      </div>
      
      {/* Capa de gradiente sobre la imagen para mejor contraste */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-0"></div>
      
      {/* Contenido */}
      <div className="relative z-1 h-full container mx-auto px-6">
        <AnimatePresence>
          {isLoaded && (
            <div className="flex h-full md:items-center items-end md:justify-start justify-center pb-2 md:pb-0">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="md:text-left text-center md:max-w-lg w-full pt-16 md:pt-0"
              >
                {/* Logo encima del texto */}
                <motion.div 
                  variants={itemVariants}
                  className="flex justify-center md:justify-start mb-6"
                >
                  <Image
                    src="/logo.png"
                    alt="Logo Coiffure Ciwan"
                    width={150}
                    height={150}
                    className="object-contain"
                  />
                </motion.div>
                
                <motion.h1 
                  variants={itemVariants}
                  className="text-4xl md:text-6xl font-bold mb-4 text-coral font-decorative"
                >
                  Coiffure Ciwan
                </motion.h1>
                
                <motion.p 
                  variants={itemVariants}
                  className="text-xl md:text-2xl mb-8 text-light"
                >
                  Venez prendre du temps pour vous dans une ambiance sympa, et vous faire plaisir
                </motion.p>
                
                <motion.div variants={itemVariants}>
                  <Link href="/reservation">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="font-medium py-2 px-6 rounded-full transition-all duration-300 inline-block mb-6 md:mb-0 text-base cursor-pointer bg-primary text-secondary shadow-lg"
                    >
                      Réservez votre rendez-vous
                    </motion.div>
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 