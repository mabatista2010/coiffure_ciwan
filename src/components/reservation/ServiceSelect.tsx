'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase, Service } from '@/lib/supabase';

interface ServiceSelectProps {
  onServiceSelect: (service: Service) => void;
}

export default function ServiceSelect({ onServiceSelect }: ServiceSelectProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const { data, error } = await supabase
          .from('servicios')
          .select('*')
          .eq('active', true)
          .order('id');

        if (error) {
          throw error;
        }

        setServices(data || []);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error chargement des services:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
          Sélection du Service
        </h2>
        <p className="text-lg text-text-medium">
          Choisissez le service que vous souhaitez réserver
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300"
              onClick={() => onServiceSelect(service)}
            >
              <div className="relative h-48 w-full">
                <Image
                  src={service.imagen_url}
                  alt={service.nombre}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xl font-bold text-secondary">
                    {service.nombre}
                  </h3>
                  <span className="text-lg font-bold text-primary bg-secondary px-2 py-1 rounded">
                    {service.precio} CHF
                  </span>
                </div>
                <p className="text-gray-700 mb-2">
                  {service.descripcion}
                </p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Durée: {service.duration || 30} min</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 