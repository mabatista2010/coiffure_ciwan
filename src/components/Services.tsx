'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase, Service } from '@/lib/supabase';

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data, error } = await supabase
          .from('servicios')
          .select('*')
          .order('id');

        if (error) {
          throw error;
        }

        setServices(data || []);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error fetching services:', err);
        // Datos fallback en caso de error con Supabase
        setServices([
          {
            id: 1,
            nombre: 'Coupe Classique',
            descripcion: 'Coupe traditionnelle aux ciseaux et détaillée au rasoir',
            precio: 15,
            imagen_url: '/services/corte-clasico.jpg',
          },
          {
            id: 2,
            nombre: 'Fade',
            descripcion: 'Dégradé parfait avec différents niveaux de longueur',
            precio: 18,
            imagen_url: '/services/fade.jpg',
          },
          {
            id: 3,
            nombre: 'Barbe',
            descripcion: 'Taille et façonnage de la barbe avec serviette chaude',
            precio: 12,
            imagen_url: '/services/barba.jpg',
          },
          {
            id: 4,
            nombre: 'Coupe Enfants',
            descripcion: 'Coupes spéciales pour les plus petits',
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
    <section id="servicios" className="py-20" style={{ backgroundColor: '#000000' }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#DAA520' }}>
            Nos Services
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#E0E0E0' }}>
            Nous offrons une large gamme de services de coiffure pour hommes et enfants avec la meilleure qualité et attention personnalisée.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <p className="text-center text-red-500">
            {error}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="relative h-56 w-full">
                  <Image
                    src={service.imagen_url}
                    alt={service.nombre}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xl font-bold text-secondary">
                      {service.nombre}
                    </h3>
                    <span className="text-lg font-bold text-primary bg-secondary px-2 py-1 rounded">
                      {service.precio}€
                    </span>
                  </div>
                  <p className="text-gray-700">
                    {service.descripcion}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
} 