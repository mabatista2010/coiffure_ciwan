'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Estilos del fondo para el efecto paralaje
  const backgroundStyle = {
    backgroundImage: `url("${backgroundImage}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed'
  };
  
  // Estilos del fondo para móvil
  const backgroundStyleMobile = {
    backgroundImage: `url("${backgroundImageMobile}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
  
  // Estilos para mejorar la legibilidad del texto sin oscurecer el fondo
  const textShadowStyle = {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)'
  };
  
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const servicesGridRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  
  const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: custom * 0.2,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };
  
  const descriptionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.4,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };
  
  const serviceCardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + custom * 0.1,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };

  useEffect(() => {
    console.log('Valor actual de backgroundImage:', backgroundImage);
    console.log('Valor actual de backgroundImageMobile:', backgroundImageMobile);
  }, [backgroundImage, backgroundImageMobile]);

  // Detectar si es mobile para usar la imagen correcta
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar al inicio
    checkIfMobile();
    
    // Añadir event listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data: servicesData, error: servicesError } = await supabase
          .from('servicios')
          .select('*')
          .order('id');

        if (servicesError) {
          throw servicesError;
        }

        setServices(servicesData || []);
        
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
          setBackgroundImageMobile(getImageUrl(configData?.valor || ''));
        }
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error fetching services:', err);
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

  if (loading) {
    return (
      <section 
        id="servicios" 
        className="relative py-32 overflow-hidden"
        style={isMobile ? backgroundStyleMobile : backgroundStyle}
      >
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex justify-center">
          <div className="w-12 h-12 animate-spin-custom"></div>
        </div>
      </div>
    </section>
  );
}

if (error) {
  return (
    <section 
      id="servicios" 
      className="relative py-32 overflow-hidden"
      style={isMobile ? backgroundStyleMobile : backgroundStyle}
    >
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center">
          <p className="text-red-500 font-bold" style={textShadowStyle}>{error}</p>
        </div>
      </div>
    </section>
  );
}

return (
  <section 
    id="servicios" 
    ref={sectionRef} 
    className="relative py-32 overflow-hidden"
    style={isMobile ? backgroundStyleMobile : backgroundStyle}
  >
    <div className="absolute top-0 left-0 w-full h-full bg-black opacity-40"></div>
    
    <div className="w-full max-w-[1920px] mx-auto px-6 md:px-12 lg:px-16 relative z-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 mb-20">
        <div ref={titleRef} className="text-left flex flex-col justify-center relative z-30">
          <motion.h3 
            className="text-xl md:text-2xl font-medium mb-4 text-primary font-sans"
            initial="hidden"
            animate="visible"
            variants={titleVariants}
            custom={0}
            style={{textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)'}}
          >
            Ce que nous offrons
          </motion.h3>
          <motion.h2 
            className="text-4xl md:text-6xl font-bold mb-6 text-light"
            initial="hidden"
            animate="visible"
            variants={titleVariants}
            custom={1}
            style={{textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)'}}
          >
            Services de Barbier
          </motion.h2>
        </div>
        
        <div ref={descriptionRef} className="flex items-center relative z-30">
          <motion.p 
            className="text-lg text-light"
            initial="hidden"
            animate="visible"
            variants={descriptionVariants}
            style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)'}}
          >
            Nous offrons une gamme complète de services de barbier pour hommes, des coupes de cheveux modernes et classiques aux rasages traditionnels et soins de la barbe, pour mettre en valeur votre style et votre confiance.
          </motion.p>
        </div>
      </div>

      <motion.div 
        ref={servicesGridRef} 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            className="service-card bg-transparent shadow-xl rounded-sm transform hover:-rotate-1 transition-all duration-300"
            initial="hidden"
            animate="visible"
            variants={serviceCardVariants}
            custom={index}
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
            <div className="service-card-content pt-4 pb-2 text-center rounded-b-sm">
              <h3 className="service-card-title text-2xl font-bold mb-2 text-light" style={{textShadow: '0 2px 8px rgba(0, 0, 0, 0.9)'}}>
                {service.nombre}
              </h3>
              <p className="service-card-description text-light" style={{textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)'}}>
                {service.descripcion}
              </p>
              <div className="mt-4 text-2xl font-bold text-primary" style={{textShadow: '0 2px 4px rgba(0, 0, 0, 0.9)'}}>
                {service.precio} CHF
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
      
      <div ref={ctaRef} className="mt-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <Link href="/reservation">
            <button
              className="booking-button hover:scale-105 active:scale-95 transition-transform"
            >
              Prendre Rendez-vous
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  </section>
); 
} 