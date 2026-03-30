'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { type IconType } from 'react-icons';
import {
  FaBars,
  FaBuilding,
  FaCalendarAlt,
  FaChartBar,
  FaCogs,
  FaHome,
  FaImages,
  FaShoppingBag,
  FaSignOutAlt,
  FaTools,
  FaUserCog,
  FaUserTie,
  FaUsers,
} from 'react-icons/fa';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronDown, ChevronRight, Pin, PinOff, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdminAccess } from '@/components/admin/AdminAccessProvider';
import { canAccessModule } from '@/lib/permissions/helpers';
import { MODULE_VIEW_PERMISSIONS, type StaffRole } from '@/lib/permissions/catalog';
import { canAccessAdminPath } from '@/lib/permissions/routing';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Tipo para las secciones de configuración
type ConfigSection = 'services' | 'gallery' | 'stylists' | 'locations' | 'hero' | null;
type ConfigSectionKey = Exclude<ConfigSection, null>;

type RouteMenuItem = {
  id: string;
  type: 'route';
  href: string;
  label: string;
  icon: IconType;
  role: 'admin' | 'all';
};

type ConfigMenuItem = {
  id: string;
  type: 'config';
  section: ConfigSectionKey;
  label: string;
  icon: IconType;
  role: 'admin' | 'all';
};

type SidebarMenuItem = RouteMenuItem | ConfigMenuItem;

