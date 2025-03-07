'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function Hero() {
  const [heroImage, setHeroImage] = useState({
    desktop: '/hero-background-desktop.jpg', // Imagen por defecto
    mobile: '/hero-background-mobile.jpg'    // Imagen por defecto
  });

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

  return (
    <div className="relative h-screen w-full overflow-hidden" style={{ zIndex: 0 }}>
      {/* Imagen de fondo para escritorio (visible en md y superior) */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <Image
          src={heroImage.desktop}
          alt="Coiffure Ciwan - Salon de coiffure moderne pour hommes"
          layout="fill"
          objectFit="cover"
          priority
          className="brightness-[0.9]"
        />
      </div>
      
      {/* Imagen de fondo para móvil (visible en sm e inferior) */}
      <div className="absolute inset-0 z-0 block md:hidden">
        <Image
          src={heroImage.mobile}
          alt="Coiffure Ciwan - Salon de coiffure moderne pour hommes"
          layout="fill"
          objectFit="cover"
          priority
          className="brightness-[0.9]"
        />
      </div>
      
      {/* Contenido */}
      <div className="relative z-1 h-full container mx-auto px-6">
        <div className="flex h-full md:items-center items-end md:justify-start justify-center pb-2 md:pb-0">
          <motion.div
            initial={{ x: -30 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.8 }}
            className="md:text-left text-center md:max-w-lg w-full pt-16 md:pt-0"
          >
            {/* Logo encima del texto */}
            <div className="flex justify-center md:justify-start mb-6">
              <Image
                src="/logo.png"
                alt="Logo Coiffure Ciwan"
                width={150}
                height={150}
                className="object-contain"
              />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-4 font-dancing-script" style={{ color: '#E76F51' }}>
              Coiffure Ciwan
            </h1>
            <p className="text-xl md:text-2xl mb-8" style={{ color: '#E0E0E0' }}>
              Venez prendre du temps pour vous dans une ambiance sympa, et vous faire plaisir
            </p>
            
            <motion.a
              href="#contacto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ 
                backgroundColor: '#DAA520', 
                color: '#212121',
                boxShadow: '0 2px 8px rgba(218, 165, 32, 0.2)',
                fontFamily: "'Montserrat', sans-serif"
              }}
              className="font-medium py-2 px-6 rounded-full transition-all duration-300 inline-block mb-6 md:mb-0 text-base"
            >
              Réservez votre rendez-vous
            </motion.a>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 