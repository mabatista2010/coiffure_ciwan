'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  FaCalendarAlt, 
  FaUsers, 
  FaSignOutAlt, 
  FaChartBar, 
  FaBars, 
  FaTimes, 
  FaUserCog,
  FaTools,
  FaImages,
  FaUserTie,
  FaBuilding,
  FaCogs,
  FaChevronLeft,
  FaChevronRight,
  FaShoppingBag
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getUserRole } from '@/lib/userRoles';

// Definir el tipo para el rol
type NavRole = 'admin' | 'employee' | 'all';

// Tipo para las secciones de configuración
type ConfigSection = 'services' | 'gallery' | 'stylists' | 'locations' | 'hero' | null;

export default function AdminNav({ 
  activeSection, 
  setActiveSection 
}: { 
  activeSection?: ConfigSection, 
  setActiveSection?: (section: ConfigSection) => void 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'employee' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  const isConfigPage = pathname === '/admin' && setActiveSection !== undefined;
  
  useEffect(() => {
    const checkUserRole = async () => {
      setIsLoading(true);
      const role = await getUserRole();
      setUserRole(role);
      setIsLoading(false);
    };
    
    checkUserRole();
  }, []);
  
  // Comprobar el tamaño de la pantalla al iniciar
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    // Comprobar al inicio
    checkScreenSize();
    
    // Añadir listener para cambios de tamaño
    window.addEventListener('resize', checkScreenSize);
    
    // Limpiar listener
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Cerrar la barra lateral al hacer clic fuera de ella (solo desktop)
  useEffect(() => {
    // Solo activar este efecto si la barra está abierta
    if (!sidebarOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar que el clic no fue dentro de la barra lateral ni en el botón de toggle
      const sidebar = document.getElementById('desktop-sidebar');
      const target = event.target as Element;
      
      // Si el clic fue dentro de la barra o en un botón de toggle, no hacer nada
      if (sidebar && sidebar.contains(target) || 
          target.closest('button')?.getAttribute('data-toggle-sidebar') === 'true') {
        return;
      }
      
      // En otro caso, cerrar la barra
      setSidebarOpen(false);
    };
    
    // Añadir listener para clicks en el documento
    document.addEventListener('mousedown', handleClickOutside);
    
    // Limpiar listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen]);
  
  // Bloquear el scroll cuando el menú está abierto (solo móvil)
  useEffect(() => {
    if (isOpen) {
      // Permitir scroll dentro del menú pero bloquear el scroll del body
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${window.scrollY}px`;
    } else {
      // Restaurar el scroll
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };
  
  // Función para determinar si mostrar un elemento de navegación basado en el rol
  const shouldShowNavItem = (requiredRole: NavRole) => {
    if (requiredRole === 'all') return true;
    if (requiredRole === 'admin') return userRole === 'admin';
    if (requiredRole === 'employee') return userRole === 'employee' || userRole === 'admin';
    return false;
  };

  // Array de elementos de navegación con sus roles requeridos
  const navItems = [
    { 
      href: '/admin/reservations', 
      label: 'Reservations', 
      icon: <FaCalendarAlt className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'all' as NavRole
    },
    { 
      href: '/admin/crm', 
      label: 'Clients', 
      icon: <FaUsers className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/stylist-stats', 
      label: 'Stylists Stats', 
      icon: <FaChartBar className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/location-stats', 
      label: 'Centres Stats', 
      icon: <FaChartBar className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/user-management', 
      label: 'Utilisateurs', 
      icon: <FaUserCog className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      href: '/admin/boutique', 
      label: 'Boutique', 
      icon: <FaShoppingBag className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    }
  ];
  
  // Elementos de configuración (solo para la página admin principal)
  const configItems = [
    { 
      id: 'services' as ConfigSection,
      label: 'Services', 
      icon: <FaTools className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      id: 'gallery' as ConfigSection,
      label: 'Galerie', 
      icon: <FaImages className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      id: 'stylists' as ConfigSection,
      label: 'Stylistes', 
      icon: <FaUserTie className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      id: 'locations' as ConfigSection,
      label: 'Centres', 
      icon: <FaBuilding className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    },
    { 
      id: 'hero' as ConfigSection,
              label: 'Page d&apos;accueil', 
      icon: <FaCogs className="w-7 h-7 md:w-5 md:h-5" />, 
      role: 'admin' as NavRole
    }
  ];
  
  // Función para manejar clic en una sección de configuración
  const handleConfigClick = (section: ConfigSection) => {
    if (setActiveSection) {
      setActiveSection(section);
    }
  };
  
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
      {/* Barra de navegación superior (solo visible en móvil) */}
      <nav className="fixed w-full z-40 bg-secondary text-light md:hidden">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-2">
            {/* Logo */}
            <Link href="/" className="z-50 transition-transform hover:scale-105 py-1">
              <Image 
                src="/logo.png" 
                alt="Steel & Blade Logo" 
                width={44} 
                height={12} 
                className="h-auto" 
                priority
              />
            </Link>
            
            {/* Mobile Menu Button */}
            <div className="z-50">
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
      
      {/* Espacio para compensar el navbar fijo en móvil */}
      <div className="h-[60px] md:hidden"></div>
      
      {/* Sidebar para versión de escritorio */}
      <div className="hidden md:block">
        <div 
          id="desktop-sidebar"
          className={`fixed top-0 left-0 h-full bg-secondary text-light z-40 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-20'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Header del sidebar */}
            <div className="flex items-center justify-between p-4 border-b border-dark">
              {sidebarOpen ? (
                <Link href="/" className="flex items-center transition-transform hover:scale-105">
                  <Image 
                    src="/logo.png" 
                    alt="Steel & Blade Logo" 
                    width={56} 
                    height={14} 
                    className="h-auto" 
                    priority
                  />
                </Link>
              ) : (
                <Link href="/" className="flex items-center justify-center transition-transform hover:scale-110">
                  <Image 
                    src="/logo.png" 
                    alt="Steel & Blade Logo" 
                    width={12} 
                    height={12} 
                    className="h-auto object-contain" 
                    priority
                  />
                </Link>
              )}
              <button 
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-full hover:bg-dark transition-colors duration-200 text-primary"
                data-toggle-sidebar="true"
              >
                {sidebarOpen ? <FaChevronLeft size={20} /> : <FaChevronRight size={20} />}
              </button>
            </div>
            
            {/* Contenido del sidebar */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* Enlaces de navegación principales */}
              <div className="mb-6">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  
                  return shouldShowNavItem(item.role) && (
                    <Link 
                      key={`sidebar-nav-${item.href}-${index}`}
                      href={item.href} 
                      className={`flex items-center px-4 py-3 ${
                        isActive ? 'bg-dark text-primary' : 'text-light hover:bg-dark hover:text-primary'
                      } transition-all duration-200 ${sidebarOpen ? '' : 'justify-center'} cursor-pointer hover:text-primary`}
                      onMouseEnter={(e) => {
                        const iconElement = e.currentTarget.querySelector('svg');
                        if (iconElement) iconElement.style.color = '#FFD700';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          const iconElement = e.currentTarget.querySelector('svg');
                          if (iconElement) iconElement.style.color = '#FFFFFF';
                        }
                      }}
                    >
                      <span className="flex-shrink-0">
                        {isActive ? React.cloneElement(item.icon, { color: '#FFD700' }) : 
                                   React.cloneElement(item.icon, { color: '#FFFFFF' })}
                      </span>
                      {sidebarOpen && <span className="ml-3">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
              
              {/* Divisor */}
              {shouldShowNavItem('admin') && (
                <div className="h-px bg-dark mx-4 my-6"></div>
              )}
              
              {/* Secciones de configuración (visibles en todas las páginas administrativas) */}
              {shouldShowNavItem('admin') && (
                <div className="mb-6">
                  {configItems.map((item, index) => {
                    const isActive = activeSection === item.id;
                    
                    return shouldShowNavItem(item.role) && (
                      isConfigPage ? (
                        <button 
                          key={`sidebar-config-${item.id}-${index}`}
                          onClick={() => handleConfigClick(item.id)}
                          className={`flex items-center w-full text-left px-4 py-3 ${
                            isActive ? 'bg-dark text-primary' : 'text-light hover:bg-dark hover:text-primary'
                          } transition-all duration-200 ${sidebarOpen ? '' : 'justify-center'} cursor-pointer`}
                          onMouseEnter={(e) => {
                            const iconElement = e.currentTarget.querySelector('svg');
                            if (iconElement) iconElement.style.color = '#FFD700';
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              const iconElement = e.currentTarget.querySelector('svg');
                              if (iconElement) iconElement.style.color = '#FFFFFF';
                            }
                          }}
                        >
                          <span className="flex-shrink-0">
                            {isActive ? React.cloneElement(item.icon, { color: '#FFD700' }) : 
                                       React.cloneElement(item.icon, { color: '#FFFFFF' })}
                          </span>
                          {sidebarOpen && <span className="ml-3">{item.label}</span>}
                        </button>
                      ) : (
                        <Link 
                          key={`sidebar-config-${item.id}-${index}`}
                          href={`/admin?section=${item.id}`} 
                          className={`flex items-center px-4 py-3 text-light hover:bg-dark hover:text-primary transition-all duration-200 ${sidebarOpen ? '' : 'justify-center'} cursor-pointer`}
                          onMouseEnter={(e) => {
                            const iconElement = e.currentTarget.querySelector('svg');
                            if (iconElement) iconElement.style.color = '#FFD700';
                          }}
                          onMouseLeave={(e) => {
                            const iconElement = e.currentTarget.querySelector('svg');
                            if (iconElement) iconElement.style.color = '#FFFFFF';
                          }}
                        >
                          <span className="flex-shrink-0">
                            {React.cloneElement(item.icon, { color: '#FFFFFF' })}
                          </span>
                          {sidebarOpen && <span className="ml-3">{item.label}</span>}
                        </Link>
                      )
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Footer del sidebar */}
            <div className="p-4 border-t border-dark">
              <button 
                onClick={handleSignOut}
                className={`flex items-center text-light hover:text-primary p-2 rounded transition-all duration-200 ${sidebarOpen ? '' : 'justify-center w-full'} cursor-pointer`}
                onMouseEnter={(e) => {
                  const iconElement = e.currentTarget.querySelector('svg');
                  if (iconElement) iconElement.style.color = '#FFD700';
                }}
                onMouseLeave={(e) => {
                  const iconElement = e.currentTarget.querySelector('svg');
                  if (iconElement) iconElement.style.color = '#FFFFFF';
                }}
              >
                <FaSignOutAlt color="#FFFFFF" size={20} />
                {sidebarOpen && <span className="ml-3">Déconnexion</span>}
              </button>
            </div>
          </div>
        </div>
        
        {/* Contenedor principal con margen para la barra lateral */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}></div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 bottom-0 z-30 md:hidden bg-secondary overflow-hidden"
          >
            <div className="flex flex-col pt-20 pb-10 px-4 h-full">
              {/* Contenedor scrollable con grid */}
              <div className="overflow-y-auto flex-1 pb-4 scrollbar-thin scrollbar-thumb-primary scrollbar-track-dark">
                {/* Grid de navegación para móvil */}
                <div className="grid grid-cols-2 gap-3 pb-4">
                  {/* Elementos de navegación principales */}
                  {navItems.map((item, index) => (
                    shouldShowNavItem(item.role) && (
                      <Link 
                        key={`mobile-nav-${item.href}-${index}`}
                        href={item.href} 
                        className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 ${
                          pathname === item.href 
                            ? 'bg-dark text-primary border-2 border-primary' 
                            : 'bg-dark/50 text-light hover:bg-dark hover:text-primary'
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </Link>
                    )
                  ))}
                  
                  {/* Elementos de configuración */}
                  {shouldShowNavItem('admin') && (
                    <>
                      {configItems.map((item, index) => (
                        shouldShowNavItem(item.role) && (
                          isConfigPage ? (
                            <button 
                              key={`mobile-config-${item.id}-${index}`}
                              onClick={() => {
                                handleConfigClick(item.id);
                                setIsOpen(false);
                              }}
                              className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-300 ${
                                activeSection === item.id 
                                  ? 'bg-dark text-primary border-2 border-primary' 
                                  : 'bg-dark/50 text-light hover:bg-dark hover:text-primary'
                              }`}
                            >
                              <div className="text-center">
                                <div className="flex justify-center mb-2">
                                  {item.icon}
                                </div>
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                            </button>
                          ) : (
                            <Link 
                              key={`mobile-config-${item.id}-${index}`}
                              href={`/admin?section=${item.id}`}
                              className="flex flex-col items-center justify-center p-4 rounded-lg bg-dark/50 text-light hover:bg-dark hover:text-primary transition-all duration-300"
                              onClick={() => setIsOpen(false)}
                            >
                              <div className="text-center">
                                <div className="flex justify-center mb-2">
                                  {item.icon}
                                </div>
                                <span className="text-sm font-medium">{item.label}</span>
                              </div>
                            </Link>
                          )
                        )
                      ))}
                    </>
                  )}
                </div>
              </div>
              
              {/* Botón de cierre de sesión */}
              <div className="mt-4 px-2">
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