'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Service, GalleryImage, Stylist, StylistService } from '@/lib/supabase';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
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
  
  // Estado para galería
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    descripcion: '',
    imagen_url: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryImagePreview, setGalleryImagePreview] = useState<string>('');

  // Estado para configuraciones
  const [heroDesktopImage, setHeroDesktopImage] = useState('');
  const [heroMobileImage, setHeroMobileImage] = useState('');
  const [heroDesktopFile, setHeroDesktopFile] = useState<File | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string>('');
  const [heroMobilePreview, setHeroMobilePreview] = useState<string>('');
  
  // Estado para estilistas y sus servicios
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedStylist, setSelectedStylist] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stylistServices, setStylistServices] = useState<StylistService[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedService, setSelectedService] = useState<string>('');
  const [activeTab, setActiveTab] = useState('services');
  
  // Estado para nuevo estilista
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [newStylist, setNewStylist] = useState<{
    name: string;
    bio: string;
    locationIds: string[];
    serviceIds: string[];
  }>({
    name: '',
    bio: '',
    locationIds: [],
    serviceIds: [],
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stylistImageFile, setStylistImageFile] = useState<File | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setStylistImagePreview] = useState<string>('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editMode, setEditMode] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setShowStylistForm] = useState<boolean>(false);
  
  // Referencias para les inputs de fichier
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Estado pour indiquer le chargement
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà authentifié
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        loadData();
      }
    };
    
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setIsAuthenticated(true);
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const loadData = async () => {
    // Charger les services
    const { data: servicesData } = await supabase
      .from('servicios')
      .select('*')
      .order('id');
    
    if (servicesData) {
      setServices(servicesData);
    }
    
    // Charger les images de galerie
    const { data: galleryData } = await supabase
      .from('imagenes_galeria')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (galleryData) {
      setGalleryImages(galleryData);
    }

    // Charger les configurations
    const { data: configData } = await supabase
      .from('configuracion')
      .select('*');
    
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
    
    // Charger les stylists
    const { data: stylistsData } = await supabase
      .from('stylists')
      .select('*')
      .eq('active', true);
    
    if (stylistsData) {
      setStylists(stylistsData);
    }
    
    // Charger les centres
    const { data: locationsData } = await supabase
      .from('locations')
      .select('*')
      .eq('active', true);
    
    if (locationsData) {
      setLocations(locationsData);
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
      
      const { error } = await supabase
        .from('servicios')
        .insert([{ ...newService, imagen_url }]);
      
      if (error) throw error;
      
      // Réinitialiser le formulaire
      setNewService({
        nombre: '',
        descripcion: '',
        precio: 0,
        imagen_url: '',
      });
      setServiceImageFile(null);
      setServiceImagePreview('');
      if (serviceImageInputRef.current) {
        serviceImageInputRef.current.value = '';
      }
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Erreur lors de l\'ajout du service:', error);
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
      
      const { error } = await supabase
        .from('imagenes_galeria')
        .insert([{ ...newImage, imagen_url }]);
      
      if (error) throw error;
      
      // Réinitialiser le formulaire
      setNewImage({
        descripcion: '',
        imagen_url: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      setGalleryImageFile(null);
      setGalleryImagePreview('');
      if (galleryImageInputRef.current) {
        galleryImageInputRef.current.value = '';
      }
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Erreur lors de l\'ajout de l\'image:', error);
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

  // Fonction pour charger les services d'un styliste
  const loadStylistServices = async (stylistId: string) => {
    if (!stylistId) return;
    
    try {
      const { data, error } = await supabase
        .from('stylist_services')
        .select('*')
        .eq('stylist_id', stylistId);
      
      if (error) throw error;
      
      setStylistServices(data || []);
    } catch (error: Error | unknown) {
      console.error('Erreur lors du chargement des services du styliste:', error);
      setStylistServices([]);
    }
  };

  // Effect pour charger les services du styliste sélectionné
  useEffect(() => {
    if (selectedStylist) {
      loadStylistServices(selectedStylist);
    } else {
      setStylistServices([]);
    }
  }, [selectedStylist]);

  // Agregar resetStylistForm para evitar el error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetStylistForm = () => {
    // Function stub para evitar el error
  };
  
  // Funciones stub para evitar errores
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleAddStylistService = () => {
    // Function stub para evitar el error
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeleteStylistService = () => {
    // Function stub para evitar el error
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _loadStylistForEdit = () => {
    // Function stub para evitar el error
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleStylistSubmit = () => {
    // Function stub para evitar el error
  };
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeleteStylist = () => {
    // Function stub para evitar el error
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6 text-secondary">Admin Login</h1>
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-text-dark text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-text-dark text-sm font-bold mb-2" htmlFor="password">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300"
            >
              Connexion
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6" style={{ color: '#E76F51' }}>Panneau d&apos;Administration</h1>
      
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
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Gérer les Services</h2>
            
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
                  <div className="mt-4">
                    <Image 
                      src={serviceImagePreview} 
                      alt="Aperçu" 
                      width={200} 
                      height={150} 
                      className="rounded-lg"
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Téléchargement...' : 'Agregar un Servicio'}
                </button>
              </div>
            </form>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Nom</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Descripción</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Precio</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Imagen</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td className="py-2 px-4 border-b text-text-dark">{service.nombre}</td>
                      <td className="py-2 px-4 border-b text-text-dark">{service.descripcion}</td>
                      <td className="py-2 px-4 border-b text-text-dark">{service.precio}€</td>
                      <td className="py-2 px-4 border-b">
                        {service.imagen_url && (
                          <div className="relative h-16 w-16 rounded overflow-hidden">
                            <Image 
                              src={service.imagen_url} 
                              alt={service.nombre} 
                              width={64} 
                              height={64} 
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'gallery' && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Gérer la Galerie</h2>
            
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
                />
                
                {galleryImagePreview && (
                  <div className="relative h-40 mt-2 rounded overflow-hidden">
                    <Image 
                      src={galleryImagePreview} 
                      alt="Gallery Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Téléchargement...' : 'Agregar una Imagen'}
                </button>
              </div>
            </form>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden">
                  <div className="relative pt-[60%]">
                    <Image 
                      src={image.imagen_url} 
                      alt={image.descripcion} 
                      width={200} 
                      height={150} 
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-text-dark">{image.descripcion}</p>
                    <p className="text-sm text-text-medium">{new Date(image.fecha).toLocaleDateString()}</p>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
                  <div className="relative h-40 mb-4 rounded overflow-hidden">
                    <Image 
                      src={heroDesktopPreview} 
                      alt="Hero Desktop Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => updateHeroImage('hero_image_desktop', heroDesktopFile, heroDesktopImage)}
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
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
                  <div className="relative h-40 mb-4 rounded overflow-hidden">
                    <Image 
                      src={heroMobilePreview} 
                      alt="Hero Mobile Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => updateHeroImage('hero_image_mobile', heroMobileFile, heroMobileImage)}
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
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