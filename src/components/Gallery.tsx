'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { supabase, GalleryImage } from '@/lib/supabase';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
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
    <section 
      id="galeria" 
      className="py-16 relative" 
      style={{ 
        background: 'linear-gradient(to bottom, #000000, #111111 50%, #000000)' 
      }}
    >
      {/* Elemento decorativo - degradado radial sutil */}
      <div 
        className="absolute inset-0 opacity-40" 
        style={{ 
          background: 'radial-gradient(circle at center, rgba(218,165,32,0.1) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }}
      ></div>

      <div className="w-full px-4 lg:px-6 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true, amount: 0.3 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary font-sans tracking-wide">
            Galerie
          </h2>
          <p className="text-base md:text-lg max-w-2xl mx-auto text-white opacity-90 leading-relaxed">
            Découvrez quelques-uns de nos meilleurs travaux et styles de coupe que nous réalisons dans notre salon.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <p className="text-center text-red-500 py-16">
            {error}
          </p>
        ) : (
          <div className="max-w-[1400px] mx-auto">
            {/* Carrusel principal */}
            <div 
              className="relative overflow-hidden rounded-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-primary/20"
            >
              <div 
                className="overflow-hidden relative aspect-[16/9] md:aspect-[18/9] lg:aspect-[18/9]"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <AnimatePresence mode="wait">
                  {images.length > 0 && (
                    <motion.div
                      key={currentIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: "easeInOut" }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src={images[currentIndex].imagen_url}
                        alt={images[currentIndex].descripcion}
                        fill
                        sizes="(max-width: 768px) 100vw, 90vw"
                        className="object-cover transition-transform duration-700"
                        style={{
                          transform: isHovered ? 'scale(1.05)' : 'scale(1)'
                        }}
                      />
                      
                      {/* Gradiente vertical sobre la imagen */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70"></div>
                      
                      {/* Información descriptiva siempre visible */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-6">
                        <p className="text-white text-base md:text-xl font-medium drop-shadow-md">
                          {images[currentIndex].descripcion}
                        </p>
                        <p className="text-primary/90 mt-1 text-sm md:text-base">
                          {new Date(images[currentIndex].fecha).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long'
                          })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Controles de navegación mejorados */}
              <button
                onClick={prevSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-primary hover:scale-110 rounded-full p-2 shadow-[0_0_10px_rgba(0,0,0,0.4)] border border-primary/50 transition duration-300 z-10"
                aria-label="Image précédente"
              >
                <FaChevronLeft size={20} />
              </button>
              
              <button
                onClick={nextSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black text-primary hover:scale-110 rounded-full p-2 shadow-[0_0_10px_rgba(0,0,0,0.4)] border border-primary/50 transition duration-300 z-10"
                aria-label="Image suivante"
              >
                <FaChevronRight size={20} />
              </button>
            </div>

            {/* Miniaturas (solo visibles en pantallas medianas y grandes) */}
            <div className="hidden md:flex justify-center mt-6 space-x-3 overflow-x-auto pb-3">
              {images.map((image, index) => (
                <div 
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    currentIndex === index 
                      ? 'ring-3 ring-primary' 
                      : 'ring-1 ring-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="relative w-20 h-20 lg:w-24 lg:h-24 overflow-hidden">
                    <Image
                      src={image.imagen_url}
                      alt={image.descripcion}
                      fill
                      sizes="(max-width: 768px) 80px, 96px"
                      className="object-cover"
                    />
                  </div>
                  {currentIndex === index && (
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Indicadores de posición mejorados (visibles solo en móvil) */}
            <div className="flex md:hidden justify-center mt-4 space-x-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`transition-all duration-300 ${
                    currentIndex === index 
                      ? 'w-6 h-2 bg-primary rounded-full' 
                      : 'w-2 h-2 bg-white/30 hover:bg-white/50 rounded-full'
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