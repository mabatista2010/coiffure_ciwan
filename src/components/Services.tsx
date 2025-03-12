'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { supabase, Service } from '@/lib/supabase';
import { getImageUrl } from '@/lib/getImageUrl';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('/placeholder-background.jpg');
  const [backgroundImageMobile, setBackgroundImageMobile] = useState<string>('/placeholder-background.jpg');
  
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);

  // Efecto para depuración
  useEffect(() => {
    console.log('Valor actual de backgroundImage:', backgroundImage);
    console.log('Valor actual de backgroundImageMobile:', backgroundImageMobile);
  }, [backgroundImage, backgroundImageMobile]);

  useEffect(() => {
    async function fetchServices() {
      try {
        // Obtener servicios
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .order('id');

        if (servicesError) {
          throw servicesError;
        }

        setServices(servicesData || []);
        
        // Obtener imagen de fondo desde Supabase (escritorio)
        const { data: configData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'services_background')
          .single();
          
        if (configData && configData.valor) {
          console.log('Valor original de services_background:', configData.valor);
          const imageUrl = getImageUrl(configData.valor);
          console.log('URL procesada de services_background:', imageUrl);
          setBackgroundImage(imageUrl);
        }
        
        // Obtener imagen de fondo móvil desde Supabase
        const { data: configDataMobile } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'services_background_mobile')
          .single();
          
        if (configDataMobile && configDataMobile.valor) {
          console.log('Valor original de services_background_mobile:', configDataMobile.valor);
          const imageUrlMobile = getImageUrl(configDataMobile.valor);
          console.log('URL procesada de services_background_mobile:', imageUrlMobile);
          setBackgroundImageMobile(imageUrlMobile);
        } else {
          // Si no hay imagen móvil específica, usar la misma que desktop
          setBackgroundImageMobile(getImageUrl(configData?.valor || ''));
        }
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error fetching services:', err);
        // Datos fallback en caso de error con Supabase
        setServices([
          {
            id: 1,
            nombre: 'Coupe de Cheveux',
            descripcion: 'Nous offrons des solutions professionnelles et personnalisées pour créer votre look parfait.',
            precio: 25,
            imagen_url: '/services/corte-clasico.jpg',
          },
          {
            id: 2,
            nombre: 'Rasage',
            descripcion: 'Nous offrons une expérience de rasage traditionnelle unique, transformant une procédure ordinaire en un rituel relaxant.',
            precio: 20,
            imagen_url: '/services/fade.jpg',
          },
          {
            id: 3,
            nombre: 'Barbe',
            descripcion: 'Nous offrons des soins professionnels pour la barbe, y compris la taille, le style et l&apos;utilisation de produits de toilettage de haute qualité.',
            precio: 15,
            imagen_url: '/services/barba.jpg',
          },
          {
            id: 4,
            nombre: 'Coupe Enfants',
            descripcion: 'Coupes spéciales pour les plus petits avec une attention particulière et une ambiance détendue.',
            precio: 13,
            imagen_url: '/services/corte-ninos.jpg',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  return (
    <section id="servicios" ref={sectionRef} className="parallax-container relative py-32 overflow-hidden">
      {/* Fondo con efecto parallax */}
      <motion.div 
        className="parallax-bg absolute inset-0 w-full h-full z-0"
        style={{ y }}
      >
        {/* Contenedor con posición ajustada para la imagen - Versión Desktop */}
        <div className="absolute inset-0 -top-[20%] h-[120%] w-full hidden md:block">
          <Image
            src={backgroundImage}
            alt="Fond de services"
            fill
            className="object-cover object-center"
            priority
            onError={() => {
              console.log('Error al cargar la imagen de fondo desktop, usando imagen de respaldo');
              setBackgroundImage('/placeholder-background.jpg');
            }}
          />
        </div>
        
        {/* Contenedor con posición ajustada para la imagen - Versión Mobile */}
        <div className="absolute inset-0 -top-[20%] h-[120%] w-full md:hidden">
          <Image
            src={backgroundImageMobile}
            alt="Fond de services (mobile)"
            fill
            className="object-cover object-center"
            priority
            onError={() => {
              console.log('Error al cargar la imagen de fondo mobile, usando imagen de respaldo');
              setBackgroundImageMobile('/placeholder-background.jpg');
            }}
          />
        </div>
      </motion.div>
      
      <div className="parallax-content w-full max-w-[1920px] mx-auto px-6 md:px-12 lg:px-16 relative z-10">
        {/* Encabezado en dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 mb-20">
          {/* Columna izquierda con títulos */}
          <div className="text-left flex flex-col justify-center">
            <h3 className="text-xl md:text-2xl font-medium mb-4 text-primary font-sans">
              Ce que nous offrons
            </h3>
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              Services de Barbier
            </h2>
          </div>
          
          {/* Columna derecha con descripción */}
          <div className="flex items-center">
            <p className="text-lg text-white">
              Nous offrons une gamme complète de services de barbier pour hommes, des coupes de cheveux modernes et classiques aux rasages traditionnels et soins de la barbe, pour mettre en valeur votre style et votre confiance.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center">
            <div className="w-12 h-12 animate-spin-custom"></div>
          </div>
        ) : error ? (
          <p className="text-center text-red-500">
            {error}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {services.map((service) => {
              return (
                <div
                  key={service.id}
                  className="service-card bg-transparent shadow-xl rounded-sm transform hover:-rotate-1 transition-all duration-300"
                >
                  <div className="service-card-image p-0">
                    <div className="relative w-full pt-[70%]">
                      <Image
                        src={getImageUrl(service.imagen_url)}
                        alt={service.nombre}
                        fill
                        className="object-cover rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      />
                    </div>
                  </div>
                  <div className="service-card-content pt-4 pb-2 text-center">
                    <h3 className="service-card-title text-2xl font-bold mb-2 text-white">
                      {service.nombre}
                    </h3>
                    <p className="service-card-description text-light">
                      {service.descripcion}
                    </p>
                    <div className="mt-4 text-2xl font-bold text-primary">
                      {service.precio}€
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-16 text-center">
          <Link href="/reservation">
            <button
              className="booking-button hover:scale-105 active:scale-95 transition-transform"
            >
              Prendre Rendez-vous
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
} 