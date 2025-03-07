'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBars, FaTimes } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  return (
    <nav className={`fixed w-full z-50 py-4 transition-all duration-300 ${scrolled ? 'bg-black/50 backdrop-blur-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold" style={{ color: '#E76F51', fontFamily: 'Dancing Script, cursive' }}>
          Coiffure Ciwan
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-8">
          <Link href="#servicios" style={{ color: '#FFD700' }} className="hover:opacity-75 transition duration-300">
            Services
          </Link>
          <Link href="#galeria" style={{ color: '#FFD700' }} className="hover:opacity-75 transition duration-300">
            Galerie
          </Link>
          <Link href="#ubicacion" style={{ color: '#FFD700' }} className="hover:opacity-75 transition duration-300">
            Localisation
          </Link>
          <Link href="#contacto" style={{ color: '#FFD700' }} className="hover:opacity-75 transition duration-300">
            Contact
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="focus:outline-none"
            style={{ color: '#FFD700' }}
          >
            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-black/80 backdrop-blur-sm shadow-lg absolute w-full py-4 z-50"
        >
          <div className="flex flex-col items-center space-y-4">
            <Link 
              href="#servicios" 
              style={{ color: '#FFD700' }}
              className="hover:opacity-75 transition duration-300"
              onClick={() => setIsOpen(false)}
            >
              Services
            </Link>
            <Link 
              href="#galeria" 
              style={{ color: '#FFD700' }}
              className="hover:opacity-75 transition duration-300"
              onClick={() => setIsOpen(false)}
            >
              Galerie
            </Link>
            <Link 
              href="#ubicacion" 
              style={{ color: '#FFD700' }}
              className="hover:opacity-75 transition duration-300"
              onClick={() => setIsOpen(false)}
            >
              Localisation
            </Link>
            <Link 
              href="#contacto" 
              style={{ color: '#FFD700' }}
              className="hover:opacity-75 transition duration-300"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>
          </div>
        </motion.div>
      )}
    </nav>
  );
} 