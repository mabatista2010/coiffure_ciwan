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
        delayChildren: 0.3
      }
    }
  };

  // Variante para el título principal (aparece primero)
  const titleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        type: "spring", 
        damping: 5, 
        stiffness: 70,
        duration: 1.2,
        delay: 0.2
      }
    }
  };

  // Variante para texto que viene desde la derecha (aparece segundo)
  const fromRightVariants = {
    hidden: { opacity: 0, x: 120 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.8, 
        ease: "easeOut",
        delay: 0.6  // Aparece después del título
      }
    }
  };

  // Variante para el botón que aparece al final
  const buttonVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.7, 
        ease: "easeOut", 
        delay: 1.4  // Aparece después de todos los textos
      }
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
            alt="Steel & Blade - Salon de coiffure moderne pour hommes"
            layout="fill"
            objectFit="cover"
            priority
            className="brightness-[0.85]"
            onLoadingComplete={imageLoaded}
          />
          {/* Capa de gradiente para desktop */}
          <div className="absolute inset-0 bg-gradient-to-l from-black/70 to-black/30"></div>
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
            alt="Steel & Blade - Salon de coiffure moderne pour hommes"
            layout="fill"
            objectFit="cover"
            priority
            className="brightness-[0.85]"
            onLoadingComplete={imageLoaded}
          />
          {/* Capa de gradiente para mobile */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/30"></div>
        </motion.div>
      </div>
      
      {/* Contenido */}
      <div className="relative z-1 h-full flex items-start md:items-center justify-end md:pr-16 px-8 pt-36 md:pt-0">
        <AnimatePresence>
          {isLoaded && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="md:max-w-[600px] w-full text-white text-right flex flex-col items-end md:mb-0 md:ml-auto md:mr-12 space-y-6 md:space-y-4"
            >
              <motion.p 
                variants={fromRightVariants}
                className="uppercase text-primary text-xl md:text-lg font-bold mb-4 md:mb-2"
              >
                La coupe idéale à votre imgage
              </motion.p>
              
              <motion.h1 
                variants={titleVariants}
                className="text-4xl md:text-5xl font-bold mb-8 md:mb-4 uppercase"
                style={{ color: 'var(--color-text-medium)' }}
              >
                Votre style, notre passion
              </motion.h1>
              
              <motion.p 
                variants={fromRightVariants}
                className="text-base md:text-base leading-relaxed mb-14 md:mb-8"
                style={{ color: 'var(--color-text-medium)' }}
              >
                Nos barbiers offrent les meilleures coupes de cheveux et rasages traditionnels, adaptés à votre style et à vos préférences. Grâce à une combinaison de techniques de barbier classiques et modernes, nous garantissons un look impeccable et une sensation de confiance.
              </motion.p>
              
              <motion.div 
                variants={buttonVariants} 
                className="flex justify-end w-full pt-4"
              >
                <Link href="/reservation">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-primary text-black text-base md:text-base font-bold py-4 px-8 inline-block rounded uppercase md:w-auto"
                  >
                    Réservez maintenant
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 