type SidebarGroup = {
  id: string;
  label: string;
  role: 'admin' | 'all';
  items: SidebarMenuItem[];
};

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    id: 'operations',
    label: 'Opérations',
    role: 'all',
    items: [
      {
        id: 'home',
        type: 'route',
        href: '/admin/home',
        label: "Page d'accueil",
        icon: FaHome,
        role: 'all',
      },
      {
        id: 'reservations',
        type: 'route',
        href: '/admin/reservations',
        label: 'Réservations',
        icon: FaCalendarAlt,
        role: 'all',
      },
      {
        id: 'clients',
        type: 'route',
        href: '/admin/crm',
        label: 'Clients',
        icon: FaUsers,
        role: 'all',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analyses',
    role: 'admin',
    items: [
      {
        id: 'stylist-stats',
        type: 'route',
        href: '/admin/stylist-stats',
        label: 'Stats stylistes',
        icon: FaChartBar,
        role: 'admin',
      },
      {
        id: 'location-stats',
        type: 'route',
        href: '/admin/location-stats',
        label: 'Stats centres',
        icon: FaChartBar,
        role: 'admin',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    role: 'admin',
    items: [
      {
        id: 'services',
        type: 'config',
        section: 'services',
        label: 'Services',
        icon: FaTools,
        role: 'admin',
      },
      {
        id: 'gallery',
        type: 'config',
        section: 'gallery',
        label: 'Galerie',
        icon: FaImages,
        role: 'admin',
      },
      {
        id: 'stylists',
        type: 'config',
        section: 'stylists',
        label: 'Stylistes',
        icon: FaUserTie,
        role: 'admin',
      },
      {
        id: 'locations',
        type: 'config',
        section: 'locations',
        label: 'Centres',
        icon: FaBuilding,
        role: 'admin',
      },
      {
        id: 'hero',
        type: 'config',
        section: 'hero',
        label: "Page d'accueil site",
        icon: FaCogs,
        role: 'admin',
      },
      {
        id: 'boutique',
        type: 'route',
        href: '/admin/boutique',
        label: 'Boutique',
        icon: FaShoppingBag,
        role: 'admin',
      },
    ],
  },
  {
    id: 'systeme',
    label: 'Système',
    role: 'all',
    items: [
      {
        id: 'users',
        type: 'route',
        href: '/admin/user-management',
        label: 'Utilisateurs',
        icon: FaUserCog,
        role: 'admin',
      },
    ],
  },
];

export default function AdminNav({
  activeSection,
  setActiveSection,
}: {
  activeSection?: ConfigSection;
  setActiveSection?: (section: ConfigSection) => void;
}) {
  const { accessContext, isLoading } = useAdminAccess();
  const [isOpen, setIsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [desktopHoverEnabled, setDesktopHoverEnabled] = useState(false);
  const [desktopTapEnabled, setDesktopTapEnabled] = useState(false);
  const [groupOpenState, setGroupOpenState] = useState<Record<string, boolean>>({});
  const closeSidebarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const isDesktopExpanded = sidebarPinned || sidebarOpen;
  const userRole: StaffRole | null = accessContext?.role ?? null;

  const isConfigPage = pathname === '/admin' && setActiveSection !== undefined;

  const canAccessItem = useCallback(
    (item: SidebarMenuItem) => {
      if (!accessContext) return false;
      if (accessContext.role === 'admin') return true;

      if (item.type === 'config') {
        return canAccessAdminPath(accessContext, '/admin', item.section);
      }

      if (item.href.startsWith('/admin/stylist-stats') || item.href.startsWith('/admin/location-stats')) {
        return canAccessModule(accessContext, MODULE_VIEW_PERMISSIONS.stylist_stats);
      }

      if (item.href === '/admin/user-management' || item.href === '/admin/webhook-diagnostics') {
        return false;
      }

      return canAccessAdminPath(accessContext, item.href, null);
    },
    [accessContext]
  );

  const visibleGroups = useMemo(() => {
    return SIDEBAR_GROUPS
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => canAccessItem(item)),
      }))
      .filter((group) => group.items.length > 0);
  }, [canAccessItem]);

  const visibleGroupIds = useMemo(() => visibleGroups.map((group) => group.id), [visibleGroups]);

  const allVisibleItems = useMemo(
    () => visibleGroups.flatMap((group) => group.items),
    [visibleGroups]
  );

  const groupStorageKey = useMemo(() => {
    if (!userRole) return null;
    return `admin-nav:groups:v1:${userRole}`;
  }, [userRole]);

  // Comprobar el tamaño de la pantalla al iniciar
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Activar hover-to-open solo en dispositivos con puntero fino
  useEffect(() => {
    const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const desktopQuery = window.matchMedia('(min-width: 768px)');
    const updateHoverCapability = () => {
      const isDesktopViewport = desktopQuery.matches;
      const canHover = hoverQuery.matches;

      setDesktopHoverEnabled(isDesktopViewport && canHover);
      setDesktopTapEnabled(isDesktopViewport && !canHover);

      if (!isDesktopViewport || !canHover) {
        setSidebarOpen(false);
      }
    };

    updateHoverCapability();
    hoverQuery.addEventListener('change', updateHoverCapability);
    desktopQuery.addEventListener('change', updateHoverCapability);

    return () => {
      hoverQuery.removeEventListener('change', updateHoverCapability);
      desktopQuery.removeEventListener('change', updateHoverCapability);
    };
  }, []);

  // Cerrar la barra lateral al hacer clic fuera de ella (solo desktop)
  useEffect(() => {
    if (!sidebarOpen || sidebarPinned || desktopTapEnabled) return;

    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('desktop-sidebar');
      const target = event.target as Element;

      if (
        (sidebar && sidebar.contains(target)) ||
        target.closest('button')?.getAttribute('data-toggle-sidebar') === 'true'
      ) {
        return;
      }

      setSidebarOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebarOpen, sidebarPinned, desktopTapEnabled]);

  useEffect(() => {
    return () => {
      if (closeSidebarTimerRef.current) {
        clearTimeout(closeSidebarTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!groupStorageKey) {
      setGroupOpenState({});
      return;
    }

    const defaults = visibleGroupIds.reduce<Record<string, boolean>>((acc, groupId) => {
      acc[groupId] = true;
      return acc;
    }, {});

    try {
      const rawValue = window.localStorage.getItem(groupStorageKey);
      if (!rawValue) {
        setGroupOpenState(defaults);
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      const merged = { ...defaults };

      visibleGroupIds.forEach((groupId) => {
        if (typeof parsed?.[groupId] === 'boolean') {
          merged[groupId] = parsed[groupId] as boolean;
        }
      });

      setGroupOpenState(merged);
    } catch (storageError) {
      console.warn('admin_nav_group_state_parse_error', storageError);
      setGroupOpenState(defaults);
    }
  }, [groupStorageKey, visibleGroupIds]);

  useEffect(() => {
    if (!groupStorageKey || visibleGroupIds.length === 0) return;

    const normalizedState = visibleGroupIds.reduce<Record<string, boolean>>((acc, groupId) => {
      acc[groupId] = groupOpenState[groupId] !== false;
      return acc;
    }, {});

    window.localStorage.setItem(groupStorageKey, JSON.stringify(normalizedState));
  }, [groupOpenState, groupStorageKey, visibleGroupIds]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };

  // Función para manejar clic en una sección de configuración
  const handleConfigClick = (section: ConfigSection) => {
    if (setActiveSection) {
      setActiveSection(section);
    }
  };

  const openDesktopSidebar = () => {
    if (!desktopHoverEnabled || sidebarPinned) return;
    if (closeSidebarTimerRef.current) {
      clearTimeout(closeSidebarTimerRef.current);
      closeSidebarTimerRef.current = null;
    }
    setSidebarOpen(true);
  };

  const closeDesktopSidebar = () => {
    if (!desktopHoverEnabled || sidebarPinned) return;
    if (closeSidebarTimerRef.current) {
      clearTimeout(closeSidebarTimerRef.current);
    }
    closeSidebarTimerRef.current = setTimeout(() => {
      setSidebarOpen(false);
    }, 120);
  };

  const toggleSidebarPinned = () => {
    if (closeSidebarTimerRef.current) {
      clearTimeout(closeSidebarTimerRef.current);
      closeSidebarTimerRef.current = null;
    }

    setSidebarPinned((prev) => {
      const next = !prev;

      if (next) {
        setSidebarOpen(true);
      } else if (desktopHoverEnabled) {
        setSidebarOpen(false);
      }

      return next;
    });
  };

  const toggleDesktopSidebarByTouch = () => {
    if (!desktopTapEnabled || sidebarPinned) return;

    if (closeSidebarTimerRef.current) {
      clearTimeout(closeSidebarTimerRef.current);
      closeSidebarTimerRef.current = null;
    }

    setSidebarOpen((prev) => !prev);
  };

  const getDesktopItemClass = (isActive: boolean) =>
    cn(
      'h-11 w-full rounded-none border-0 px-4 text-sm font-medium shadow-none',
      isDesktopExpanded ? 'justify-start gap-3' : 'justify-center px-2',
      isActive
        ? 'bg-[var(--admin-sidebar-active)] text-white hover:bg-[var(--admin-sidebar-active)] hover:text-white'
        : 'text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white'
    );

  const getMobileItemClass = (isActive: boolean) =>
    cn(
      buttonVariants({ variant: 'secondary' }),
      'h-auto min-h-24 flex-col gap-2 rounded-xl border px-3 py-4 text-center',
      isActive
        ? 'border-primary/70 bg-[var(--admin-sidebar-active)] text-white hover:bg-[var(--admin-sidebar-active)]'
        : 'border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-surface)] text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white'
    );

  const isGroupOpen = useCallback(
    (groupId: string) => groupOpenState[groupId] !== false,
    [groupOpenState]
  );

  const toggleGroup = useCallback((groupId: string) => {
    setGroupOpenState((current) => ({
      ...current,
      [groupId]: !(current[groupId] !== false),
    }));
  }, []);

  const isRouteActive = useCallback(
    (href: string) => {
      if (href === '/admin/home') return pathname === '/admin/home';
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const isItemActive = useCallback(
    (item: SidebarMenuItem) => {
      if (item.type === 'route') {
        return isRouteActive(item.href);
      }
      return Boolean(isConfigPage && activeSection === item.section);
    },
    [activeSection, isConfigPage, isRouteActive]
  );

  // Si está cargando, mostrar un indicador
  if (isLoading) {
    return (
      <nav className="bg-background p-4 shadow-sm">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 rounded-full animate-spin-custom" />
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Barra de navegación superior (solo visible en móvil) */}
      <nav className="fixed z-40 w-full border-b border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)] md:hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            <Link href="/" className="z-50 py-1 transition-transform hover:scale-105">
              <Image
                src="/logo.png"
                alt="Steel & Blade Logo"
                width={44}
                height={12}
                className="h-auto"
                priority
              />
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="z-50 text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
              onClick={() => setIsOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <FaBars className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Espacio para compensar el navbar fijo en móvil */}
      <div className="h-[60px] md:hidden" />

      {/* Sidebar para versión de escritorio */}
      <div className="hidden md:block">
        {desktopTapEnabled && sidebarOpen && !sidebarPinned && (
          <button
            type="button"
            className="fixed inset-0 z-[180] bg-transparent"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer la barre latérale"
          />
        )}

        <div
          id="desktop-sidebar"
          className={cn(
            'fixed left-0 top-0 z-[190] h-full bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)] transition-all duration-300',
            isDesktopExpanded ? 'w-64' : 'w-20'
          )}
          onMouseEnter={openDesktopSidebar}
          onMouseLeave={closeDesktopSidebar}
        >
          <Card className="flex h-full flex-col rounded-none border-y-0 border-l-0 border-r border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)] shadow-none backdrop-blur-none">
            <CardHeader className="space-y-0 p-0">
              <div
                className={cn(
                  "flex items-center p-4",
                  isDesktopExpanded ? "justify-between" : "justify-center"
                )}
              >
                {isDesktopExpanded ? (
                  desktopTapEnabled && !sidebarPinned ? (
                    <button
                      type="button"
                      onClick={toggleDesktopSidebarByTouch}
                      className="flex items-center rounded-md transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Réduire la barre latérale"
                    >
                      <Image
                        src="/logo.png"
                        alt="Steel & Blade Logo"
                        width={56}
                        height={14}
                        className="h-auto"
                        priority
                      />
                    </button>
                  ) : (
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
                  )
                ) : (
                  desktopTapEnabled && !sidebarPinned ? (
                    <button
                      type="button"
                      onClick={toggleDesktopSidebarByTouch}
                      className="flex items-center justify-center rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Ouvrir la barre latérale"
                    >
                      <Image
                        src="/logo.png"
                        alt="Steel & Blade Logo"
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain"
                        priority
                      />
                    </button>
                  ) : (
                    <Link href="/" className="flex items-center justify-center transition-transform hover:scale-110">
                      <Image
                        src="/logo.png"
                        alt="Steel & Blade Logo"
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain"
                        priority
                      />
                    </Link>
                  )
                )}

                {isDesktopExpanded && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSidebarPinned();
                    }}
                    className={cn(
                      'text-[var(--admin-sidebar-muted)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white',
                      sidebarPinned && 'bg-[var(--admin-sidebar-hover)] text-white'
                    )}
                    data-toggle-sidebar="true"
                    aria-label={
                      sidebarPinned
                        ? 'Désépingler la barre latérale'
                        : 'Épingler la barre latérale'
                    }
                  >
                    {sidebarPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardHeader>

            <Separator className="bg-[var(--admin-sidebar-border)]" />

            <CardContent className="flex-1 overflow-x-hidden overflow-y-auto p-0 py-4">
              {isDesktopExpanded ? (
                <div className="space-y-4 px-2">
                  {visibleGroups.map((group) => {
                    const groupExpanded = isGroupOpen(group.id);

                    return (
                      <div key={`desktop-group-${group.id}`} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-sidebar-muted)] hover:text-white"
                        >
                          <span>{group.label}</span>
                          {groupExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>

                        {groupExpanded ? (
                          <div>
                            {group.items.map((item) => {
                              const isActive = isItemActive(item);
                              const Icon = item.icon;

                              if (item.type === 'config' && isConfigPage) {
                                return (
                                  <Button
                                    key={`sidebar-item-${group.id}-${item.id}`}
                                    type="button"
                                    variant="ghost"
                                    className={getDesktopItemClass(isActive)}
                                    onClick={() => handleConfigClick(item.section)}
                                  >
                                    <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[var(--admin-sidebar-text)]')} />
                                    <span>{item.label}</span>
                                  </Button>
                                );
                              }

                              const href = item.type === 'route' ? item.href : `/admin?section=${item.section}`;

                              return (
                                <Button
                                  key={`sidebar-item-${group.id}-${item.id}`}
                                  asChild
                                  variant="ghost"
                                  className={getDesktopItemClass(isActive)}
                                >
                                  <Link href={href}>
                                    <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[var(--admin-sidebar-text)]')} />
                                    <span>{item.label}</span>
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {allVisibleItems.map((item) => {
                    const isActive = isItemActive(item);
                    const Icon = item.icon;

                    if (item.type === 'config' && isConfigPage) {
                      return (
                        <Button
                          key={`sidebar-collapsed-${item.id}`}
                          type="button"
                          variant="ghost"
                          className={getDesktopItemClass(isActive)}
                          onClick={() => handleConfigClick(item.section)}
                        >
                          <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[var(--admin-sidebar-text)]')} />
                        </Button>
                      );
                    }

                    const href = item.type === 'route' ? item.href : `/admin?section=${item.section}`;

                    return (
                      <Button
                        key={`sidebar-collapsed-${item.id}`}
                        asChild
                        variant="ghost"
                        className={getDesktopItemClass(isActive)}
                      >
                        <Link href={href}>
                          <Icon className={cn('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[var(--admin-sidebar-text)]')} />
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}
            </CardContent>

            <Separator className="bg-[var(--admin-sidebar-border)]" />

            <CardFooter className="p-4 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSignOut}
                className={cn(
                  'h-10 w-full text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white',
                  isDesktopExpanded ? 'justify-start gap-3 px-2' : 'justify-center'
                )}
              >
                <FaSignOutAlt className="h-4 w-4" />
                {isDesktopExpanded && <span>Déconnexion</span>}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Contenedor principal con margen para la barra lateral */}
        <div className={cn('transition-all duration-300', isDesktopExpanded ? 'ml-64' : 'ml-20')} />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[220] bg-black/45 md:hidden" />
          <DialogPrimitive.Content className="admin-scope fixed inset-y-0 right-0 z-[230] h-[100dvh] w-[min(92vw,24rem)] border-l border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)] shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-right-full md:hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Menu administrateur</DialogTitle>
              <DialogDescription>Navigation mobile de l&apos;espace admin.</DialogDescription>
            </DialogHeader>

            <Card className="flex h-full min-h-0 flex-col rounded-none border-0 bg-[var(--admin-sidebar-bg)] text-[var(--admin-sidebar-text)] shadow-none backdrop-blur-none">
              <CardHeader className="space-y-0 p-0 pt-[max(env(safe-area-inset-top),1rem)]">
                <div className="flex items-center justify-end px-4 py-3">
                  <DialogPrimitive.Close asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-xl border border-[var(--admin-sidebar-border)] text-[var(--admin-sidebar-text)] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.45)] hover:bg-[var(--admin-sidebar-hover)] hover:text-white"
                      aria-label="Fermer le menu"
                    >
                      <X className="h-6 w-6" strokeWidth={2.4} />
                    </Button>
                  </DialogPrimitive.Close>
                </div>
              </CardHeader>

              <Separator className="bg-[var(--admin-sidebar-border)]" />

              <CardContent className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-4 pt-4">
                <div className="space-y-4 pb-3">
                  {visibleGroups.map((group) => {
                    const groupExpanded = isGroupOpen(group.id);

                    return (
                      <section key={`mobile-group-${group.id}`} className="space-y-2">
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="flex w-full items-center justify-between rounded-xl border border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-surface)] px-3 py-2 text-left text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-sidebar-hover)]"
                        >
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--admin-sidebar-text)]">
                            {group.label}
                          </span>
                          {groupExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>

                        {groupExpanded ? (
                          <div className="grid grid-cols-2 gap-3">
                            {group.items.map((item) => {
                              const isActive = isItemActive(item);
                              const Icon = item.icon;

                              if (item.type === 'config' && isConfigPage) {
                                return (
                                  <Button
                                    key={`mobile-item-${group.id}-${item.id}`}
                                    type="button"
                                    variant="secondary"
                                    className={getMobileItemClass(isActive)}
                                    onClick={() => {
                                      handleConfigClick(item.section);
                                      setIsOpen(false);
                                    }}
                                  >
                                    <Icon className="h-6 w-6" />
                                    <span className="text-sm font-semibold">{item.label}</span>
                                  </Button>
                                );
                              }

                              const href = item.type === 'route' ? item.href : `/admin?section=${item.section}`;

                              return (
                                <Button
                                  key={`mobile-item-${group.id}-${item.id}`}
                                  asChild
                                  variant="secondary"
                                  className={getMobileItemClass(isActive)}
                                >
                                  <Link href={href} onClick={() => setIsOpen(false)}>
                                    <Icon className="h-6 w-6" />
                                    <span className="text-sm font-semibold">{item.label}</span>
                                  </Link>
                                </Button>
                              );
                            })}
                          </div>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              </CardContent>

              <Separator className="bg-[var(--admin-sidebar-border)]" />

              <CardFooter className="bg-[var(--admin-sidebar-bg)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                <Button
                  type="button"
                  onClick={async () => {
                    setIsOpen(false);
                    await handleSignOut();
                  }}
                  className="w-full gap-2 rounded-full text-base"
                >
                  <FaSignOutAlt className="h-5 w-5" />
                  Déconnexion
                </Button>
              </CardFooter>
            </Card>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  );
}
