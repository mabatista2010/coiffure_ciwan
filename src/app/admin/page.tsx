'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Service, GalleryImage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import Link from 'next/link';
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
  
  const [activeTab, setActiveTab] = useState('services');
  
  // Referencias para los inputs de fichero
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Estado pour indiquer le chargement
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Cargar servicios
      const { data: serviciosData, error: serviciosError } = await supabase
        .from('servicios')
        .select('*')
        .order('id');
      
      if (serviciosError) throw serviciosError;
      if (serviciosData) {
        setServices(serviciosData);
      }
      
      // Cargar imágenes de galería
      const { data: imagenesData, error: imagenesError } = await supabase
        .from('imagenes_galeria')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (imagenesError) throw imagenesError;
      if (imagenesData) {
        setGalleryImages(imagenesData);
      }
      
      // Cargar configuración (imágenes hero)
      const { data: configData, error: configError } = await supabase
        .from('configuracion')
        .select('*');
      
      if (configError) throw configError;
      
      if (configData) {
        // Trouver les configurations spécifiques
        const desktopImage = configData.find(c => c.clave === 'hero_image_desktop');
        const mobileImage = configData.find(c => c.clave === 'hero_image_mobile');
        
        if (desktopImage) {
          setHeroDesktopImage(desktopImage.valor);
          setHeroDesktopPreview(desktopImage.valor);
        }
        if (mobileImage) {
          setHeroMobileImage(mobileImage.valor);
          setHeroMobilePreview(mobileImage.valor);
        }
      }
      
      // Cargar centros (necesario para StylistManagement)
      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('*')
        .eq('active', true);
      
      if (locationsError) throw locationsError;
      if (locationsData) {
        setLocations(locationsData);
      }
    } catch (err: Error | unknown) {
      console.error('Error al cargar datos:', err);
      setErrorMessage(err instanceof Error ? err.message : String(err));
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
      let imagen_url = newService.imagen_url;
      
      // Si un fichier est sélectionné, le télécharger d'abord
      if (serviceImageFile) {
        const fileUrl = await uploadFile(serviceImageFile, 'fotos_peluqueria', 'servicios');
        if (fileUrl) {
          imagen_url = fileUrl;
        }
      }
      
      if (editingServiceId) {
        // Actualizar servicio existente
        const { error } = await supabase
          .from('servicios')
          .update({ ...newService, imagen_url })
          .eq('id', editingServiceId);
        
        if (error) throw error;
      } else {
        // Crear nuevo servicio
        const { error } = await supabase
          .from('servicios')
          .insert([{ ...newService, imagen_url }]);
        
        if (error) throw error;
      }
      
      // Réinitialiser le formulaire
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
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Erreur lors de l\'ajout/modification du service:', error);
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
      
      // Recharger les données
      loadData();
      
    } catch (error: Error | unknown) {
      console.error('Erreur complète:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#E76F51' }}>Panneau d&apos;Administration</h1>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto whitespace-nowrap">
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'services' ? 'border-b-2 border-primary' : 'text-gray-500'}`}
            style={{ color: activeTab === 'services' ? '#FFD700' : undefined }}
            onMouseOver={(e) => { if (activeTab !== 'services') e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { if (activeTab !== 'services') e.currentTarget.style.color = '' }}
            onClick={() => setActiveTab('services')}
          >
            Services
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'gallery' ? 'border-b-2 border-primary' : 'text-gray-500'}`}
            style={{ color: activeTab === 'gallery' ? '#FFD700' : undefined }}
            onMouseOver={(e) => { if (activeTab !== 'gallery') e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { if (activeTab !== 'gallery') e.currentTarget.style.color = '' }}
            onClick={() => setActiveTab('gallery')}
          >
            Galerie
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'config' ? 'border-b-2 border-primary' : 'text-gray-500'}`}
            style={{ color: activeTab === 'config' ? '#FFD700' : undefined }}
            onMouseOver={(e) => { if (activeTab !== 'config') e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { if (activeTab !== 'config') e.currentTarget.style.color = '' }}
            onClick={() => setActiveTab('config')}
          >
            Configuration
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'stylists' ? 'border-b-2 border-primary' : 'text-gray-500'}`}
            style={{ color: activeTab === 'stylists' ? '#FFD700' : undefined }}
            onMouseOver={(e) => { if (activeTab !== 'stylists') e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { if (activeTab !== 'stylists') e.currentTarget.style.color = '' }}
            onClick={() => setActiveTab('stylists')}
          >
            Stylistes
          </button>
          <button
            className={`py-2 px-4 font-medium ${activeTab === 'locations' ? 'border-b-2 border-primary' : 'text-gray-500'}`}
            style={{ color: activeTab === 'locations' ? '#FFD700' : undefined }}
            onMouseOver={(e) => { if (activeTab !== 'locations') e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { if (activeTab !== 'locations') e.currentTarget.style.color = '' }}
            onClick={() => setActiveTab('locations')}
          >
            Centres
          </button>
          <Link 
            href="/admin/reservations" 
            className="py-2 px-4 font-medium text-gray-500 flex items-center"
            style={{ transition: 'color 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#FFD700' }}
            onMouseOut={(e) => { e.currentTarget.style.color = '' }}
          >
            <span>Calendrier des Réservations</span>
            <span className="ml-1 text-xs bg-primary text-secondary px-1 rounded">↗</span>
          </Link>
        </div>
      </div>
      
      {/* Sections existantes */}
      {activeTab === 'services' && (
        <>
          {/* Botón para mostrar/ocultar el formulario - ahora fuera del componente blanco */}
          <button 
            onClick={() => {
              if (showServiceForm) {
                cancelServiceForm();
              } else {
                setShowServiceForm(true);
              }
            }}
            className="bg-white text-black px-6 py-2 rounded-md mb-6 hover:bg-yellow-300 transition-colors border-2 border-primary font-bold"
          >
            {showServiceForm ? 'Cerrar formulario' : 'Agregar Nuevo Servicio'}
          </button>
          
          {/* Formulario condicional */}
          {showServiceForm && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-secondary mb-4">
                  {editingServiceId ? 'Editar Servicio' : 'Agregar Nuevo Servicio'}
                </h2>
                
                <form onSubmit={handleAddService} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-dark text-sm font-bold mb-2">Nom</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      value={newService.nombre}
                      onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-text-dark text-sm font-bold mb-2">Precio (€)</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      value={newService.precio}
                      onChange={(e) => setNewService({ ...newService, precio: Number(e.target.value) })}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-text-dark text-sm font-bold mb-2">Descripción</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      rows={2}
                      value={newService.descripcion}
                      onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-text-dark text-sm font-bold mb-2">Imagen del servicio</label>
                    <input
                      ref={serviceImageInputRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                      onChange={(e) => handleFileChange(e, setServiceImageFile, setServiceImagePreview)}
                    />
                    
                    {serviceImagePreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-gray-600 mb-2">Vista previa:</p>
                        <div className="border rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
                          <Image 
                            src={serviceImagePreview} 
                            alt="Vista previa del servicio" 
                            width={300}
                            height={200}
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 flex space-x-2">
                    <button
                      type="submit"
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Subiendo...' : (editingServiceId ? 'Actualizar Servicio' : 'Agregar Servicio')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelServiceForm}
                      className="bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition duration-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Componente principal con la lista de servicios - ahora responsive */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
            <div className="p-6">
              <h2 className="text-xl font-bold text-secondary mb-4">Liste des Services</h2>
              
              {/* Vista de tarjetas para todas las pantallas */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <div key={service.id} className="border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                    {/* Estructura diferente para móvil y escritorio */}
                    <div className="flex flex-col md:flex-col">
                      {/* Imagen adaptada para diferentes tamaños */}
                      {service.imagen_url ? (
                        <>
                          {/* Imagen grande en escritorio, oculta en móvil */}
                          <div className="hidden md:block relative w-full h-48">
                            <Image 
                              src={service.imagen_url} 
                              alt={service.nombre} 
                              fill
                              className="object-cover"
                            />
                          </div>
                          {/* Imagen pequeña en móvil, oculta en escritorio */}
                          <div className="md:hidden flex p-4">
                            <div className="relative h-20 w-20 rounded overflow-hidden mr-3 flex-shrink-0">
                              <Image 
                                src={service.imagen_url} 
                                alt={service.nombre} 
                                width={80} 
                                height={80} 
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg">{service.nombre}</h3>
                              <p className="text-primary font-semibold">{service.precio}€</p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="p-4">
                          <h3 className="font-bold text-lg">{service.nombre}</h3>
                          <p className="text-primary font-semibold">{service.precio}€</p>
                        </div>
                      )}
                      
                      {/* Información del servicio - versión escritorio */}
                      {service.imagen_url && (
                        <div className="hidden md:block p-4 pb-2">
                          <h3 className="font-bold text-lg">{service.nombre}</h3>
                          <p className="text-primary font-semibold">{service.precio}€</p>
                        </div>
                      )}
                      
                      {/* Descripción del servicio */}
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600">{service.descripcion}</p>
                      </div>
                      
                      <div className="flex space-x-2 p-4 mt-auto border-t">
                        <button
                          onClick={() => handleEditService(service)}
                          className="flex-1 text-center py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm hover:bg-blue-200 transition-colors"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="flex-1 text-center py-1 rounded bg-red-100 text-red-700 font-medium text-sm hover:bg-red-200 transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'gallery' && (
        <>
          {/* Botón para mostrar/ocultar el formulario - fuera del componente blanco */}
          <button 
            onClick={() => {
              if (showGalleryForm) {
                cancelGalleryForm();
              } else {
                setShowGalleryForm(true);
              }
            }}
            className="bg-white text-black px-6 py-2 rounded-md mb-6 hover:bg-yellow-300 transition-colors border-2 border-primary font-bold"
          >
            {showGalleryForm ? 'Cerrar formulario' : 'Agregar Nueva Imagen'}
          </button>
          
          {/* Formulario condicional */}
          {showGalleryForm && (
            <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-secondary mb-4">
                  {editingGalleryId ? 'Editar Imagen' : 'Agregar Nueva Imagen'}
                </h2>
                
                <form onSubmit={handleAddImage} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-text-dark text-sm font-bold mb-2">Descripción</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      value={newImage.descripcion}
                      onChange={(e) => setNewImage({ ...newImage, descripcion: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-text-dark text-sm font-bold mb-2">Fecha</label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      value={newImage.fecha}
                      onChange={(e) => setNewImage({ ...newImage, fecha: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-text-dark text-sm font-bold mb-2">Imagen para la galería</label>
                    <input
                      ref={galleryImageInputRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                      onChange={(e) => handleFileChange(e, setGalleryImageFile, setGalleryImagePreview)}
                      required={!editingGalleryId}
                    />
                    
                    {galleryImagePreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-gray-600 mb-2">Vista previa:</p>
                        <div className="border rounded-lg overflow-hidden" style={{ maxWidth: '300px' }}>
                          <Image 
                            src={galleryImagePreview} 
                            alt="Vista previa de la galería" 
                            width={300}
                            height={200}
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="md:col-span-2 flex space-x-2">
                    <button
                      type="submit"
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Subiendo...' : (editingGalleryId ? 'Actualizar Imagen' : 'Agregar Imagen')}
                    </button>
                    <button
                      type="button"
                      onClick={cancelGalleryForm}
                      className="bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition duration-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Componente principal con galería */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-secondary mb-4">Images de la Galerie</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {galleryImages.map((image) => (
                  <div key={image.id} className="border rounded-lg overflow-hidden shadow-sm">
                    <div className="relative h-48 w-full">
                      <Image 
                        src={image.imagen_url} 
                        alt={image.descripcion} 
                        width={400} 
                        height={300} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-gray-700 mb-1">{image.descripcion}</p>
                      <p className="text-xs text-gray-500 mb-2">{new Date(image.fecha).toLocaleDateString('fr-FR')}</p>
                      <div className="flex space-x-2 pt-2 border-t mt-2">
                        <button
                          onClick={() => handleEditImage(image)}
                          className="flex-1 text-center py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteImage(image.id)}
                          className="flex-1 text-center py-1 rounded bg-red-100 text-red-700 font-medium text-sm"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
      
      {activeTab === 'config' && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Imágenes del Hero</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image de bureau */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-text-dark mb-2">Imagen para Ordenador</h3>
                <p className="text-text-medium mb-4">Esta imagen se mostrará en la versión de escritorio con un desvanecimiento de izquierda a derecha.</p>
                
                <div className="mb-4">
                  <label className="block text-text-dark text-sm font-bold mb-2">Seleccionar una imagen</label>
                  <input
                    ref={heroDesktopInputRef}
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                    onChange={(e) => handleFileChange(e, setHeroDesktopFile, setHeroDesktopPreview)}
                  />
                </div>
                
                {heroDesktopPreview && (
                  <div className="mt-4 w-full">
                    <p className="text-sm font-medium text-gray-600 mb-2">Vista previa:</p>
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
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-text-dark mb-2">Imagen para Móvil</h3>
                <p className="text-text-medium mb-4">Esta imagen se mostrará en la versión móvil con un desvanecimiento de arriba abajo.</p>
                
                <div className="mb-4">
                  <label className="block text-text-dark text-sm font-bold mb-2">Seleccionar una imagen</label>
                  <input
                    ref={heroMobileInputRef}
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                    onChange={(e) => handleFileChange(e, setHeroMobileFile, setHeroMobilePreview)}
                  />
                </div>
                
                {heroMobilePreview && (
                  <div className="mt-4 w-full">
                    <p className="text-sm font-medium text-gray-600 mb-2">Vista previa:</p>
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
      )}
      
      {activeTab === 'stylists' && (
        <StylistManagement 
          services={services} 
          locations={locations} 
          onUpdate={loadData}
        />
      )}
      
      {activeTab === 'locations' && (
        <LocationManagement />
      )}
    </div>
  );
} 