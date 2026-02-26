'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Service, GalleryImage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import StylistManagement from './stylist-management';
import LocationManagement from './location-management';
import { AdminCard, AdminCardContent, AdminCardHeader, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
  const searchParams = useSearchParams();

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
  const [servicesBackgroundImage, setServicesBackgroundImage] = useState('');
  const [servicesBackgroundMobileImage, setServicesBackgroundMobileImage] = useState('');
  const [heroDesktopFile, setHeroDesktopFile] = useState<File | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [servicesBackgroundFile, setServicesBackgroundFile] = useState<File | null>(null);
  const [servicesBackgroundMobileFile, setServicesBackgroundMobileFile] = useState<File | null>(null);
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string>('');
  const [heroMobilePreview, setHeroMobilePreview] = useState<string>('');
  const [servicesBackgroundPreview, setServicesBackgroundPreview] = useState<string>('');
  const [servicesBackgroundMobilePreview, setServicesBackgroundMobilePreview] = useState<string>('');
  
  // Estado para locations (necesario para el componente StylistManagement)
  const [locations, setLocations] = useState<Location[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Referencias para los inputs de fichero
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  const servicesBackgroundInputRef = useRef<HTMLInputElement>(null);
  const servicesBackgroundMobileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para la sección activa
  const [activeSection, setActiveSection] = useState<string>('services');
  
  // Estado pour indiquer le chargement
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Cargar los datos iniciales
    loadData();
  }, []);

  useEffect(() => {
    const sectionParam = searchParams.get('section');

    if (sectionParam && ['services', 'gallery', 'stylists', 'locations', 'hero'].includes(sectionParam)) {
      setActiveSection(sectionParam);
      return;
    }

    setActiveSection('services');
  }, [searchParams]);

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
        const servicesBackground = configData.find(c => c.clave === 'services_background');
        const servicesBackgroundMobile = configData.find(c => c.clave === 'services_background_mobile');
        
        if (heroDesktop && heroDesktop.valor) {
          setHeroDesktopImage(heroDesktop.valor);
          setHeroDesktopPreview(heroDesktop.valor);
        }
        
        if (heroMobile && heroMobile.valor) {
          setHeroMobileImage(heroMobile.valor);
          setHeroMobilePreview(heroMobile.valor);
        }
        
        if (servicesBackground && servicesBackground.valor) {
          setServicesBackgroundImage(servicesBackground.valor);
          setServicesBackgroundPreview(servicesBackground.valor);
        }
        
        if (servicesBackgroundMobile && servicesBackgroundMobile.valor) {
          setServicesBackgroundMobileImage(servicesBackgroundMobile.valor);
          setServicesBackgroundMobilePreview(servicesBackgroundMobile.valor);
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

  const updateConfigImage = async (clave: string, file: File | null, currentUrl: string) => {
    try {
      setIsUploading(true);
      let valor = currentUrl;
      
      // Si un fichier est sélectionné, le télécharger d'abord
      if (file) {
        // Usar el bucket hero_images para todas las imágenes de configuración
        const bucket = 'hero_images';
        const folder = ''; // Sin carpetas, directamente en la raíz del bucket
        
        console.log(`Subiendo imagen para ${clave} en bucket: ${bucket}`);
        const fileUrl = await uploadFile(file, bucket, folder);
        console.log(`URL obtenida después de subir: ${fileUrl}`);
        
        if (fileUrl) {
          valor = fileUrl;
        } else {
          throw new Error('Impossible de télécharger le fichier');
        }
      }
      
      console.log(`Actualizando configuración ${clave} con valor: ${valor}`);
      
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
      } else if (clave === 'services_background') {
        setServicesBackgroundImage(valor);
        setServicesBackgroundPreview(valor);
        if (servicesBackgroundInputRef.current) {
          servicesBackgroundInputRef.current.value = '';
        }
        setServicesBackgroundFile(null);
      } else if (clave === 'services_background_mobile') {
        setServicesBackgroundMobileImage(valor);
        setServicesBackgroundMobilePreview(valor);
        if (servicesBackgroundMobileInputRef.current) {
          servicesBackgroundMobileInputRef.current.value = '';
        }
        setServicesBackgroundMobileFile(null);
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
    <div className="admin-scope min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Mensaje de error si existe */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            <span className="block sm:inline">{errorMessage}</span>
            <Button 
              className="absolute top-0 bottom-0 right-0 px-4 py-3"
              onClick={() => setErrorMessage('')}
            >
              <span className="text-xl">&times;</span>
            </Button>
          </div>
        )}
        
        {/* Contenido según la sección activa */}
        {activeSection === 'services' && (
          <div className="space-y-6">
            <SectionHeader
              title="Gestion des Services"
              description="CRUD des services et gestion d'images."
            />

            <Button
              onClick={() => {
                if (showServiceForm) {
                  cancelServiceForm();
                } else {
                  setShowServiceForm(true);
                }
              }}
              variant={showServiceForm ? 'outline' : 'default'}
            >
              {showServiceForm ? 'Fermer formulaire' : 'Ajouter nouveau service'}
            </Button>

            {showServiceForm && (
              <AdminCard tone="highlight">
                <AdminCardHeader>
                  <h2 className="text-xl font-semibold text-primary">
                    {editingServiceId ? 'Éditer service' : 'Ajouter nouveau service'}
                  </h2>
                </AdminCardHeader>
                <AdminCardContent>
                  <form onSubmit={handleAddService} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Nom
                      </label>
                      <Input
                        type="text"
                        value={newService.nombre}
                        onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Prix (CHF)
                      </label>
                      <Input
                        type="number"
                        value={newService.precio}
                        onChange={(e) => setNewService({ ...newService, precio: Number(e.target.value) })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </label>
                      <Textarea
                        rows={3}
                        className="min-h-[110px]"
                        value={newService.descripcion}
                        onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Image
                      </label>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-2">
                          <Input
                            ref={serviceImageInputRef}
                            type="file"
                            accept="image/*"
                            className="h-auto py-2 file:mr-3 file:rounded-lg file:border file:border-primary/45 file:bg-primary/12 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                            onChange={(e) => handleFileChange(e, setServiceImageFile, setServiceImagePreview)}
                          />
                          <p className="text-xs text-muted-foreground">
                            Format recommandé: JPEG ou PNG, taille maximale 2MB
                          </p>
                        </div>

                        {serviceImagePreview && (
                          <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-primary/45">
                            <Image
                              src={serviceImagePreview}
                              alt="Aperçu du service"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2 md:col-span-2">
                      <Button type="submit" disabled={isUploading}>
                        {isUploading ? 'Téléchargement...' : editingServiceId ? 'Mise à jour' : 'Ajouter service'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelServiceForm}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                </AdminCardContent>
              </AdminCard>
            )}

            <AdminCard>
              <AdminCardHeader>
                <h2 className="text-xl font-semibold text-primary">Liste de services</h2>
              </AdminCardHeader>
              <AdminCardContent>
                {services.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    Aucun service disponible.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {services.map((service) => (
                      <article
                        key={service.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--admin-shadow-card)]"
                      >
                        <div className="relative h-48 w-full">
                          {service.imagen_url ? (
                            <Image
                              src={service.imagen_url}
                              alt={service.nombre}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-muted/35">
                              <span className="text-5xl font-bold text-primary">
                                {service.nombre.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-semibold text-foreground">{service.nombre}</h3>
                            <p className="text-sm font-semibold text-primary">{service.precio} CHF</p>
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">{service.descripcion}</p>
                        </div>

                        <div className="flex gap-2 border-t border-border p-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleEditService(service)}
                          >
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>
          </div>
        )}
        
        {activeSection === 'gallery' && (
          <div className="space-y-6">
            <SectionHeader
              title="Gestion de la Galerie"
              description="Ajout, édition et suppression des médias de la galerie."
            />
            
            <Button
              onClick={() => {
                if (showGalleryForm) {
                  cancelGalleryForm();
                } else {
                  setShowGalleryForm(true);
                }
              }}
              variant={showGalleryForm ? 'outline' : 'default'}
            >
              {showGalleryForm ? 'Fermer formulaire' : 'Ajouter nouvelle image'}
            </Button>
            
            {showGalleryForm && (
              <AdminCard tone="highlight">
                <AdminCardHeader>
                  <h2 className="text-xl font-semibold text-primary">
                    {editingGalleryId ? 'Éditer image' : 'Ajouter nouvelle image'}
                  </h2>
                </AdminCardHeader>
                <AdminCardContent>
                  <form onSubmit={handleAddImage} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Description
                      </label>
                      <Input
                        type="text"
                        value={newImage.descripcion}
                        onChange={(e) => setNewImage({ ...newImage, descripcion: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Date
                      </label>
                      <Input
                        type="date"
                        value={newImage.fecha}
                        onChange={(e) => setNewImage({ ...newImage, fecha: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Image pour la galerie
                      </label>
                      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                        <div className="space-y-2">
                          <Input
                            ref={galleryImageInputRef}
                            type="file"
                            accept="image/*"
                            className="h-auto py-2 file:mr-3 file:rounded-lg file:border file:border-primary/45 file:bg-primary/12 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                            onChange={(e) => handleFileChange(e, setGalleryImageFile, setGalleryImagePreview)}
                            required={!editingGalleryId}
                          />
                          <p className="text-xs text-muted-foreground">
                            Format recommandé: JPEG ou PNG, taille maximale 2MB
                          </p>
                        </div>
                        
                        {galleryImagePreview && (
                          <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-primary/45">
                            <Image
                              src={galleryImagePreview}
                              alt="Aperçu de la galerie"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 pt-2 md:col-span-2">
                      <Button
                        type="submit"
                        disabled={isUploading}
                      >
                        {isUploading ? 'Téléchargement...' : (editingGalleryId ? 'Mise à jour' : 'Ajouter image')}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelGalleryForm}
                      >
                        Annuler
                      </Button>
                    </div>
                  </form>
                </AdminCardContent>
              </AdminCard>
            )}
            
            <AdminCard>
              <AdminCardHeader>
                <h2 className="text-xl font-semibold text-primary">Images de la Galerie</h2>
              </AdminCardHeader>
              <AdminCardContent>
                {galleryImages.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    Aucune image disponible.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {galleryImages.map((image) => (
                      <article
                        key={image.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--admin-shadow-card)]"
                      >
                        <div className="relative h-48 w-full">
                          <Image
                            src={image.imagen_url}
                            alt={image.descripcion}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="space-y-2 p-5">
                          <h3 className="text-base font-semibold text-foreground">{image.descripcion}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(image.fecha).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        
                        <div className="flex gap-2 border-t border-border p-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleEditImage(image)}
                          >
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => handleDeleteImage(image.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </AdminCardContent>
            </AdminCard>
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
            <SectionHeader
              title="Configuration du Hero"
              description="Gestion des images desktop/mobile et fonds de section services."
            />
            
            <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--admin-shadow-soft)]">
              <div className="p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Images du Hero</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image de bureau */}
                  <div className="border border-primary rounded-lg p-4 bg-background">
                    <h3 className="font-bold text-foreground mb-2">Image pour l&apos;ordinateur</h3>
                    <p className="mb-4 text-muted-foreground">Cette image sera affichée dans la version ordinateur avec un effet de dégradé de gauche à droite.</p>
                    
                    <div className="mb-4">
                      <label className="block text-foreground text-sm font-bold mb-2">Sélectionner une image</label>
                      <Input
                        ref={heroDesktopInputRef}
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                        onChange={(e) => handleFileChange(e, setHeroDesktopFile, setHeroDesktopPreview)}
                      />
                    </div>
                    
                    {heroDesktopPreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-foreground mb-2">Prévisualisation:</p>
                        <div className="flex justify-center md:justify-start">
                          <div className="relative h-44 w-full max-w-[360px] overflow-hidden rounded-lg border border-border bg-card">
                            <Image 
                              src={heroDesktopPreview} 
                              alt="Prévisualisation de l'image pour l'ordinateur" 
                              fill
                              sizes="(max-width: 768px) 90vw, 360px"
                              className="object-contain p-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => updateConfigImage('hero_image_desktop', heroDesktopFile, heroDesktopImage)}
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Téléchargement...' : 'Mise à jour de l\'image'}
                    </Button>
                  </div>
                  
                  {/* Image mobile */}
                  <div className="border border-primary rounded-lg p-4 bg-background">
                    <h3 className="font-bold text-foreground mb-2">Image pour le mobile</h3>
                    <p className="mb-4 text-muted-foreground">Cette image sera affichée dans la version mobile avec un effet de dégradé de haut en bas.</p>
                    
                    <div className="mb-4">
                      <label className="block text-foreground text-sm font-bold mb-2">Sélectionner une image</label>
                      <Input
                        ref={heroMobileInputRef}
                        type="file"
                        accept="image/*"
                        className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                        onChange={(e) => handleFileChange(e, setHeroMobileFile, setHeroMobilePreview)}
                      />
                    </div>
                    
                    {heroMobilePreview && (
                      <div className="mt-4 w-full">
                        <p className="text-sm font-medium text-foreground mb-2">Prévisualisation:</p>
                        <div className="flex justify-center md:justify-start">
                          <div className="relative h-60 w-full max-w-[220px] overflow-hidden rounded-lg border border-border bg-card">
                            <Image 
                              src={heroMobilePreview} 
                              alt="Prévisualisation de l'image pour le mobile" 
                              fill
                              sizes="220px"
                              className="object-contain p-1"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      onClick={() => updateConfigImage('hero_image_mobile', heroMobileFile, heroMobileImage)}
                      className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                      disabled={isUploading}
                    >
                      {isUploading ? 'Téléchargement...' : 'Mise à jour de l\'image'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-8 overflow-hidden rounded-lg border border-border bg-card shadow-[var(--admin-shadow-soft)]">
              <div className="p-6">
                <h2 className="text-xl font-bold text-primary mb-4">Image de fond pour la section Services</h2>
                
                <div className="border border-primary rounded-lg p-4 bg-background mb-6">
                  <h3 className="font-bold text-foreground mb-2">Image de fond avec effet parallax (Desktop)</h3>
                  <p className="mb-4 text-muted-foreground">Cette image sera affichée comme fond de la section des services avec un effet parallax lors du défilement sur les écrans d&apos;ordinateur.</p>
                  
                  <div className="mb-4">
                    <label className="block text-foreground text-sm font-bold mb-2">Sélectionner une image</label>
                    <Input
                      ref={servicesBackgroundInputRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                      onChange={(e) => handleFileChange(e, setServicesBackgroundFile, setServicesBackgroundPreview)}
                    />
                  </div>
                  
                  {servicesBackgroundPreview && (
                    <div className="mt-4 w-full">
                      <p className="text-sm font-medium text-foreground mb-2">Prévisualisation:</p>
                      <div className="flex justify-center md:justify-start">
                        <div className="relative h-44 w-full max-w-[360px] overflow-hidden rounded-lg border border-border bg-card">
                          <Image 
                            src={servicesBackgroundPreview} 
                            alt="Prévisualisation de l'image de fond des services" 
                            fill
                            sizes="(max-width: 768px) 90vw, 360px"
                            className="object-contain p-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => updateConfigImage('services_background', servicesBackgroundFile, servicesBackgroundImage)}
                    className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Téléchargement...' : 'Mise à jour de l\'image'}
                  </Button>
                </div>
                
                <div className="border border-primary rounded-lg p-4 bg-background">
                  <h3 className="font-bold text-foreground mb-2">Image de fond avec effet parallax (Mobile)</h3>
                  <p className="mb-4 text-muted-foreground">Cette image sera affichée comme fond de la section des services avec un effet parallax lors du défilement sur les écrans mobiles.</p>
                  
                  <div className="mb-4">
                    <label className="block text-foreground text-sm font-bold mb-2">Sélectionner une image</label>
                    <Input
                      ref={servicesBackgroundMobileInputRef}
                      type="file"
                      accept="image/*"
                      className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                      onChange={(e) => handleFileChange(e, setServicesBackgroundMobileFile, setServicesBackgroundMobilePreview)}
                    />
                  </div>
                  
                  {servicesBackgroundMobilePreview && (
                    <div className="mt-4 w-full">
                      <p className="text-sm font-medium text-foreground mb-2">Prévisualisation:</p>
                      <div className="flex justify-center md:justify-start">
                        <div className="relative h-60 w-full max-w-[220px] overflow-hidden rounded-lg border border-border bg-card">
                          <Image 
                            src={servicesBackgroundMobilePreview} 
                            alt="Prévisualisation de l'image de fond des services (mobile)" 
                            fill
                            sizes="220px"
                            className="object-contain p-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => updateConfigImage('services_background_mobile', servicesBackgroundMobileFile, servicesBackgroundMobileImage)}
                    className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50 mt-4"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Téléchargement...' : 'Mise à jour de l\'image'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
