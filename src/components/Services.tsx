'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { getImageUrl } from '@/lib/getImageUrl';
import { buildServiceCatalog, CatalogService, getPublicFeaturedServices, ServiceGroup, ServiceSubgroup } from '@/lib/serviceCatalog';
import { getSafeServiceDuration } from '@/lib/serviceDuration';

export default function Services() {
  const [groups, setGroups] = useState<ServiceGroup[]>([]);
  const [subgroups, setSubgroups] = useState<ServiceSubgroup[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('/placeholder-background.jpg');
  const [backgroundImageMobile, setBackgroundImageMobile] = useState<string>('/placeholder-background.jpg');
  const [isMobile, setIsMobile] = useState<boolean>(false);

  const backgroundStyle = {
    backgroundImage: `url("${backgroundImage}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed' as const,
  };

  const backgroundStyleMobile = {
    backgroundImage: `url("${backgroundImageMobile}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const textShadowStyle = {
    textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
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
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  const descriptionVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.4,
        duration: 0.8,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  const serviceCardVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.1 + custom * 0.1,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    }),
  };

  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 768);
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    async function fetchServices() {
      try {
        const [groupsRes, subgroupsRes, servicesRes, configDesktopRes, configMobileRes] = await Promise.all([
          supabase.from('service_groups').select('*').order('sort_order').order('id'),
          supabase.from('service_subgroups').select('*').order('sort_order').order('id'),
          supabase.from('servicios').select('*').order('sort_order').order('id'),
          supabase.from('configuracion').select('valor').eq('clave', 'services_background').single(),
          supabase.from('configuracion').select('valor').eq('clave', 'services_background_mobile').single(),
        ]);

        if (groupsRes.error) throw groupsRes.error;
        if (subgroupsRes.error) throw subgroupsRes.error;
        if (servicesRes.error) throw servicesRes.error;

        setGroups((groupsRes.data ?? []) as ServiceGroup[]);
        setSubgroups((subgroupsRes.data ?? []) as ServiceSubgroup[]);
        setServices((servicesRes.data ?? []) as CatalogService[]);

        if (configDesktopRes.data?.valor) {
          setBackgroundImage(getImageUrl(configDesktopRes.data.valor));
        }

        if (configMobileRes.data?.valor) {
          setBackgroundImageMobile(getImageUrl(configMobileRes.data.valor));
        } else if (configDesktopRes.data?.valor) {
          setBackgroundImageMobile(getImageUrl(configDesktopRes.data.valor));
        }
      } catch (err) {
        console.error('Error fetching featured services:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    void fetchServices();
  }, []);

  const featuredServices = useMemo(() => {
    return getPublicFeaturedServices(buildServiceCatalog(groups, subgroups, services)).slice(0, 6);
  }, [groups, subgroups, services]);

  if (loading) {
    return (
      <section id="servicios" className="relative overflow-hidden py-32" style={isMobile ? backgroundStyleMobile : backgroundStyle}>
        <div className="container relative z-10 mx-auto px-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 animate-spin-custom" />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="servicios" className="relative overflow-hidden py-32" style={isMobile ? backgroundStyleMobile : backgroundStyle}>
        <div className="container relative z-10 mx-auto px-4">
          <div className="text-center">
            <p className="font-bold text-red-500" style={textShadowStyle}>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (featuredServices.length === 0) {
    return null;
  }

  return (
    <section id="servicios" ref={sectionRef} className="relative overflow-hidden py-32" style={isMobile ? backgroundStyleMobile : backgroundStyle}>
      <div className="absolute left-0 top-0 h-full w-full bg-black opacity-40" />

      <div className="relative z-20 mx-auto w-full max-w-[1920px] px-6 md:px-12 lg:px-16">
        <div className="mb-20 grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-32">
          <div ref={titleRef} className="relative z-30 flex flex-col justify-center text-left">
            <motion.h3
              className="font-sans text-xl font-medium text-primary md:text-2xl"
              initial="hidden"
              animate="visible"
              variants={titleVariants}
              custom={0}
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)' }}
            >
              Ce que nous mettons en avant
            </motion.h3>
            <motion.h2
              className="mb-6 mt-4 text-4xl font-bold text-light md:text-6xl"
              initial="hidden"
              animate="visible"
              variants={titleVariants}
              custom={1}
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)' }}
            >
              Services à réserver rapidement
            </motion.h2>
          </div>

          <div ref={descriptionRef} className="relative z-30 flex items-center">
            <motion.p
              className="text-lg text-light"
              initial="hidden"
              animate="visible"
              variants={descriptionVariants}
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.9)' }}
            >
              Le salon choisit ici les prestations les plus importantes. Chaque carte vous emmène directement vers la réservation du service déjà sélectionné.
            </motion.p>
          </div>
        </div>

        <div ref={servicesGridRef} className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {featuredServices.map((item, index) => (
            <motion.div key={item.service.id} initial="hidden" animate="visible" variants={serviceCardVariants} custom={index}>
              <Link href={`/reservation?service=${item.service.slug}`} className="group block overflow-hidden rounded-[2rem] bg-white/95 shadow-[0_25px_80px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
                <div className="relative h-64 w-full overflow-hidden bg-neutral-100">
                  {item.service.imagen_url ? (
                    <Image src={getImageUrl(item.service.imagen_url)} alt={item.service.nombre} fill className="object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-primary/8 text-5xl font-bold text-primary">
                      {item.service.nombre.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="space-y-4 p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-2xl font-bold text-secondary">{item.service.nombre}</h3>
                    <span className="rounded-full bg-secondary px-3 py-1 text-sm font-bold text-primary">{item.service.precio} CHF</span>
                  </div>
                  <p className="min-h-[72px] text-sm leading-relaxed text-gray-600">{item.service.descripcion}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{getSafeServiceDuration(item.service.duration)} min</span>
                    <span className="font-semibold text-primary">Réserver ce service</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div ref={ctaRef} className="mt-12 text-center">
          <Link href="/reservation" className="inline-flex rounded-full bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.18em] text-secondary transition hover:bg-yellow-400">
            Voir tous les services
          </Link>
        </div>
      </div>
    </section>
  );
}
