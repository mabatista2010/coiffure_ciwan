'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  
  // Bloquear el scroll cuando el menú está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Detectar scroll para añadir un fondo semitransparente al navbar
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Función para generar la URL correcta según la ruta actual
  const getUrl = (anchor: string) => {
    return isHomePage ? anchor : `/${anchor}`;
  };

  return (
    <>
      <nav className={`fixed w-full z-40 py-4 transition-all duration-300 ${scrolled ? 'bg-black/50 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center relative">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold z-50 text-coral font-decorative">
            Coiffure Ciwan
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex space-x-8 items-center">
            <Link href={getUrl("#servicios")} className="text-primary hover:opacity-75 transition duration-300">
              Services
            </Link>
            <Link href="/equipo" className="text-primary hover:opacity-75 transition duration-300">
              Équipe
            </Link>
            <Link href={getUrl("#galeria")} className="text-primary hover:opacity-75 transition duration-300">
              Galerie
            </Link>
            <Link href={getUrl("#ubicacion")} className="text-primary hover:opacity-75 transition duration-300">
              Localisation
            </Link>
            <Link href={getUrl("#contacto")} className="text-primary hover:opacity-75 transition duration-300">
              Contact
            </Link>
            <Link 
              href="/reservation" 
              className="text-primary hover:opacity-75 transition duration-300 flex items-center gap-1"
            >
              <FaCalendarAlt className="text-sm" /> Réserver
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden z-50">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className={`focus:outline-none p-2 transition-all duration-200 text-primary ${isOpen ? 'bg-black rounded-full shadow-lg hover:shadow-xl' : 'hover:scale-110'}`}
              style={{ 
                textShadow: isOpen ? '0 0 10px rgba(255,215,0,0.5)' : 'none'
              }}
              aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              {isOpen ? <FaTimes size={30} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Fullscreen with fixed X button in a better position */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-30 md:hidden bg-black"
          >
            <div className="flex flex-col pt-24 pb-10 px-6 min-h-[450px] max-h-[80vh] rounded-b-3xl shadow-2xl">
              <div className="space-y-3">
                {/* Enlaces con mayor visibilidad y contraste */}
                <Link 
                  href={getUrl("#servicios")}
                  className="py-4 text-3xl sm:text-4xl font-extrabold flex justify-between items-center border-b border-gray-800 transition-all duration-300 text-primary"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="hover:pl-2 transition-all duration-300">Services</span>
                </Link>
                <Link 
                  href="/equipo" 
                  className="py-4 text-3xl sm:text-4xl font-extrabold flex justify-between items-center border-b border-gray-800 transition-all duration-300 text-primary"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="hover:pl-2 transition-all duration-300">Équipe</span>
                </Link>
                <Link 
                  href={getUrl("#galeria")} 
                  className="py-4 text-3xl sm:text-4xl font-extrabold flex justify-between items-center border-b border-gray-800 transition-all duration-300 text-primary"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="hover:pl-2 transition-all duration-300">Galerie</span>
                </Link>
                <Link 
                  href={getUrl("#ubicacion")} 
                  className="py-4 text-3xl sm:text-4xl font-extrabold flex justify-between items-center border-b border-gray-800 transition-all duration-300 text-primary"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="hover:pl-2 transition-all duration-300">Localisation</span>
                </Link>
                <Link 
                  href={getUrl("#contacto")} 
                  className="py-4 text-3xl sm:text-4xl font-extrabold flex justify-between items-center border-b border-gray-800 transition-all duration-300 text-primary"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                  onClick={() => setIsOpen(false)}
                >
                  <span className="hover:pl-2 transition-all duration-300">Contact</span>
                </Link>
              </div>
              
              {/* Botón de reserva con mejor visibilidad */}
              <div className="mt-10">
                <Link 
                  href="/reservation" 
                  className="block w-full py-4 px-6 text-2xl font-black text-center rounded-full transition-transform hover:scale-[1.02] shadow-lg active:scale-[0.98] bg-primary text-secondary"
                  style={{ 
                    boxShadow: '0 4px 10px rgba(255,215,0,0.4)',
                    textShadow: '0 0 1px rgba(0,0,0,0.2)'
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  Réserver maintenant
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 