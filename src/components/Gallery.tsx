'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { supabase, GalleryImage } from '@/lib/supabase';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    async function fetchGallery() {
      try {
        const { data, error } = await supabase
          .from('imagenes_galeria')
          .select('*')
          .order('fecha', { ascending: false });

        if (error) {
          throw error;
        }

        setImages(data || []);
      } catch (err: Error | unknown) {
        setError(err instanceof Error ? err.message : String(err));
        console.error('Error fetching gallery:', err);
        // Datos fallback en caso de error con Supabase
        setImages([
          {
            id: 1,
            descripcion: 'Fade moderne avec lignes',
            imagen_url: '/gallery/corte1.jpg',
            fecha: '2023-11-05',
          },
          {
            id: 2,
            descripcion: 'Coupe texturée',
            imagen_url: '/gallery/corte2.jpg',
            fecha: '2023-10-28',
          },
          {
            id: 3,
            descripcion: 'Dégradé avec coiffage',
            imagen_url: '/gallery/corte3.jpg',
            fecha: '2023-10-15',
          },
          {
            id: 4,
            descripcion: 'Coupe avec barbe profilée',
            imagen_url: '/gallery/corte4.jpg',
            fecha: '2023-10-08',
          },
          {
            id: 5,
            descripcion: 'Style classique avec raie latérale',
            imagen_url: '/gallery/corte5.jpg',
            fecha: '2023-09-30',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchGallery();
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    if (diff > 50) {
      nextSlide();
    } else if (diff < -50) {
      prevSlide();
    }
    
    touchStartX.current = null;
  };

  return (
    <section id="galeria" className="py-20" style={{ backgroundColor: '#000000' }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#DAA520' }}>
            Galerie
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#E0E0E0' }}>
            Découvrez quelques-uns de nos meilleurs travaux et styles de coupe que nous réalisons dans notre salon.
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
          <div className="relative max-w-4xl mx-auto">
            <div 
              className="overflow-hidden rounded-lg shadow-xl relative aspect-[16/9]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {images.length > 0 && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="relative w-full h-full"
                >
                  <Image
                    src={images[currentIndex].imagen_url}
                    alt={images[currentIndex].descripcion}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <p className="text-white text-lg font-medium">
                      {images[currentIndex].descripcion}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Controles de navegación */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-secondary rounded-full p-2 shadow-md transition duration-300 z-10"
              aria-label="Image précédente"
            >
              <FaChevronLeft size={20} />
            </button>
            
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-secondary rounded-full p-2 shadow-md transition duration-300 z-10"
              aria-label="Image suivante"
            >
              <FaChevronRight size={20} />
            </button>

            {/* Indicadores de posición */}
            <div className="flex justify-center mt-4 space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentIndex === index ? 'bg-primary w-6' : 'bg-gray-400'
                  }`}
                  aria-label={`Aller à l'image ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
} 