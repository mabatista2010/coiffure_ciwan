'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaCalendarAlt, FaUsers, FaSignOutAlt, FaChartBar, FaChartPie, FaBars, FaTimes, FaUserCog } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/userRoles';

// Definir el tipo para el rol
type NavRole = 'admin' | 'employee' | 'all';

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  
  useEffect(() => {
    const checkUserRole = async () => {
      setIsLoading(true);
      const role = await getUserRole();
      setUserRole(role);
      setIsLoading(false);
    };
    
    checkUserRole();
  }, []);
  
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
  
  // Función para determinar si mostrar un elemento de navegación basado en el rol
  const shouldShowNavItem = (requiredRole: 'admin' | 'employee' | 'all') => {
    if (requiredRole === 'all') return true;
    if (requiredRole === 'admin') return userRole === 'admin';
    if (requiredRole === 'employee') return userRole === 'employee' || userRole === 'admin';
    return false;
  };

  // Navegar a la página apropiada para el dashboard según el rol
  const getDashboardLink = () => {
    if (userRole === 'admin') {
      return '/admin';
    } else {
      return '/admin/reservations';
    }
  };
  
  // Array de elementos de navegación con sus roles requeridos
  const navItems = [
    { 
      href: getDashboardLink(), 
      label: 'Dashboard', 
      icon: <FaChartPie className="w-6 h-6 mr-2" />, 
      role: 'all' as NavRole
    },
    { 
      href: '/admin/reservations', 
      label: 'Reservations', 
      icon: <FaCalendarAlt className="w-6 h-6 mr-2" />, 
      role: 'all' as NavRole
    },
    { 
      href: '/admin/crm', 
      label: 'Clients', 
      icon: <FaUsers className="w-6 h-6 mr-2" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/stylist-stats', 
      label: 'Stylists', 
      icon: <FaChartBar className="w-6 h-6 mr-2" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/location-stats', 
      label: 'Centres', 
      icon: <FaChartBar className="w-6 h-6 mr-2" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/user-management', 
      label: 'Utilisateurs', 
      icon: <FaUserCog className="w-6 h-6 mr-2" />, 
      role: 'admin' as NavRole
    }
  ];
  
  // Si está cargando, mostrar un indicador
  if (isLoading) {
    return (
      <nav className="bg-dark p-4 shadow-md">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto rounded-full animate-spin-custom"></div>
        </div>
      </nav>
    );
  }

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
              {navItems.map((item, index) => (
                shouldShowNavItem(item.role) && (
                  <Link 
                    key={`desktop-nav-${item.href}-${index}`}
                    href={item.href} 
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === item.href 
                        ? 'bg-dark text-primary' 
                        : 'text-light hover:bg-dark hover:text-primary'
                    } flex items-center transition-colors duration-200`}
                  >
                    {item.icon} {item.label}
                  </Link>
                )
              ))}
              
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
                {navItems.map((item, index) => (
                  shouldShowNavItem(item.role) && (
                    <Link 
                      key={`mobile-nav-${item.href}-${index}`}
                      href={item.href} 
                      className={`block py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${pathname === item.href ? 'text-primary' : 'text-light'}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center hover:pl-2 transition-all duration-300">
                        {item.icon} {item.label}
                      </div>
                    </Link>
                  )
                ))}
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