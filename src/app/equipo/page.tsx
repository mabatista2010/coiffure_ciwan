'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { supabase, Stylist } from '@/lib/supabase';

export default function EquipoPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStylists() {
      try {
        const { data, error } = await supabase
          .from('stylists')
          .select('*')
          .eq('active', true)
          .order('name');

        if (error) {
          throw error;
        }

        setStylists(data || []);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error al cargar estilistas:', err);
        // Datos de respaldo en caso de error
        setStylists([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStylists();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-dark">
      <Navbar />
      
      <section className="pt-32 pb-16 px-4 md:px-8">
        <div className="container mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-4 text-coral font-sans"
            >
              Notre Équipe
            </h1>
            <p className="text-lg text-light max-w-3xl mx-auto">
              Découvrez notre équipe de professionnels passionnés, prêts à vous offrir une expérience de coiffure exceptionnelle dans tous nos centres.
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center">
              <div className="w-16 h-16 animate-spin-custom"></div>
            </div>
          ) : error ? (
            <div className="text-center p-8 bg-red-900/20 rounded-lg">
              <p className="text-red-500">Error: {error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stylists.map((stylist, index) => (
                <motion.div
                  key={stylist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-card rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="relative h-80 w-full">
                    {stylist.profile_img ? (
                      <Image
                        src={stylist.profile_img}
                        alt={stylist.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-secondary">
                        <span className="text-primary text-6xl font-bold">
                          {stylist.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-2xl font-bold text-primary mb-2">{stylist.name}</h3>
                    
                    {stylist.specialties && stylist.specialties.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {stylist.specialties.map((specialty, idx) => (
                          <span 
                            key={idx} 
                            className="tag tag-coral"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {stylist.bio && (
                      <p className="text-white">{stylist.bio}</p>
                    )}
                  </div>
                </motion.div>
              ))}

              {stylists.length === 0 && !error && (
                <div className="col-span-full text-center p-8">
                  <p className="text-white">Aucun styliste n&apos;a été trouvé.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      
      <Footer />
    </main>
  );
} 