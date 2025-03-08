'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase, Location, Service } from '@/lib/supabase';

interface LocationSelectProps {
  selectedService: Service;
  onLocationSelect: (location: Location) => void;
  onBack: () => void;
}

export default function LocationSelect({ selectedService, onLocationSelect, onBack }: LocationSelectProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) {
          throw error;
        }

        setLocations(data || []);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error chargement des centres:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
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
          Sélection du Centre
        </h2>
        <p className="text-lg text-text-medium">
          Choisissez le centre où vous souhaitez réserver votre {selectedService.nombre}
        </p>
      </motion.div>

      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-primary hover:underline"
        >
          &larr; Retour à la sélection des services
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <p className="text-center text-red-500">
          {error}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {locations.map((location, index) => (
            <motion.div
              key={location.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300"
              onClick={() => onLocationSelect(location)}
            >
              <div className="relative h-48 w-full">
                <Image
                  src={location.image || '/locations/default.jpg'}
                  alt={location.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-secondary mb-2">
                  {location.name}
                </h3>
                <p className="text-gray-700 mb-2">
                  {location.description}
                </p>
                <div className="text-sm text-gray-600">
                  <p className="mb-1"><strong>Adresse:</strong> {location.address}</p>
                  <p className="mb-1"><strong>Téléphone:</strong> {location.phone}</p>
                  <p><strong>Email:</strong> {location.email}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 