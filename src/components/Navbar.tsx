'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isReservationPage = pathname === '/reservation' || pathname.startsWith('/reservation/');
  
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
    // Si estamos en la página de reservas, establecer scrolled a true inmediatamente
    if (isReservationPage) {
      setScrolled(true);
      return;
    }
    
    const handleScroll = () => {
      if (window.scrollY > 60) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    // Comprobar el scroll inicial
    handleScroll();
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isReservationPage]);

  // Función para generar la URL correcta según la ruta actual
  const getUrl = (anchor: string) => {
    return isHomePage ? anchor : `/${anchor}`;
  };

  return (
    <>
      <nav className={`fixed w-full z-40 py-2 px-0 md:px-4 transition-all duration-300 ${scrolled || isReservationPage ? 'bg-black/50 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="flex justify-between items-center">
          {/* Logo a la izquierda */}
          <div className="flex items-center pl-0">
            <Link 
              href="/" 
              className="z-50 cursor-pointer transition-transform hover:scale-105"
              aria-label="Retour à l'accueil"
            >
              <Image 
                src="/logo.png" 
                alt="Logo Coiffure Ciwan" 
                width={160} 
                height={160} 
                className="rounded-full object-cover" 
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex gap-6">
              <Link 
                href={getUrl("#servicios")} 
                className="text-[#cccccc] uppercase text-sm hover:text-primary transition duration-300 relative group"
              >
                Services
                <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href="/equipo" 
                className="text-[#cccccc] uppercase text-sm hover:text-primary transition duration-300 relative group"
              >
                Équipe
                <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href={getUrl("#galeria")} 
                className="text-[#cccccc] uppercase text-sm hover:text-primary transition duration-300 relative group"
              >
                Galerie
                <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href={getUrl("#ubicacion")} 
                className="text-[#cccccc] uppercase text-sm hover:text-primary transition duration-300 relative group"
              >
                Localisation
                <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
              <Link 
                href={getUrl("#contacto")} 
                className="text-[#cccccc] uppercase text-sm hover:text-primary transition duration-300 relative group"
              >
                Contact
                <span className="absolute left-0 bottom-[-4px] w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </div>
            
            <Link 
              href="/reservation" 
              className="bg-primary text-[#cccccc] px-5 py-2 rounded text-sm uppercase font-bold hover:bg-[#b88b14] hover:text-primary transition duration-300"
            >
              Réserver
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden z-50 pr-4">
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

      {/* Mobile Menu - Mantenemos el actual como solicitado */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-30 md:hidden bg-black"
          >
            <div className="flex flex-col pt-32 pb-10 px-6 min-h-[450px] max-h-[80vh] rounded-b-3xl shadow-2xl">
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
                  className="block w-full py-4 px-6 text-2xl font-black text-center rounded text-[#cccccc] bg-primary hover:bg-[#b88b14] hover:text-primary transition duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  Réserver
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 