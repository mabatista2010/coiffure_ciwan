'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaCalendarAlt, FaUsers, FaSignOutAlt, FaChartBar, FaChartPie, FaBars, FaTimes, FaCogs } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  
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
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };
  
  return (
    <>
      <nav className="fixed w-full z-40 bg-secondary text-light">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Logo / Título */}
            <Link href="/admin" className="text-xl font-bold text-primary z-50">
              Calendrier et statistiques
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <Link 
                href="/admin/reservations" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin/reservations' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaCalendarAlt className="mr-2" /> Réservations
              </Link>
              
              <Link 
                href="/admin/crm" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin/crm' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaUsers className="mr-2" /> CRM Clients
              </Link>
              
              <Link 
                href="/admin/stylist-stats" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin/stylist-stats' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaChartBar className="mr-2" /> Stats Stylistes
              </Link>
              
              <Link 
                href="/admin/location-stats" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin/location-stats' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaChartPie className="mr-2" /> Stats Centres
              </Link>
              
              <Link 
                href="/admin" 
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname === '/admin' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaCogs className="mr-2" /> Panel de Control
              </Link>
              
              <button 
                onClick={handleSignOut}
                className="px-3 py-2 rounded-md text-sm font-medium text-light hover:bg-dark hover:text-primary flex items-center transition-colors duration-200"
              >
                <FaSignOutAlt className="mr-2" /> Déconnexion
              </button>
            </div>
            
            {/* Mobile Menu Button */}
            <div className="md:hidden z-50">
              <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`focus:outline-none p-2 transition-all duration-200 text-primary ${isOpen ? 'bg-dark rounded-full shadow-lg hover:shadow-xl' : 'hover:scale-110'}`}
                aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              >
                {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Espacio para compensar el navbar fijo */}
      <div className="h-16"></div>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-30 md:hidden bg-secondary"
          >
            <div className="flex flex-col pt-20 pb-10 px-6 min-h-[450px] max-h-[80vh] shadow-2xl">
              <div className="space-y-1">
                <Link 
                  href="/admin/reservations" 
                  className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === '/admin/reservations' ? 'text-primary' : 'text-light'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaCalendarAlt className="mr-3" /> Réservations
                  </div>
                </Link>
                
                <Link 
                  href="/admin/crm" 
                  className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === '/admin/crm' ? 'text-primary' : 'text-light'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaUsers className="mr-3" /> CRM Clients
                  </div>
                </Link>
                
                <Link 
                  href="/admin/stylist-stats" 
                  className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === '/admin/stylist-stats' ? 'text-primary' : 'text-light'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaChartBar className="mr-3" /> Stats Stylistes
                  </div>
                </Link>
                
                <Link 
                  href="/admin/location-stats" 
                  className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === '/admin/location-stats' ? 'text-primary' : 'text-light'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaChartPie className="mr-3" /> Stats Centres
                  </div>
                </Link>
                
                <Link 
                  href="/admin" 
                  className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === '/admin' ? 'text-primary' : 'text-light'}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaCogs className="mr-3" /> Panel de Control
                  </div>
                </Link>
              </div>
              
              {/* Botón de cierre de sesión */}
              <div className="mt-8">
                <button 
                  onClick={() => {
                    setIsOpen(false);
                    handleSignOut();
                  }}
                  className="block w-full py-3 px-4 text-lg font-bold text-center rounded-full transition-transform hover:scale-[1.02] active:scale-[0.98] bg-primary text-secondary shadow-lg"
                >
                  <div className="flex items-center justify-center">
                    <FaSignOutAlt className="mr-2" /> Déconnexion
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 