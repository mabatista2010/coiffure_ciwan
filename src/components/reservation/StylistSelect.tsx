'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase, Stylist, Service, Location } from '@/lib/supabase';

interface StylistSelectProps {
  selectedService: Service;
  selectedLocation: Location;
  onStylistSelect: (stylist: Stylist) => void;
  onBack: () => void;
}

export default function StylistSelect({ 
  selectedService, 
  selectedLocation, 
  onStylistSelect, 
  onBack 
}: StylistSelectProps) {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    async function fetchStylists() {
      try {
        setDebugInfo(`Buscando estilistas pour le service ID: ${selectedService.id} à la location ID: ${selectedLocation.id}`);
        
        // Obtenemos todos los estilistas activos
        const { data: stylistsData, error: stylistsError } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true);

        if (stylistsError) {
          throw stylistsError;
        }

        setDebugInfo(prevDebug => `${prevDebug}\nEstilistas activos encontrados: ${stylistsData?.length || 0}`);

        if (!stylistsData || stylistsData.length === 0) {
          setStylists([]);
          setLoading(false);
          return;
        }

        // Filtramos manualmente los estilistas que trabajan en el centro seleccionado
        const stylistsInLocation = stylistsData.filter(stylist =>
          stylist.location_ids?.includes(selectedLocation.id)
        );

        setDebugInfo(prevDebug => `${prevDebug}\nEstilistas en ce centre: ${stylistsInLocation.length}`);

        if (stylistsInLocation.length === 0) {
          setStylists([]);
          setLoading(false);
          return;
        }

        // Ahora filtramos los estilistas que ofrecen el servicio seleccionado
        const { data: stylistServicesData, error: stylistServicesError } = await supabase
          .from('stylist_services')
          .select('*')
          .eq('service_id', selectedService.id)
          .in('stylist_id', stylistsInLocation.map(s => s.id));

        if (stylistServicesError) {
          throw stylistServicesError;
        }

        setDebugInfo(prevDebug => `${prevDebug}\nServicios encontrados pour ces estilistas: ${stylistServicesData?.length || 0}`);

        // Filtramos la lista final de estilistas
        const filteredStylists = stylistsInLocation.filter(stylist => 
          stylistServicesData.some(ss => ss.stylist_id === stylist.id)
        );

        setDebugInfo(prevDebug => `${prevDebug}\nEstilistas finales qui offrent ce service dans ce centre: ${filteredStylists.length}`);
        
        setStylists(filteredStylists);
      } catch (err: Error | unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        setDebugInfo(prevDebug => `${prevDebug}\nError: ${errorMsg}`);
        console.error('Error cargando estilistas:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStylists();
  }, [selectedLocation.id, selectedService.id]);

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
          Sélection du Styliste
        </h2>
        <p className="text-lg text-text-medium">
          Choisissez le professionnel pour votre {selectedService.nombre} à {selectedLocation.name}
        </p>
      </motion.div>

      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-primary hover:underline"
        >
          &larr; Retour à la sélection du centre
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
      ) : stylists.length === 0 ? (
        <div className="text-center">
          <p className="text-lg text-text-medium mb-4">
            Il n&apos;y a pas de stylistes disponibles pour ce service dans le centre sélectionné.
          </p>
          <div className="mb-4 p-4 bg-gray-50 rounded mx-auto max-w-md text-left">
            <details>
              <summary className="cursor-pointer text-gray-600 text-sm">Information de débogage</summary>
              <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto">
                {debugInfo}
              </pre>
            </details>
          </div>
          <button 
            onClick={onBack}
            className="bg-primary text-secondary px-6 py-2 rounded-md hover:bg-opacity-80 transition duration-300"
          >
            Sélectionner un autre centre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stylists.map((stylist, index) => (
            <motion.div
              key={stylist.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform duration-300"
              onClick={() => onStylistSelect(stylist)}
            >
              <div className="relative h-64 w-full">
                <Image
                  src={stylist.profile_img || '/stylists/default.jpg'}
                  alt={stylist.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-secondary mb-2">
                  {stylist.name}
                </h3>
                <p className="text-gray-700 mb-4">
                  {stylist.bio}
                </p>
                <div className="flex flex-wrap gap-2">
                  {stylist.specialties?.map((specialty, i) => (
                    <span 
                      key={i} 
                      className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 