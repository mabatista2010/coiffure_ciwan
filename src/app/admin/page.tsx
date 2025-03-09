'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Service, GalleryImage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import Link from 'next/link';
import { FaImages, FaUserTie, FaBuilding, FaTools, FaSignOutAlt, FaBars, FaTimes, FaCogs } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import StylistManagement from './stylist-management';
import LocationManagement from './location-management';

// Definir la interfaz Location
interface Location {
  id: string;
  name: string;
  address: string;
  active: boolean;
  phone?: string;
  email?: string;
  // Utilizamos Record para evitar any
  [key: string]: string | boolean | number | string[] | undefined | Record<string, unknown>;
}

export default function AdminPage() {
  // Estado para servicios
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState<Partial<Service>>({
    nombre: '',
    descripcion: '',
    precio: 0,
    imagen_url: '',
  });
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string>('');
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  
  // Estado para galería
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    descripcion: '',
    imagen_url: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryImagePreview, setGalleryImagePreview] = useState<string>('');
  const [showGalleryForm, setShowGalleryForm] = useState(false);
  const [editingGalleryId, setEditingGalleryId] = useState<number | null>(null);

  // Estado para configuraciones
  const [heroDesktopImage, setHeroDesktopImage] = useState('');
  const [heroMobileImage, setHeroMobileImage] = useState('');
  const [heroDesktopFile, setHeroDesktopFile] = useState<File | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string>('');
  const [heroMobilePreview, setHeroMobilePreview] = useState<string>('');
  
  // Estado para locations (necesario para el componente StylistManagement)
  const [locations, setLocations] = useState<Location[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Referencias para los inputs de fichero
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para navegación móvil
  const [isOpen, setIsOpen] = useState(false);
  
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
  
  // Estado para la sección activa
  const [activeSection, setActiveSection] = useState<string>('services');
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin';
  };
  
  // Estado pour indiquer le chargement
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar servicios
      const { data: servicesData, error: servicesError } = await supabase
        .from('servicios')
        .select('*')
        .order('id');
        
      if (servicesError) {
        throw servicesError;
      }
      
      if (servicesData) {
        setServices(servicesData);
      }
      
      // Cargar imágenes de la galería
      const { data: galleryData, error: galleryError } = await supabase
        .from('imagenes_galeria')
        .select('*')
        .order('id', { ascending: false });
        
      if (galleryError) {
        throw galleryError;
      }
      
      if (galleryData) {
        setGalleryImages(galleryData);
      }
      
      // Cargar configuraciones
      const { data: configData, error: configError } = await supabase
        .from('configuracion')
        .select('*');
        
      if (configError) {
        throw configError;
      }
      
      if (configData && configData.length > 0) {
        const heroDesktop = configData.find(c => c.clave === 'hero_image_desktop');
        const heroMobile = configData.find(c => c.clave === 'hero_image_mobile');
        
        if (heroDesktop && heroDesktop.valor) {
          setHeroDesktopImage(heroDesktop.valor);
          setHeroDesktopPreview(heroDesktop.valor);
        }
        
        if (heroMobile && heroMobile.valor) {
          setHeroMobileImage(heroMobile.valor);
          setHeroMobilePreview(heroMobile.valor);
        }
      }
      
      // Cargar locations para el componente StylistManagement
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true);
        
      if (locationsError) {
        throw locationsError;
      }
      
      if (locationsData) {
        setLocations(locationsData);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al cargar datos');
    }
  };

  // Fonction pour gérer la sélection de fichiers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fonction pour télécharger un fichier à Supabase Storage
  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    if (!file) return null;
    
    setIsUploading(true);
    try {
      // Générer un nom unique pour le fichier
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      console.log(`Tentative de téléchargement de fichier dans le bucket: "${bucket}", chemin: "${filePath}"`);
      
      // Verificar la sesión antes de subir
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión de nuevo.');
      }
      
      // Télécharger le fichier à Supabase Storage con upsert: true para evitar problemas de RLS
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });
      
      if (error) {
        console.error('Erreur détaillée de Supabase:', error);
        throw error;
      }
      
      console.log('Fichier téléchargé avec succès:', data);
      
      // Obtenir l'URL publique du fichier
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      console.log('URL publique générée:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (err: Error | unknown) {
      console.error('Erreur lors du téléchargement du fichier:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al subir el archivo');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imageUrl = newService.imagen_url;
      
      if (serviceImageFile) {
        setIsUploading(true);
        try {
          const { data, error } = await supabase.storage
            .from('fotos_peluqueria')
            .upload(`servicios/${uuidv4()}`, serviceImageFile);
          
          if (error) throw error;
          
          if (data) {
            const { data: publicUrlData } = supabase.storage
              .from('fotos_peluqueria')
              .getPublicUrl(data.path);
              
            imageUrl = publicUrlData.publicUrl;
          }
        } catch (uploadError) {
          console.error('Error al subir imagen:', uploadError);
          setErrorMessage('Error al subir la imagen del servicio');
          setIsUploading(false);
          return;
        }
      }
      
      // Crear o actualizar servicio
      if (editingServiceId) {
        // Actualizar servicio existente
        const { error } = await supabase
          .from('servicios')
          .update({
            nombre: newService.nombre,
            descripcion: newService.descripcion,
            precio: newService.precio,
            imagen_url: imageUrl
          })
          .eq('id', editingServiceId);
          
        if (error) throw error;
      } else {
        // Crear nuevo servicio
        const { error } = await supabase
          .from('servicios')
          .insert([{
            nombre: newService.nombre,
            descripcion: newService.descripcion,
            precio: newService.precio,
            imagen_url: imageUrl
          }]);
          
        if (error) throw error;
      }
      
      // Reiniciar formulario
      setNewService({
        nombre: '',
        descripcion: '',
        precio: 0,
        imagen_url: ''
      });
      
      setServiceImageFile(null);
      setServiceImagePreview('');
      if (serviceImageInputRef.current) {
        serviceImageInputRef.current.value = '';
      }
      
      setShowServiceForm(false);
      setEditingServiceId(null);
      setIsUploading(false);
      
      // Recargar servicios
      loadData();
    } catch (error) {
      console.error('Error al guardar servicio:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al guardar el servicio');
      setIsUploading(false);
    }
  };

  // Añadir función para editar un servicio
  const handleEditService = (service: Service) => {
    setNewService({
      nombre: service.nombre,
      descripcion: service.descripcion,
      precio: service.precio,
      imagen_url: service.imagen_url,
    });
    setServiceImagePreview(service.imagen_url || '');
    setEditingServiceId(service.id);
    setShowServiceForm(true);
    
    // Desplazar automáticamente hacia la parte superior con animación suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Modificar función para cancelar
  const cancelServiceForm = () => {
    setNewService({
      nombre: '',
      descripcion: '',
      precio: 0,
      imagen_url: '',
    });
    setServiceImageFile(null);
    setServiceImagePreview('');
    setShowServiceForm(false);
    setEditingServiceId(null);
    if (serviceImageInputRef.current) {
      serviceImageInputRef.current.value = '';
    }
  };

  const handleDeleteService = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      try {
        const { error } = await supabase
          .from('servicios')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        loadData();
      } catch (error: Error | unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        console.error('Erreur lors de la suppression du service:', error);
      }
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imagen_url = newImage.imagen_url;
      
      // Si un fichier est sélectionné, le télécharger d'abord
      if (galleryImageFile) {
        const fileUrl = await uploadFile(galleryImageFile, 'fotos_peluqueria', 'galeria');
        if (fileUrl) {
          imagen_url = fileUrl;
        }
      }
      
      if (editingGalleryId) {
        // Actualizar imagen existente
        const { error } = await supabase
          .from('imagenes_galeria')
          .update({ ...newImage, imagen_url })
          .eq('id', editingGalleryId);
        
        if (error) throw error;
      } else {
        // Crear nueva imagen
        const { error } = await supabase
          .from('imagenes_galeria')
          .insert([{ ...newImage, imagen_url }]);
        
        if (error) throw error;
      }
      
      // Réinitialiser le formulaire
      setNewImage({
        descripcion: '',
        imagen_url: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      setGalleryImageFile(null);
      setGalleryImagePreview('');
      setShowGalleryForm(false);
      setEditingGalleryId(null);
      if (galleryImageInputRef.current) {
        galleryImageInputRef.current.value = '';
      }
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Erreur lors de l\'ajout/modification de l\'image:', error);
    }
  };

  // Añadir función para editar una imagen
  const handleEditImage = (image: GalleryImage) => {
    setNewImage({
      descripcion: image.descripcion,
      imagen_url: image.imagen_url,
      fecha: image.fecha,
    });
    setGalleryImagePreview(image.imagen_url || '');
    setEditingGalleryId(image.id);
    setShowGalleryForm(true);
    
    // Desplazar automáticamente hacia la parte superior con animación suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Función para cancelar la edición/creación de imagen
  const cancelGalleryForm = () => {
    setNewImage({
      descripcion: '',
      imagen_url: '',
      fecha: new Date().toISOString().split('T')[0],
    });
    setGalleryImageFile(null);
    setGalleryImagePreview('');
    setShowGalleryForm(false);
    setEditingGalleryId(null);
    if (galleryImageInputRef.current) {
      galleryImageInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette image ?')) {
      try {
        const { error } = await supabase
          .from('imagenes_galeria')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        loadData();
      } catch (error: Error | unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        console.error('Erreur lors de la suppression de l\'image:', error);
      }
    }
  };

  const updateHeroImage = async (clave: string, file: File | null, currentUrl: string) => {
    try {
      setIsUploading(true);
      let valor = currentUrl;
      
      // Si un fichier est sélectionné, le télécharger d'abord
      if (file) {
        const fileUrl = await uploadFile(file, 'hero_images');
        if (fileUrl) {
          valor = fileUrl;
        } else {
          throw new Error('Impossible de télécharger le fichier');
        }
      }
      
      // Mettre à jour la configuration dans la base de données
      const { error } = await supabase
        .from('configuracion')
        .update({ valor })
        .eq('clave', clave);
      
      if (error) throw error;
      
      // Actualizar los estados locales según la clave
      if (clave === 'hero_image_desktop') {
        setHeroDesktopImage(valor);
        setHeroDesktopPreview(valor);
        if (heroDesktopInputRef.current) {
          heroDesktopInputRef.current.value = '';
        }
        setHeroDesktopFile(null);
      } else if (clave === 'hero_image_mobile') {
        setHeroMobileImage(valor);
        setHeroMobilePreview(valor);
        if (heroMobileInputRef.current) {
          heroMobileInputRef.current.value = '';
        }
        setHeroMobileFile(null);
      }
      
      // Recharger les données
      loadData();
      setIsUploading(false);
      
    } catch (error: Error | unknown) {
      console.error('Erreur complète:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark text-light">
      {/* Barra de navegación superior */}
      <nav className="fixed w-full z-40 bg-secondary text-light">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            {/* Logo / Título */}
            <Link href="/admin" className="text-xl font-bold text-primary z-50">
              Panel Administrativo
            </Link>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => setActiveSection('services')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'services' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaTools className="mr-2" /> Services
              </button>
              
              <button 
                onClick={() => setActiveSection('gallery')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'gallery' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaImages className="mr-2" /> Galerie
              </button>
              
              <button 
                onClick={() => setActiveSection('stylists')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'stylists' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaUserTie className="mr-2" /> Stylistes
              </button>
              
              <button 
                onClick={() => setActiveSection('locations')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'locations' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaBuilding className="mr-2" /> Centres
              </button>
              
              <button 
                onClick={() => setActiveSection('hero')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeSection === 'hero' 
                    ? 'bg-dark text-primary' 
                    : 'text-light hover:bg-dark hover:text-primary'
                } flex items-center transition-colors duration-200`}
              >
                <FaCogs className="mr-2" /> Configuration
              </button>
              
              <Link 
                href="/admin/reservations" 
                className="px-3 py-2 rounded-md text-sm font-medium text-light hover:bg-dark hover:text-primary flex items-center transition-colors duration-200"
              >
                <FaCogs className="mr-2" /> Calendrier
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
                <button 
                  onClick={() => {
                    setActiveSection('services');
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${activeSection === 'services' ? 'text-primary' : 'text-light'}`}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaTools className="mr-3" /> Services
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveSection('gallery');
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${activeSection === 'gallery' ? 'text-primary' : 'text-light'}`}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaImages className="mr-3" /> Galerie
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveSection('stylists');
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${activeSection === 'stylists' ? 'text-primary' : 'text-light'}`}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaUserTie className="mr-3" /> Stylistes
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveSection('locations');
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${activeSection === 'locations' ? 'text-primary' : 'text-light'}`}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaBuilding className="mr-3" /> Centres
                  </div>
                </button>
                
                <button 
                  onClick={() => {
                    setActiveSection('hero');
                    setIsOpen(false);
                  }}
                  className={`block w-full text-left py-3 text-xl font-bold border-b border-dark transition-all duration-300 ${activeSection === 'hero' ? 'text-primary' : 'text-light'}`}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaCogs className="mr-3" /> Configuration
                  </div>
                </button>
                
                <Link 
                  href="/admin/reservations" 
                  className="block py-3 text-xl font-bold border-b border-dark transition-all duration-300 text-light"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center hover:pl-2 transition-all duration-300">
                    <FaCogs className="mr-3" /> Calendrier
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
      
      <div className="container mx-auto px-4 py-8">
        {/* Mensaje de error si existe */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            <span className="block sm:inline">{errorMessage}</span>
            <button 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setErrorMessage('')}
            >
              <span className="text-xl">&times;</span>
            </button>
          </div>
        )}
        
        {/* Contenido según la sección activa */}
        {activeSection === 'services' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-primary">Gestion des Services</h1>
            
            {/* Botón para mostrar/ocultar el formulario */}
            <button 
              onClick={() => {
                if (showServiceForm) {
                  cancelServiceForm();
                } else {
                  setShowServiceForm(true);
                }
              }}
              className="bg-secondary text-light px-6 py-2 rounded-md mb-6 hover:bg-dark hover:text-primary transition-colors border-2 border-primary font-bold"
            >
              {showServiceForm ? 'Cerrar formulario' : 'Agregar Nuevo Servicio'}
            </button>
            
            {/* Formulario condicional */}
            {showServiceForm && (
              <div className="bg-secondary shadow-lg rounded-lg overflow-hidden mb-8">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-primary mb-4">
                    {editingServiceId ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
                  </h2>
                  
                  <form onSubmit={handleAddService} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-light text-sm font-bold mb-2">Nom</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                        value={newService.nombre}
                        onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-light text-sm font-bold mb-2">Precio (€)</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                        value={newService.precio}
                        onChange={(e) => setNewService({ ...newService, precio: Number(e.target.value) })}
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-light text-sm font-bold mb-2">Descripción</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                        rows={2}
                        value={newService.descripcion}
                        onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-light text-sm font-bold mb-2">Imagen del servicio</label>
                      <div className="flex flex-col sm:flex-row gap-4 w-full items-center">
                        <div className="w-full">
                          <div className="w-full flex justify-center sm:justify-start">
                            <input
                              ref={serviceImageInputRef}
                              type="file"
                              accept="image/*"
                              className="w-full max-w-xs sm:max-w-full p-2 rounded text-light bg-dark border border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary"
                              onChange={(e) => handleFileChange(e, setServiceImageFile, setServiceImagePreview)}
                            />
                          </div>
                          <p className="text-sm mt-2 text-gray-400 text-center sm:text-left">
                            Formato recomendado: JPEG o PNG, tamaño máximo 2MB
                          </p>
                        </div>
                        
                        {serviceImagePreview && (
                          <div className="w-24 h-24 relative flex-shrink-0">
                            <Image
                              src={serviceImagePreview}
                              alt="Vista previa"
                              className="rounded object-cover w-full h-full border-2 border-primary"
                              width={96}
                              height={96}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 justify-center sm:justify-start">
                      <button
                        type="submit"
                        className="bg-primary px-6 py-2 rounded font-bold text-secondary hover:bg-yellow-400 transition-colors w-full sm:w-auto"
                        disabled={isUploading}
                      >
                        {isUploading ? 'Subiendo...' : (editingServiceId ? 'Actualizar Servicio' : 'Agregar Servicio')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelServiceForm}
                        className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors w-full sm:w-auto"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Componente principal con la lista de servicios */}
            <div className="bg-secondary shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Liste des Services</h2>
                
                {/* Vista de tarjetas para todas las pantallas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <div key={service.id} className="rounded-lg border border-primary shadow-md hover:shadow-lg transition-all bg-secondary overflow-hidden">
                      {/* Imagen en la parte superior ocupando todo el ancho */}
                      <div className="relative w-full h-48 sm:h-64">
                        {service.imagen_url ? (
                          <Image 
                            src={service.imagen_url} 
                            alt={service.nombre} 
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-dark">
                            <span className="text-4xl sm:text-6xl font-bold text-primary">
                              {service.nombre.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Contenido debajo de la imagen */}
                      <div className="p-5">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-xl font-bold text-primary">{service.nombre}</h3>
                          <p className="text-primary font-bold">{service.precio}€</p>
                        </div>
                        
                        <p className="text-sm text-light mb-2">{service.descripcion}</p>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex border-t border-gray-700">
                        <button
                          onClick={() => handleEditService(service)}
                          className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                        >
                          Modifier
                        </button>
                        <div className="w-px bg-gray-700"></div>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'gallery' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-primary">Gestion de la Galerie</h1>
            
            {/* Botón para mostrar/ocultar el formulario */}
            <button 
              onClick={() => {
                if (showGalleryForm) {
                  cancelGalleryForm();
                } else {
                  setShowGalleryForm(true);
                }
              }}
              className="bg-secondary text-light px-6 py-2 rounded-md mb-6 hover:bg-dark hover:text-primary transition-colors border-2 border-primary font-bold"
            >
              {showGalleryForm ? 'Cerrar formulario' : 'Agregar Nueva Imagen'}
            </button>
            
            {/* Formulario condicional */}
            {showGalleryForm && (
              <div className="bg-secondary shadow-lg rounded-lg overflow-hidden mb-8">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-primary mb-4">
                    {editingGalleryId ? 'Editar Imagen' : 'Agregar Nueva Imagen'}
                  </h2>
                  
                  <form onSubmit={handleAddImage} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-light text-sm font-bold mb-2">Descripción</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                        value={newImage.descripcion}
                        onChange={(e) => setNewImage({ ...newImage, descripcion: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-light text-sm font-bold mb-2">Fecha</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                        value={newImage.fecha}
                        onChange={(e) => setNewImage({ ...newImage, fecha: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-light text-sm font-bold mb-2">Imagen para la galería</label>
                      <div className="flex flex-col sm:flex-row gap-4 w-full items-center">
                        <div className="w-full">
                          <div className="w-full flex justify-center sm:justify-start">
                            <input
                              ref={galleryImageInputRef}
                              type="file"
                              accept="image/*"
                              className="w-full max-w-xs sm:max-w-full p-2 rounded text-light bg-dark border border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary"
                              onChange={(e) => handleFileChange(e, setGalleryImageFile, setGalleryImagePreview)}
                              required={!editingGalleryId}
                            />
                          </div>
                          <p className="text-sm mt-2 text-gray-400 text-center sm:text-left">
                            Formato recomendado: JPEG o PNG, tamaño máximo 2MB
                          </p>
                        </div>
                        
                        {galleryImagePreview && (
                          <div className="w-24 h-24 relative flex-shrink-0">
                            <Image
                              src={galleryImagePreview}
                              alt="Vista previa"
                              className="rounded object-cover w-full h-full border-2 border-primary"
                              width={96}
                              height={96}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 pt-4 justify-center sm:justify-start">
                      <button
                        type="submit"
                        className="bg-primary px-6 py-2 rounded font-bold text-secondary hover:bg-yellow-400 transition-colors w-full sm:w-auto"
                        disabled={isUploading}
                      >
                        {isUploading ? 'Subiendo...' : (editingGalleryId ? 'Actualizar Imagen' : 'Agregar Imagen')}
                      </button>
                      <button
                        type="button"
                        onClick={cancelGalleryForm}
                        className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors w-full sm:w-auto"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Componente principal con galería */}
            <div className="bg-secondary shadow-lg rounded-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Images de la Galerie</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {galleryImages.map((image) => (
                    <div key={image.id} className="rounded-lg border border-primary shadow-md hover:shadow-lg transition-all bg-secondary overflow-hidden">
                      {/* Imagen en la parte superior ocupando todo el ancho */}
                      <div className="relative w-full h-48 sm:h-64">
                        <Image 
                          src={image.imagen_url} 
                          alt={image.descripcion} 
                          fill
                          className="object-cover"
                        />
                      </div>
                      
                      {/* Contenido debajo de la imagen */}
                      <div className="p-4">
                        <h3 className="font-bold text-light mb-1">{image.descripcion}</h3>
                        <p className="text-xs text-gray-400">{new Date(image.fecha).toLocaleDateString('fr-FR')}</p>
                      </div>
                      
                      {/* Botones de acción */}
                      <div className="flex border-t border-gray-700">
                        <button
                          onClick={() => handleEditImage(image)}
                          className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                        >
                          Modifier
                        </button>
                        <div className="w-px bg-gray-700"></div>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeSection === 'stylists' && (
          <StylistManagement 
            services={services} 
            locations={locations}
            onUpdate={loadData}
          />
        )}
        
        {activeSection === 'locations' && (
          <LocationManagement />
        )}
        
        {activeSection === 'hero' && (
          <div className="space-y-8">
            <h1 className="text-3xl font-bold text-primary">Configuración del Hero</h1>
            
            <div className="bg-secondary shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Imágenes del Hero</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image de bureau */}
                  <div className="border border-primary rounded-lg p-4 bg-dark">
                    <h3 className="font-bold text-light mb-2">Imagen para Ordenador</h3>
                    <p className="text-gray-300 mb-4">Esta imagen se mostrará en la versión de escritorio con un desvanecimiento de izquierda a derecha.</p>
                    
                    <div className="mb-4">
                      <label className="block text-light text-sm font-bold mb-2">Seleccionar una imagen</label>
                      <input
                        ref={heroDesktopInputRef}
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                        onChange={(e) => handleFileChange(e, setHeroDesktopFile, setHeroDesktopPreview)}
                      />
                    </div>
                    
                    {heroDesktopPreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-light mb-2">Vista previa:</p>
                        <div className="border rounded-lg overflow-hidden">
                          <Image 
                            src={heroDesktopPreview} 
                            alt="Vista previa de la imagen para ordenador" 
                            width={400}
                            height={200}
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => updateHeroImage('hero_image_desktop', heroDesktopFile, heroDesktopImage)}
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Téléchargement...' : 'Actualizar la Imagen'}
                    </button>
                  </div>
                  
                  {/* Image mobile */}
                  <div className="border border-primary rounded-lg p-4 bg-dark">
                    <h3 className="font-bold text-light mb-2">Imagen para Móvil</h3>
                    <p className="text-gray-300 mb-4">Esta imagen se mostrará en la versión móvil con un desvanecimiento de arriba abajo.</p>
                    
                    <div className="mb-4">
                      <label className="block text-light text-sm font-bold mb-2">Seleccionar una imagen</label>
                      <input
                        ref={heroMobileInputRef}
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-light file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                        onChange={(e) => handleFileChange(e, setHeroMobileFile, setHeroMobilePreview)}
                      />
                    </div>
                    
                    {heroMobilePreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-light mb-2">Vista previa:</p>
                        <div className="border rounded-lg overflow-hidden">
                          <Image 
                            src={heroMobilePreview} 
                            alt="Vista previa de la imagen para móvil" 
                            width={400}
                            height={200}
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => updateHeroImage('hero_image_mobile', heroMobileFile, heroMobileImage)}
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Téléchargement...' : 'Actualizar la Imagen'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 